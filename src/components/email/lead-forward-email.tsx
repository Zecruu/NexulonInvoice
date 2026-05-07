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

export interface LeadForwardItem {
  name: string;
  phone: string;
  temperature: "hot" | "warm" | "cold";
  score: number;
  status: string;
  summary: string;
  intakeSummary?: string;
  painLevel?: number;
  painLocation?: string;
  painDuration?: string;
  diagnosis?: string;
  hasMRI?: boolean;
  hasInsurance?: boolean;
  urgency?: string;
  location?: string;
  servicesInterested?: string[];
  conversationUrl: string;
}

interface LeadForwardEmailProps {
  forwarderName: string;
  businessName: string;
  note?: string;
  leads: LeadForwardItem[];
  logoUrl?: string;
}

export function LeadForwardEmail({
  forwarderName,
  businessName,
  note,
  leads,
  logoUrl,
}: LeadForwardEmailProps) {
  const tempLabel = (t: string) => t.toUpperCase();
  const tempColor = (t: string) =>
    t === "hot"
      ? { background: "#fef2f2", color: "#b91c1c", border: "#fca5a5" }
      : t === "warm"
        ? { background: "#fffbeb", color: "#b45309", border: "#fcd34d" }
        : { background: "#f0f9ff", color: "#0369a1", border: "#7dd3fc" };

  const previewText = `${leads.length} lead${leads.length === 1 ? "" : "s"} from ${businessName} — forwarded by ${forwarderName}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {logoUrl ? (
            <Section style={logoContainer}>
              <Img src={logoUrl} alt={businessName} style={logo} />
            </Section>
          ) : null}

          <Text style={heading}>
            {leads.length} lead{leads.length === 1 ? "" : "s"} forwarded
          </Text>
          <Text style={subheading}>
            From {forwarderName} at {businessName}
          </Text>

          {note ? (
            <Section style={noteBox}>
              <Text style={noteLabel}>Note</Text>
              <Text style={noteBody}>{note}</Text>
            </Section>
          ) : null}

          {leads.map((lead, i) => {
            const colors = tempColor(lead.temperature);
            return (
              <Section key={i} style={leadCard}>
                <Text style={leadName}>{lead.name || lead.phone}</Text>
                {lead.name ? (
                  <Text style={leadPhone}>{lead.phone}</Text>
                ) : null}

                <Section style={badgeRow}>
                  <span
                    style={{
                      ...badge,
                      backgroundColor: colors.background,
                      color: colors.color,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    {tempLabel(lead.temperature)} · score {lead.score}
                  </span>
                  <span style={statusBadge}>{lead.status}</span>
                </Section>

                {lead.summary ? (
                  <Text style={summaryText}>{lead.summary}</Text>
                ) : null}

                {lead.intakeSummary ? (
                  <>
                    <Text style={fieldLabel}>Intake summary</Text>
                    <Text style={fieldValue}>{lead.intakeSummary}</Text>
                  </>
                ) : null}

                <Section style={detailGrid}>
                  {lead.painLevel !== undefined ? (
                    <Detail label="Pain level" value={`${lead.painLevel}/10`} />
                  ) : null}
                  {lead.painLocation ? (
                    <Detail label="Location" value={lead.painLocation} />
                  ) : null}
                  {lead.painDuration ? (
                    <Detail label="Duration" value={lead.painDuration} />
                  ) : null}
                  {lead.diagnosis ? (
                    <Detail label="Diagnosis" value={lead.diagnosis} />
                  ) : null}
                  {lead.hasMRI !== undefined ? (
                    <Detail label="Has MRI" value={lead.hasMRI ? "Yes" : "No"} />
                  ) : null}
                  {lead.hasInsurance !== undefined ? (
                    <Detail
                      label="Has insurance"
                      value={lead.hasInsurance ? "Yes" : "No"}
                    />
                  ) : null}
                  {lead.urgency ? (
                    <Detail label="Urgency" value={lead.urgency} />
                  ) : null}
                  {lead.location ? (
                    <Detail label="Area" value={lead.location} />
                  ) : null}
                </Section>

                {lead.servicesInterested && lead.servicesInterested.length > 0 ? (
                  <>
                    <Text style={fieldLabel}>Services interested</Text>
                    <Text style={fieldValue}>
                      {lead.servicesInterested.join(", ")}
                    </Text>
                  </>
                ) : null}

                <Text style={linkLine}>
                  Open conversation:{" "}
                  <a href={lead.conversationUrl} style={link}>
                    {lead.conversationUrl}
                  </a>
                </Text>
              </Section>
            );
          })}

          <Hr style={hr} />
          <Text style={footer}>
            Forwarded from Nexulon Invoice. Reply to this email and {forwarderName} will receive it.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Text style={detailItem}>
      <span style={detailLabel}>{label}: </span>
      <span style={detailValue}>{value}</span>
    </Text>
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
  maxWidth: "640px",
};

const logoContainer = { padding: "0 48px", marginBottom: "8px" };
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
  margin: "0",
};
const subheading = {
  fontSize: "13px",
  color: "#6b7280",
  padding: "0 48px",
  margin: "4px 0 16px 0",
};

const noteBox = {
  margin: "8px 48px 20px 48px",
  padding: "12px 16px",
  backgroundColor: "#fffbeb",
  border: "1px solid #fcd34d",
  borderRadius: "6px",
};
const noteLabel = {
  fontSize: "10px",
  fontWeight: "700" as const,
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  color: "#92400e",
  margin: "0 0 4px 0",
};
const noteBody = {
  fontSize: "14px",
  color: "#78350f",
  margin: "0",
  whiteSpace: "pre-wrap" as const,
};

const leadCard = {
  margin: "8px 48px 16px 48px",
  padding: "16px 18px",
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
};
const leadName = {
  fontSize: "16px",
  fontWeight: "700" as const,
  color: "#111827",
  margin: "0",
};
const leadPhone = {
  fontSize: "12px",
  color: "#6b7280",
  margin: "2px 0 8px 0",
  fontFamily: "ui-monospace, monospace",
};

const badgeRow = {
  margin: "8px 0 12px 0",
};
const badge = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: "600" as const,
  marginRight: "6px",
  letterSpacing: "0.02em",
};
const statusBadge = {
  ...badge,
  backgroundColor: "#f3f4f6",
  color: "#374151",
  border: "1px solid #d1d5db",
};

const summaryText = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#1f2937",
  margin: "8px 0 12px 0",
};

const fieldLabel = {
  fontSize: "10px",
  fontWeight: "700" as const,
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  color: "#6b7280",
  margin: "12px 0 2px 0",
};
const fieldValue = {
  fontSize: "13px",
  color: "#1f2937",
  margin: "0 0 8px 0",
  whiteSpace: "pre-wrap" as const,
};

const detailGrid = { margin: "8px 0" };
const detailItem = {
  fontSize: "13px",
  color: "#1f2937",
  margin: "0 0 4px 0",
};
const detailLabel = {
  color: "#6b7280",
  fontWeight: "600" as const,
};
const detailValue = { color: "#1f2937" };

const linkLine = {
  fontSize: "12px",
  color: "#6b7280",
  margin: "12px 0 0 0",
};
const link = {
  color: "#2563eb",
  textDecoration: "underline",
};

const hr = { borderColor: "#e6ebf1", margin: "20px 48px" };
const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  padding: "0 48px",
};
