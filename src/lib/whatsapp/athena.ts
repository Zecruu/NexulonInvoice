import { GoogleGenAI } from "@google/genai";
import type { IWhatsAppConversation } from "@/models/whatsapp-conversation";
import type { IWhatsAppBotConfig } from "@/models/whatsapp-bot-config";

const MODEL = "gemini-2.5-flash-lite";

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

export interface AthenaSignal {
  rule: string;
  delta: number;
  evidence: string;
}

export interface AthenaPatientContext {
  painLevel?: number;
  painLocation?: string;
  painDuration?: string;
  hasMRI?: boolean;
  diagnosis?: string;
  priorTreatments?: string[];
  urgency?: string;
  hasInsurance?: boolean;
  location?: string;
  intakeSummary?: string;
}

export interface AthenaResponse {
  reply: string;
  language: "en" | "es";
  temperature: "hot" | "warm" | "cold" | "unknown";
  shouldHandoff: boolean;
  handoffReason?: string;
  qualified: boolean;
  newSignals?: AthenaSignal[];
  patientContext?: AthenaPatientContext;
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
  const lockedLanguage =
    conversation.language === "es"
      ? "Spanish (the customer started in Spanish — stay in Spanish for every reply unless they switch first)"
      : conversation.language === "en"
      ? "English (the customer started in English — stay in English for every reply unless they switch first)"
      : "auto-detect from the customer's most recent message";

  return `You are ${config.botName || "Athena"}, a friendly WhatsApp assistant for ${businessName}.

CONVERSATION LANGUAGE: ${lockedLanguage}.

Your single purpose is to qualify leads for Accu-Spina spinal decompression therapy — a non-surgical treatment for herniated discs, sciatica, and chronic back/neck pain.

QUALIFYING QUESTIONS (ask naturally over the course of the chat, not all at once):
1. **Their name** — ask early, ideally in the first or second turn after a friendly greeting. Use it in later replies (personalization builds trust).
2. What pain or condition are they dealing with? (herniated disc, sciatica, chronic back pain, etc.)
3. Where exactly does it hurt — cervical (neck), lumbar (lower back), or thoracic?
4. **What's their pain level on a 1-10 scale?** Always ask this — it's required for handoff.
5. How long have they had it?
6. Have they tried other treatments (PT, chiro, injections, surgery)?
7. Do they have a diagnosis or MRI?
8. How urgent — are they in daily pain or looking to prevent worsening?
9. Are they local to the area? Do they have insurance?

HOT LEAD = has a disc-related diagnosis (herniated/bulging disc, sciatica, stenosis) + chronic pain (>3 months) + motivated to try something new + local.
WARM LEAD = partial match (some pain but unclear diagnosis, or unsure about commitment).
COLD LEAD = unrelated condition (e.g., broken bone), not local, already had successful surgery, or just browsing.

${criteria ? `ADDITIONAL CRITERIA:\n${criteria}\n` : ""}

CONVERSATION RULES:
- Reply in the SAME language the customer uses (English or Spanish). Auto-detect.
- LANGUAGE CONSISTENCY: This applies to EVERY reply — including handoff messages, refusals, image acknowledgments, and the very first reply. If the customer wrote in Spanish, your reply MUST be in Spanish, no matter what scenario you're in. Never default to English.
- Keep replies conversational and under 300 characters (WhatsApp, not SMS — slightly longer is OK, but don't write essays).
- One or two questions max per message.
- Warm, empathetic tone. These people are in pain.
- Never invent medical advice. Never guarantee outcomes.
- ${bookingLine}
- If the customer explicitly asks for a human, says they're frustrated, demands a manager, or asks about pricing in a negotiation tone, SIGNAL HANDOFF.
- If they message in Spanish, respond in Spanish: use "tú" (informal).

IMAGE / MEDIA HANDLING (strict — never deviate):
- When the customer sends an image, video, audio, or document, ACKNOWLEDGE briefly that you've received it and will forward to the team. DO NOT describe or discuss the contents. DO NOT comment on what you see. DO NOT diagnose.
- Example acknowledgment (English): "Thanks for sending that — I'll forward it to the team for review. Meanwhile, can you tell me [next qualification question]?"
- Example acknowledgment (Spanish): "Gracias por enviarlo — lo voy a pasar al equipo para que lo revisen. Mientras, ¿puedes decirme [próxima pregunta]?"
- Continue the qualification conversation immediately after acknowledging — don't dwell on the attachment.
- If the customer asks "can you look at this and tell me what's wrong?" or "can you diagnose me from the image?" or anything similar, REFUSE POLITELY:
  - English: "I'm not able to review images or diagnose over the phone. Our team can't do that remotely either — diagnosis has to be done in person at the clinic by a doctor. But what you've shared will go straight to the team. Want to set up a visit?"
  - Spanish: "No puedo revisar imágenes ni diagnosticar por mensaje. Nuestro equipo tampoco puede hacerlo a distancia — el diagnóstico tiene que ser en persona en la clínica con un doctor. Pero lo que enviaste va directo al equipo. ¿Quieres que coordinemos una visita?"
- This refusal applies for X-rays, MRIs, photos of pain, video walks, voice notes describing symptoms — anything. Always redirect to "in-person clinic visit for diagnosis."

${addendum ? `EXTRA INSTRUCTIONS FROM THE OPERATOR:\n${addendum}\n` : ""}

SCORING SIGNALS — when the LATEST customer message contains new evidence, emit a signal in "newSignals". Each signal is one scoring observation: rule name, delta (points +/-), short evidence quote.

Rules you should apply (emit a signal only the FIRST time each applies):
- "has_mri" — customer mentions having an MRI of cervical/lumbar: +25
- "has_herniated_disc" — confirms herniated/bulging disc: +15
- "chronic_pain_3plus_months" — says pain has lasted 3+ months: +10
- "local_to_area" — confirms local (PR / mentioned city): +8
- "urgent_booking" — wants appointment ASAP or soonest: +12
- "not_asking_about_insurance" — has engaged substantively WITHOUT asking about insurance (emit once after 3+ substantive turns): +5
- "asks_about_insurance" — asks "do you take insurance?", "is this covered?", etc: -5
- "post_surgery" — already had back/spine surgery: -10
- "unrelated_condition" — pain is unrelated (broken bone, muscle strain only): -15
- "not_local" — customer is outside the service area: -10
- "just_browsing" — says "just looking", "not ready yet", "curious": -8
- "pain_level_severe" — patient reports pain 8-10 out of 10: +10
- "pain_level_moderate" — patient reports pain 5-7 out of 10: +4
- "pain_level_mild" — patient reports pain 1-4 out of 10: -3

Do NOT re-emit a signal if the conversation already had it (check the "previous signals" block). Only NEW evidence from the latest customer message.

PATIENT CONTEXT — fill in any field as you learn it. This is a structured intake form humans see when they take over the conversation. Only include fields you have learned; omit unknowns.

YOU MUST RESPOND IN STRICT JSON — nothing else. Schema:
{
  "reply": "your conversational reply to the customer",
  "language": "en" or "es",
  "temperature": "hot" | "warm" | "cold" | "unknown",
  "shouldHandoff": boolean,
  "handoffReason": "short reason if handoff" or null,
  "qualified": boolean (true once you have emitted at least one signal AND learned basic info),
  "newSignals": [{"rule": "rule_name", "delta": 15, "evidence": "short quote from customer"}] or [],
  "patientContext": {
    "painLevel": integer 1-10 or null,
    "painLocation": "cervical" | "lumbar" | "thoracic" | "multiple" | string description or null,
    "painDuration": string or null,
    "hasMRI": true | false | null,
    "diagnosis": string or null (e.g. "L4-L5 herniated disc"),
    "priorTreatments": [string] or null (e.g. ["PT", "chiro", "epidural injection"]),
    "urgency": "high" | "medium" | "low" or null,
    "hasInsurance": true | false | null,
    "location": string or null,
    "intakeSummary": "2-4 sentence narrative summary suitable for a human agent to read at a glance — written in third person, neutral tone, no markdown. Update this every turn."
  },
  "leadData": {
    "name": string or null,
    "painDuration": string or null,
    "diagnosis": string or null,
    "urgency": string or null,
    "hasInsurance": boolean or null,
    "location": string or null,
    "summary": "1-2 sentence summary of who this lead is",
    "score": 0-100 integer (base 40, clamped 0-100; system will recompute from signal sum)
  } or null
}

Only populate leadData once you have meaningful information. Before that, set it to null.
Always populate patientContext (even if mostly nulls early on) — and ALWAYS regenerate intakeSummary based on what you know so far.`;
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

export function detectLanguageFromText(text: string): "en" | "es" {
  const t = (text || "").trim().toLowerCase();
  if (!t) return "en";

  // Strong Spanish markers — single word triggers
  const spanishWords = /\b(hola|buenos|buenas|gracias|por favor|dolor|espalda|cuello|disco|hernia|cuánto|cuanto|cómo|como|sí|si no|ayuda|tengo|estoy|soy|me duele|quiero|necesito|puede|puedes|para|eres|está|estás|qué|que|cuándo|cuando|dónde|donde|años|año|mes|meses|semana|día|días|todos|todo|nada|ningún|también|tambien|pero|aunque|porque|porqué|cuanto cuesta|cuál|cual|saludos|adiós|adios|hasta luego|sí señor|no señor|usted|ustedes|nosotros|nuestro|gracias por|de nada|por nada)\b/i;
  if (spanishWords.test(t)) return "es";

  // Diacritics often imply Spanish (ñ, á, é, í, ó, ú, ü, ¿, ¡)
  if (/[ñáéíóúü¿¡]/i.test(t)) return "es";

  // Otherwise default English
  return "en";
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
  const lang = detectLanguageFromText(latestText);
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
  config: IWhatsAppBotConfig,
  priorSignals: Array<{ rule: string; delta: number; evidence: string }> = []
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
    const priorSignalsBlock =
      priorSignals.length > 0
        ? `Previous signals already emitted (do NOT re-emit):\n${priorSignals.map((s) => `- ${s.rule} (${s.delta >= 0 ? "+" : ""}${s.delta})`).join("\n")}`
        : "Previous signals already emitted: (none yet)";

    const prompt = `${system}\n\n${priorSignalsBlock}\n\nConversation so far:\n${convo}\n\nRespond as Athena (JSON only):`;

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

    parsed.language = parsed.language || detectLanguageFromText(latestText);

    return parsed;
  } catch (err) {
    console.error("[athena] generation failed:", err);
    return fallbackReply(latestText, config);
  }
}
