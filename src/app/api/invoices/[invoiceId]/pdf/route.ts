import { renderToBuffer } from "@react-pdf/renderer";
import dbConnect from "@/lib/db";
import { Invoice } from "@/models/invoice";
import { User } from "@/models/user";
import { InvoicePDF } from "@/components/pdf/invoice-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params;
  await dbConnect();

  const invoice = await Invoice.findById(invoiceId)
    .populate("clientId")
    .lean();

  if (!invoice) {
    return new Response("Invoice not found", { status: 404 });
  }

  const sender = await User.findById(invoice.userId).lean();
  if (!sender) {
    return new Response("Sender not found", { status: 404 });
  }

  const client = invoice.clientId as {
    name: string;
    email: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
  };

  const pdfBuffer = await renderToBuffer(
    InvoicePDF({
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate.toISOString(),
        dueDate: invoice.dueDate.toISOString(),
        lineItems: invoice.lineItems,
        subtotal: invoice.subtotal,
        taxRate: invoice.taxRate,
        taxAmount: invoice.taxAmount,
        discountAmount: invoice.discountAmount,
        total: invoice.total,
        currency: invoice.currency,
        notes: invoice.notes,
      },
      client: {
        name: client.name,
        email: client.email,
        address: client.address,
      },
      sender: {
        businessName: sender.businessName,
        firstName: sender.firstName,
        lastName: sender.lastName,
        email: sender.email,
        businessEmail: sender.businessEmail,
        businessPhone: sender.businessPhone,
        businessAddress: sender.businessAddress,
      },
    })
  );

  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`,
    },
  });
}
