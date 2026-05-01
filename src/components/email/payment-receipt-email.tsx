import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
  Preview,
  Img,
} from "@react-email/components";

interface PaymentReceiptEmailProps {
  invoiceNumber: string;
  clientName: string;
  businessName: string;
  amount: string;
  paidAt: string;
  paymentMethod?: string;
  logoUrl?: string;
}

export function PaymentReceiptEmail({
  invoiceNumber,
  clientName,
  businessName,
  amount,
  paidAt,
  paymentMethod,
  logoUrl,
}: PaymentReceiptEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Receipt: {amount} paid to {businessName} for {invoiceNumber}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {logoUrl ? (
            <Section style={logoContainer}>
              <Img src={logoUrl} alt={businessName} style={logo} />
            </Section>
          ) : null}
          <Text style={heading}>Payment Received</Text>

          <Text style={paragraph}>Hi {clientName},</Text>
          <Text style={paragraph}>
            Thank you for your payment to {businessName}. Your invoice has
            been marked as paid. Keep this email as your receipt.
          </Text>

          <Section style={detailsBox}>
            <Text style={detailRow}>
              <strong>Invoice:</strong> {invoiceNumber}
            </Text>
            <Text style={detailRow}>
              <strong>Amount paid:</strong> {amount}
            </Text>
            <Text style={detailRow}>
              <strong>Paid on:</strong> {paidAt}
            </Text>
            {paymentMethod ? (
              <Text style={detailRow}>
                <strong>Method:</strong> {paymentMethod}
              </Text>
            ) : null}
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Questions? Reply to this email and {businessName} will get back to
            you. This receipt was sent automatically by Nexulon Invoice.
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

const logoContainer = {
  padding: "0 48px",
  marginBottom: "8px",
};

const logo = {
  maxHeight: "56px",
  maxWidth: "200px",
  height: "auto",
  width: "auto",
  objectFit: "contain" as const,
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

const detailsBox = {
  backgroundColor: "#f4f4f5",
  borderRadius: "4px",
  margin: "16px 48px",
  padding: "16px 24px",
};

const detailRow = {
  fontSize: "14px",
  lineHeight: "24px",
  color: "#484848",
  margin: "0",
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
