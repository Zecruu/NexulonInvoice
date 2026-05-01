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

interface PaymentNotificationEmailProps {
  invoiceNumber: string;
  clientName: string;
  amount: string;
  paidAt: string;
  paymentMethod?: string;
  invoiceUrl: string;
}

export function PaymentNotificationEmail({
  invoiceNumber,
  clientName,
  amount,
  paidAt,
  paymentMethod,
  invoiceUrl,
}: PaymentNotificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        💰 {clientName} just paid {amount} for {invoiceNumber}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={heading}>You got paid 💰</Text>

          <Text style={paragraph}>
            <strong>{clientName}</strong> just paid invoice{" "}
            <strong>{invoiceNumber}</strong>.
          </Text>

          <Section style={detailsBox}>
            <Text style={amountLine}>{amount}</Text>
            <Text style={detailRow}>
              <strong>From:</strong> {clientName}
            </Text>
            <Text style={detailRow}>
              <strong>Invoice:</strong> {invoiceNumber}
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

          <Section style={btnContainer}>
            <Button style={button} href={invoiceUrl}>
              View invoice in dashboard
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Funds will land in your Stripe account on the standard payout
            schedule. This is an automatic notification from Nexulon Invoice.
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

const detailsBox = {
  backgroundColor: "#ecfdf5",
  borderRadius: "4px",
  margin: "16px 48px",
  padding: "20px 24px",
  border: "1px solid #a7f3d0",
};

const amountLine = {
  fontSize: "32px",
  fontWeight: "700" as const,
  color: "#047857",
  margin: "0 0 12px 0",
};

const detailRow = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#374151",
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
