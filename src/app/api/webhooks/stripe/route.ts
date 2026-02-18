import { getStripe, Stripe } from "@/lib/stripe";
import dbConnect from "@/lib/db";
import { Invoice } from "@/models/invoice";
import { Payment } from "@/models/payment";

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
  }

  return new Response("OK", { status: 200 });
}
