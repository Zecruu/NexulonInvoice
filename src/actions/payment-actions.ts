"use server";

import { revalidatePath } from "next/cache";
import dbConnect from "@/lib/db";
import { getCurrentUser } from "@/lib/get-user";
import { Invoice } from "@/models/invoice";
import { stripe } from "@/lib/stripe";

export async function createCheckoutSession(invoiceId: string) {
  const user = await getCurrentUser();
  await dbConnect();

  const invoice = await Invoice.findOne({
    _id: invoiceId,
    userId: user._id,
  }).populate("clientId");

  if (!invoice) return { error: "Invoice not found" };
  if (invoice.status === "paid") return { error: "Invoice is already paid" };
  if (invoice.status === "cancelled")
    return { error: "Invoice is cancelled" };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email:
      typeof invoice.clientId === "object" && "email" in invoice.clientId
        ? (invoice.clientId as { email: string }).email
        : undefined,
    line_items: invoice.lineItems.map(
      (item: { description: string; quantity: number; unitPrice: number }) => ({
        price_data: {
          currency: invoice.currency.toLowerCase(),
          product_data: {
            name: item.description,
          },
          unit_amount: item.unitPrice,
        },
        quantity: item.quantity,
      })
    ),
    metadata: {
      invoiceId: invoice._id.toString(),
      invoiceNumber: invoice.invoiceNumber,
    },
    success_url: `${appUrl}/invoice/${invoiceId}/success`,
    cancel_url: `${appUrl}/invoice/${invoiceId}`,
  });

  // Store checkout session on the invoice
  invoice.stripeCheckoutSessionId = session.id;
  invoice.paymentLink = session.url || undefined;
  await invoice.save();

  revalidatePath(`/invoices/${invoiceId}`);
  return { success: true, url: session.url };
}
