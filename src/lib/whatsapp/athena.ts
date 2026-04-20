import { GoogleGenAI } from "@google/genai";
import type { IWhatsAppConversation } from "@/models/whatsapp-conversation";
import type { IWhatsAppBotConfig } from "@/models/whatsapp-bot-config";

const MODEL = "gemini-3.1-flash-lite-preview";

let _client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  if (!_client) {
    _client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return _client;
}

export interface AthenaResponse {
  reply: string;
  language: "en" | "es";
  temperature: "hot" | "warm" | "cold" | "unknown";
  shouldHandoff: boolean;
  handoffReason?: string;
  qualified: boolean;
  leadData?: {
    name?: string;
    painDuration?: string;
    diagnosis?: string;
    urgency?: string;
    hasInsurance?: boolean;
    location?: string;
    summary: string;
    score: number;
  };
}

function buildSystemPrompt(
  config: IWhatsAppBotConfig,
  conversation: IWhatsAppConversation
): string {
  const businessName = config.businessName || "our clinic";
  const addendum = config.systemPromptAddendum?.trim();
  const criteria = config.qualificationCriteria?.trim();
  const bookingLine = config.bookingUrl
    ? `If they want to book, share: ${config.bookingUrl}`
    : "If they want to book, say a human will reach out shortly.";

  return `You are ${config.botName || "Athena"}, a friendly WhatsApp assistant for ${businessName}.

Your single purpose is to qualify leads for Accu-Spina spinal decompression therapy — a non-surgical treatment for herniated discs, sciatica, and chronic back/neck pain.

QUALIFYING QUESTIONS (ask naturally over the course of the chat, not all at once):
1. What pain or condition are they dealing with? (herniated disc, sciatica, chronic back pain, etc.)
2. How long have they had it?
3. Have they tried other treatments (PT, chiro, injections, surgery)?
4. Do they have a diagnosis or MRI?
5. How urgent — are they in daily pain or looking to prevent worsening?
6. Are they local to the area? Do they have insurance?

HOT LEAD = has a disc-related diagnosis (herniated/bulging disc, sciatica, stenosis) + chronic pain (>3 months) + motivated to try something new + local.
WARM LEAD = partial match (some pain but unclear diagnosis, or unsure about commitment).
COLD LEAD = unrelated condition (e.g., broken bone), not local, already had successful surgery, or just browsing.

${criteria ? `ADDITIONAL CRITERIA:\n${criteria}\n` : ""}

CONVERSATION RULES:
- Reply in the SAME language the customer uses (English or Spanish). Auto-detect.
- Keep replies conversational and under 300 characters (WhatsApp, not SMS — slightly longer is OK, but don't write essays).
- One or two questions max per message.
- Warm, empathetic tone. These people are in pain.
- Never invent medical advice. Never guarantee outcomes.
- ${bookingLine}
- If the customer explicitly asks for a human, says they're frustrated, demands a manager, or asks about pricing in a negotiation tone, SIGNAL HANDOFF.
- If they message in Spanish, respond in Spanish: use "tú" (informal).

${addendum ? `EXTRA INSTRUCTIONS FROM THE OPERATOR:\n${addendum}\n` : ""}

YOU MUST RESPOND IN STRICT JSON — nothing else. Schema:
{
  "reply": "your conversational reply to the customer",
  "language": "en" or "es",
  "temperature": "hot" | "warm" | "cold" | "unknown",
  "shouldHandoff": boolean,
  "handoffReason": "short reason if handoff" or null,
  "qualified": boolean (true once you have enough info to score them),
  "leadData": {
    "name": string or null,
    "painDuration": string or null,
    "diagnosis": string or null,
    "urgency": string or null,
    "hasInsurance": boolean or null,
    "location": string or null,
    "summary": "1-2 sentence summary of who this lead is",
    "score": 0-100 integer
  } or null
}

Only populate leadData once you have meaningful information. Before that, set it to null.`;
}

function buildConversationText(conversation: IWhatsAppConversation): string {
  const recent = conversation.messages.slice(-20);
  return recent
    .map((m) => {
      if (m.role === "customer") return `Customer: ${m.content}`;
      if (m.role === "bot") return `Athena (you): ${m.content}`;
      return `Human agent: ${m.content}`;
    })
    .join("\n");
}

function detectLanguage(text: string): "en" | "es" {
  const spanishMarkers = /\b(hola|buenos|buenas|gracias|por favor|dolor|espalda|cuello|disco|hernia|cuánto|cuanto|cómo|como|sí|si no|ayuda|tengo|estoy|soy|me duele|quiero|necesito|puede|puedes|para|eres|está|estás)\b/i;
  return spanishMarkers.test(text) ? "es" : "en";
}

function fallbackKeywordCheck(
  text: string,
  config: IWhatsAppBotConfig
): { shouldHandoff: boolean; reason?: string } {
  const lower = text.toLowerCase();
  for (const kw of config.handoffKeywords || []) {
    if (lower.includes(kw.toLowerCase())) {
      return { shouldHandoff: true, reason: `Requested by keyword: ${kw}` };
    }
  }
  return { shouldHandoff: false };
}

function fallbackReply(
  latestText: string,
  config: IWhatsAppBotConfig
): AthenaResponse {
  const lang = detectLanguage(latestText);
  const kw = fallbackKeywordCheck(latestText, config);
  const reply =
    lang === "es"
      ? "Gracias por tu mensaje. Un miembro de nuestro equipo te contactará pronto."
      : "Thanks for reaching out. A team member will follow up with you shortly.";
  return {
    reply,
    language: lang,
    temperature: "unknown",
    shouldHandoff: kw.shouldHandoff,
    handoffReason: kw.reason,
    qualified: false,
  };
}

export async function runAthena(
  conversation: IWhatsAppConversation,
  config: IWhatsAppBotConfig
): Promise<AthenaResponse> {
  const latestCustomerMsg = [...conversation.messages]
    .reverse()
    .find((m) => m.role === "customer");
  const latestText = latestCustomerMsg?.content || "";

  if (!process.env.GEMINI_API_KEY) {
    return fallbackReply(latestText, config);
  }

  try {
    const system = buildSystemPrompt(config, conversation);
    const convo = buildConversationText(conversation);
    const prompt = `${system}\n\nConversation so far:\n${convo}\n\nRespond as Athena (JSON only):`;

    const response = await getClient().models.generateContent({
      model: MODEL,
      config: {
        maxOutputTokens: 600,
        responseMimeType: "application/json",
      },
      contents: prompt,
    });

    const rawText = response.text || "";
    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as AthenaResponse;

    if (!parsed.reply || typeof parsed.reply !== "string") {
      return fallbackReply(latestText, config);
    }

    if (parsed.reply.length > 1000) {
      parsed.reply = parsed.reply.substring(0, 997) + "...";
    }

    const kwCheck = fallbackKeywordCheck(latestText, config);
    if (kwCheck.shouldHandoff && !parsed.shouldHandoff) {
      parsed.shouldHandoff = true;
      parsed.handoffReason = parsed.handoffReason || kwCheck.reason;
    }

    parsed.language = parsed.language || detectLanguage(latestText);

    return parsed;
  } catch (err) {
    console.error("[athena] generation failed:", err);
    return fallbackReply(latestText, config);
  }
}
