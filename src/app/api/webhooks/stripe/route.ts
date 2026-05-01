import { getStripe, Stripe } from "@/lib/stripe";
import dbConnect from "@/lib/db";
import { Invoice } from "@/models/invoice";
import { Payment } from "@/models/payment";
import { User } from "@/models/user";
import { Client } from "@/models/client";
import { resend } from "@/lib/resend";
import { PaymentReceiptEmail } from "@/components/email/payment-receipt-email";
import { PaymentNotificationEmail } from "@/components/email/payment-notification-email";
import { formatCurrency, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return new Response("Webhook signature verification failed", {
      status: 400,
    });
  }

  await dbConnect();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const invoiceId = session.metadata?.invoiceId;

    if (!invoiceId) {
      return new Response("Missing invoiceId in metadata", { status: 400 });
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return new Response("Invoice not found", { status: 404 });
    }

    // Idempotency: skip if already paid
    if (invoice.status === "paid") {
      return new Response("Already processed", { status: 200 });
    }

    // Update invoice
    invoice.status = "paid";
    invoice.paidAt = new Date();
    invoice.paidAmount = session.amount_total || invoice.total;
    invoice.stripePaymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;
    await invoice.save();

    // Create payment record (idempotent via unique stripeSessionId)
    await Payment.findOneAndUpdate(
      { stripeSessionId: session.id },
      {
        invoiceId: invoice._id,
        userId: invoice.userId,
        stripeSessionId: session.id,
        stripePaymentIntentId: invoice.stripePaymentIntentId,
        amount: session.amount_total || invoice.total,
        currency: session.currency || invoice.currency,
        status: "succeeded",
        paymentMethod: session.payment_method_types?.[0] || "card",
      },
      { upsert: true }
    );

    // Send confirmation emails (non-blocking — don't fail the webhook on email errors)
    try {
      await sendPaymentEmails(invoice, session);
    } catch (err) {
      console.error("[stripe-webhook] sending payment emails failed:", err);
    }
  }

  return new Response("OK", { status: 200 });
}

async function sendPaymentEmails(
  invoice: { _id: unknown; userId: unknown; clientId: unknown; invoiceNumber: string; total: number; currency: string; paidAt?: Date },
  session: Stripe.Checkout.Session
) {
  const [user, client] = await Promise.all([
    User.findById(invoice.userId)
      .select("email businessName businessLogo firstName lastName")
      .lean(),
    Client.findById(invoice.clientId).select("name email").lean(),
  ]);

  const businessName =
    user?.businessName ||
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
    "Nexulon Invoice";
  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@nexulonllc.com";
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://invoice.nexulonllc.com";

  const amount = formatCurrency(
    session.amount_total || invoice.total,
    session.currency || invoice.currency
  );
  const paidAt = formatDate(invoice.paidAt || new Date());
  const paymentMethod = session.payment_method_types?.[0] || "card";

  // 1. Receipt to the client
  if (client?.email) {
    const { error } = await resend.emails.send({
      from: `${businessName} <${fromEmail}>`,
      to: client.email,
      subject: `Receipt: ${amount} paid to ${businessName} (${invoice.invoiceNumber})`,
      react: PaymentReceiptEmail({
        invoiceNumber: invoice.invoiceNumber,
        clientName: client.name,
        businessName,
        amount,
        paidAt,
        paymentMethod,
        logoUrl: user?.businessLogo,
      }),
    });
    if (error) console.error("[stripe-webhook] receipt email failed:", error);
  }

  // 2. Notification to the invoice creator
  if (user?.email && client) {
    const invoiceUrl = `${appUrl}/invoices/${invoice._id}`;
    const { error } = await resend.emails.send({
      from: `Nexulon Invoice <${fromEmail}>`,
      to: user.email,
      subject: `💰 ${client.name} paid ${amount} (${invoice.invoiceNumber})`,
      react: PaymentNotificationEmail({
        invoiceNumber: invoice.invoiceNumber,
        clientName: client.name,
        amount,
        paidAt,
        paymentMethod,
        invoiceUrl,
      }),
    });
    if (error)
      console.error("[stripe-webhook] notification email failed:", error);
  }
}
