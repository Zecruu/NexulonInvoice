import {
  SocialMessagingClient,
  SendWhatsAppMessageCommand,
} from "@aws-sdk/client-socialmessaging";

let _client: SocialMessagingClient | null = null;

function getClient(): SocialMessagingClient {
  if (!_client) {
    const region = process.env.AWS_SOCIAL_MESSAGING_REGION || "us-east-1";
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        "AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set"
      );
    }

    _client = new SocialMessagingClient({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return _client;
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
  if (!phone.startsWith("+")) return `+${digits}`;
  return phone;
}

interface SendWhatsAppTextOptions {
  originationIdentity: string;
  toPhone: string;
  text: string;
}

export async function sendWhatsAppText(
  opts: SendWhatsAppTextOptions
): Promise<{ messageId?: string }> {
  const to = normalizePhone(opts.toPhone).replace(/^\+/, "");

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: opts.text },
  };

  const command = new SendWhatsAppMessageCommand({
    originationPhoneNumberId: opts.originationIdentity,
    message: new TextEncoder().encode(JSON.stringify(payload)),
    metaApiVersion: "v20.0",
  });

  const result = await getClient().send(command);
  return { messageId: result.messageId };
}
