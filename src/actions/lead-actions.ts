"use server";

import { z } from "zod";
import dbConnect from "@/lib/db";
import { getCurrentUser } from "@/lib/get-user";
import { Lead } from "@/models/lead";
import { resend } from "@/lib/resend";
import {
  LeadForwardEmail,
  LeadForwardItem,
} from "@/components/email/lead-forward-email";

const forwardSchema = z.object({
  leadIds: z.array(z.string().min(1)).min(1).max(50),
  recipientEmail: z.string().email(),
  note: z.string().max(2000).optional(),
});

export async function forwardLeadsByEmail(input: {
  leadIds: string[];
  recipientEmail: string;
  note?: string;
}) {
  const parsed = forwardSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const user = await getCurrentUser();
  await dbConnect();

  const scope = user.companyId
    ? { companyId: user.companyId }
    : { userId: user._id };

  const leads = await Lead.find({
    ...scope,
    _id: { $in: parsed.data.leadIds },
  }).lean();

  if (leads.length === 0) {
    return { error: "No matching leads found in your scope" };
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://invoice.nexulonllc.com";
  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@nexulonllc.com";
  const businessName = user.businessName || "Nexulon";
  const forwarderName =
    `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
    user.email ||
    "A team member";

  const items: LeadForwardItem[] = leads.map((l) => ({
    name: l.name || "",
    phone: l.waPhone,
    temperature: (l.temperature || "warm") as "hot" | "warm" | "cold",
    score: l.score ?? 0,
    status: l.status || "new",
    summary: l.summary || "",
    intakeSummary: l.intakeSummary || undefined,
    painLevel: l.painLevel,
    painLocation: l.painLocation,
    painDuration: l.painDuration,
    diagnosis: l.diagnosis,
    hasMRI: l.hasMRI,
    hasInsurance: l.hasInsurance,
    urgency: l.urgency,
    location: l.location,
    servicesInterested: l.servicesInterested,
    conversationUrl: `${appUrl}/whatsapp/${encodeURIComponent(l.waPhone)}`,
  }));

  const subjectCount = items.length === 1 ? "1 lead" : `${items.length} leads`;
  const subjectLeadName =
    items.length === 1 ? items[0].name || items[0].phone : null;
  const subject = subjectLeadName
    ? `Lead forwarded: ${subjectLeadName} (${items[0].temperature.toUpperCase()})`
    : `${subjectCount} forwarded from ${businessName}`;

  const { error, data } = await resend.emails.send({
    from: `${businessName} <${fromEmail}>`,
    replyTo: user.email,
    to: parsed.data.recipientEmail,
    subject,
    react: LeadForwardEmail({
      forwarderName,
      businessName,
      note: parsed.data.note,
      leads: items,
      logoUrl: user.businessLogo,
    }),
  });

  if (error) {
    return { error: `Failed to send: ${error.message}` };
  }

  return { success: true, sentCount: items.length, messageId: data?.id };
}
