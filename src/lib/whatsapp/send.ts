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

const META_API_VERSION = "v20.0";

export async function sendWhatsAppText(
  opts: SendWhatsAppTextOptions
): Promise<{ messageId?: string }> {
  const token = process.env.META_GRAPH_ACCESS_TOKEN;
  if (!token) {
    throw new Error("META_GRAPH_ACCESS_TOKEN is not set");
  }

  const phoneNumberId = opts.originationIdentity;
  if (!phoneNumberId) {
    throw new Error("originationIdentity (Meta phone_number_id) is required");
  }

  const to = normalizePhone(opts.toPhone).replace(/^\+/, "");

  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { preview_url: false, body: opts.text },
  };

  const res = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const json = (await res.json()) as {
    messages?: Array<{ id?: string }>;
    error?: { code?: number; message?: string; error_data?: { details?: string } };
  };

  if (!res.ok || json.error) {
    const e = json.error;
    throw new Error(
      `Meta send failed (${res.status}): ${e?.code || ""} ${e?.message || ""} ${e?.error_data?.details || ""}`.trim()
    );
  }

  return { messageId: json.messages?.[0]?.id };
}
