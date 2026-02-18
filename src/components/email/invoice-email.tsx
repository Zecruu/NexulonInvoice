import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Preview,
} from "@react-email/components";

interface InvoiceEmailProps {
  invoiceNumber: string;
  clientName: string;
  businessName: string;
  total: string;
  dueDate: string;
  paymentUrl: string;
}

export function InvoiceEmail({
  invoiceNumber,
  clientName,
  businessName,
  total,
  dueDate,
  paymentUrl,
}: InvoiceEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Invoice {invoiceNumber} from {businessName} - {total} due {dueDate}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={heading}>{businessName}</Text>

          <Text style={paragraph}>Hi {clientName},</Text>

          <Text style={paragraph}>
            {businessName} has sent you an invoice.
          </Text>

          <Section style={invoiceBox}>
            <Text style={invoiceDetail}>
              <strong>Invoice:</strong> {invoiceNumber}
            </Text>
            <Text style={invoiceDetail}>
              <strong>Amount Due:</strong> {total}
            </Text>
            <Text style={invoiceDetail}>
              <strong>Due Date:</strong> {dueDate}
            </Text>
          </Section>

          <Section style={btnContainer}>
            <Button style={button} href={paymentUrl}>
              View & Pay Invoice
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            This invoice was sent by {businessName} using Nexulon Invoice.
            If you have questions about this invoice, please contact{" "}
            {businessName} directly.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  borderRadius: "5px",
};

const heading = {
  fontSize: "24px",
  fontWeight: "700" as const,
  color: "#1a1a1a",
  padding: "0 48px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#484848",
  padding: "0 48px",
};

const invoiceBox = {
  backgroundColor: "#f4f4f5",
  borderRadius: "4px",
  margin: "16px 48px",
  padding: "16px 24px",
};

const invoiceDetail = {
  fontSize: "14px",
  lineHeight: "24px",
  color: "#484848",
  margin: "0",
};

const btnContainer = {
  textAlign: "center" as const,
  padding: "16px 48px",
};

const button = {
  backgroundColor: "#18181b",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 24px",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 48px",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  padding: "0 48px",
};
