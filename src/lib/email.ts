interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SendResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Send a transactional email via Resend if RESEND_API_KEY is set.
 * Otherwise, log the message to console (so you can still see invite links in Vercel logs).
 */
export async function sendEmail(opts: SendEmailOptions): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromAddress) {
    console.warn(
      `[email] RESEND not configured. Logging email instead.\n  to: ${opts.to}\n  subject: ${opts.subject}\n  html: ${opts.html.slice(0, 500)}`
    );
    return { success: false, error: "Resend not configured (RESEND_API_KEY or RESEND_FROM_EMAIL missing). Email content logged to Vercel logs." };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        ...(opts.text ? { text: opts.text } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[email] Resend send failed (${res.status}): ${body.slice(0, 500)}`);
      return { success: false, error: `Resend ${res.status}: ${body.slice(0, 200)}` };
    }

    const data = (await res.json()) as { id?: string };
    return { success: true, id: data.id };
  } catch (err) {
    const msg = (err as Error).message;
    console.error(`[email] send threw: ${msg}`);
    return { success: false, error: msg };
  }
}

export function buildInviteEmail(opts: {
  companyName: string;
  inviterName?: string;
  acceptUrl: string;
  expiresAt: Date;
}): { subject: string; html: string; text: string } {
  const expiry = opts.expiresAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const inviter = opts.inviterName ? ` from ${opts.inviterName}` : "";

  const subject = `You're invited to join ${opts.companyName} on Nexulon`;

  const html = `<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 40px auto; padding: 24px; color: #111;">
    <h1 style="font-size: 22px; margin: 0 0 16px;">You've been invited to ${opts.companyName}</h1>
    <p style="font-size: 15px; line-height: 1.6; color: #444;">
      You received an invitation${inviter} to join <strong>${opts.companyName}</strong> on the Nexulon WhatsApp lead platform.
      Click the button below to accept and create your account.
    </p>
    <p style="margin: 28px 0;">
      <a href="${opts.acceptUrl}" style="display: inline-block; background: #0d9488; color: #fff; padding: 12px 22px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Accept invitation
      </a>
    </p>
    <p style="font-size: 13px; color: #777;">
      This invitation expires on <strong>${expiry}</strong>. If you weren't expecting this, you can ignore this email.
    </p>
    <hr style="border: 0; border-top: 1px solid #eee; margin: 32px 0;" />
    <p style="font-size: 12px; color: #888;">
      Or paste this link in your browser:<br />
      <span style="color: #555; word-break: break-all;">${opts.acceptUrl}</span>
    </p>
  </body>
</html>`;

  const text = `You've been invited to join ${opts.companyName} on Nexulon${inviter}.

Accept your invitation: ${opts.acceptUrl}

This invitation expires on ${expiry}.`;

  return { subject, html, text };
}
