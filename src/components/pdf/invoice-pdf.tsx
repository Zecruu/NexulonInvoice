import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#18181b",
  },
  invoiceNumber: {
    fontSize: 12,
    color: "#71717a",
    marginTop: 4,
  },
  dateBlock: {
    textAlign: "right",
  },
  dateLabel: {
    color: "#71717a",
    fontSize: 9,
  },
  dateValue: {
    fontSize: 11,
    marginBottom: 4,
  },
  separator: {
    borderBottomWidth: 1,
    borderBottomColor: "#e4e4e7",
    marginVertical: 16,
  },
  sectionRow: {
    flexDirection: "row",
    gap: 40,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#71717a",
    marginBottom: 6,
  },
  sectionContent: {
    flex: 1,
  },
  bold: {
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
  },
  muted: {
    color: "#71717a",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e4e4e7",
    paddingBottom: 6,
    marginBottom: 0,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f4f4f5",
    paddingVertical: 8,
  },
  colDescription: { flex: 4 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 2, textAlign: "right" },
  colAmount: { flex: 2, textAlign: "right" },
  totalsBlock: {
    marginTop: 16,
    marginLeft: "auto",
    width: 200,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalLabel: {
    color: "#71717a",
  },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#e4e4e7",
    marginTop: 4,
  },
  grandTotalText: {
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
  },
  notes: {
    marginTop: 30,
    padding: 12,
    backgroundColor: "#f4f4f5",
    borderRadius: 4,
  },
  notesTitle: {
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#71717a",
    marginBottom: 4,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#a1a1aa",
  },
});

interface InvoicePDFProps {
  invoice: {
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    lineItems: {
      description: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }[];
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    discountAmount: number;
    total: number;
    currency: string;
    notes?: string;
  };
  client: {
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
  sender: {
    businessName?: string;
    firstName: string;
    lastName: string;
    email: string;
    businessEmail?: string;
    businessPhone?: string;
    businessAddress?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
  };
}

function formatMoney(cents: number, currency: string = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function formatDateStr(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function InvoicePDF({ invoice, client, sender }: InvoicePDFProps) {
  const senderName =
    sender.businessName || `${sender.firstName} ${sender.lastName}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
          </View>
          <View style={styles.dateBlock}>
            <Text style={styles.dateLabel}>Issue Date</Text>
            <Text style={styles.dateValue}>
              {formatDateStr(invoice.issueDate)}
            </Text>
            <Text style={styles.dateLabel}>Due Date</Text>
            <Text style={styles.dateValue}>
              {formatDateStr(invoice.dueDate)}
            </Text>
          </View>
        </View>

        <View style={styles.separator} />

        {/* From / To */}
        <View style={styles.sectionRow}>
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>From</Text>
            <Text style={styles.bold}>{senderName}</Text>
            <Text style={styles.muted}>
              {sender.businessEmail || sender.email}
            </Text>
            {sender.businessPhone && (
              <Text style={styles.muted}>{sender.businessPhone}</Text>
            )}
            {sender.businessAddress?.street && (
              <>
                <Text style={styles.muted}>
                  {sender.businessAddress.street}
                </Text>
                <Text style={styles.muted}>
                  {[
                    sender.businessAddress.city,
                    sender.businessAddress.state,
                    sender.businessAddress.zipCode,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </Text>
              </>
            )}
          </View>
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <Text style={styles.bold}>{client.name}</Text>
            <Text style={styles.muted}>{client.email}</Text>
            {client.address?.street && (
              <>
                <Text style={styles.muted}>{client.address.street}</Text>
                <Text style={styles.muted}>
                  {[
                    client.address.city,
                    client.address.state,
                    client.address.zipCode,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.separator} />

        {/* Line Items */}
        <View style={styles.tableHeader}>
          <Text style={[styles.colDescription, styles.muted]}>Description</Text>
          <Text style={[styles.colQty, styles.muted]}>Qty</Text>
          <Text style={[styles.colPrice, styles.muted]}>Unit Price</Text>
          <Text style={[styles.colAmount, styles.muted]}>Amount</Text>
        </View>
        {invoice.lineItems.map((item, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.colDescription}>{item.description}</Text>
            <Text style={styles.colQty}>{item.quantity}</Text>
            <Text style={styles.colPrice}>
              {formatMoney(item.unitPrice, invoice.currency)}
            </Text>
            <Text style={styles.colAmount}>
              {formatMoney(item.amount, invoice.currency)}
            </Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text>{formatMoney(invoice.subtotal, invoice.currency)}</Text>
          </View>
          {invoice.taxRate > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax ({invoice.taxRate}%)</Text>
              <Text>{formatMoney(invoice.taxAmount, invoice.currency)}</Text>
            </View>
          )}
          {invoice.discountAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text>
                -{formatMoney(invoice.discountAmount, invoice.currency)}
              </Text>
            </View>
          )}
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalText}>Total Due</Text>
            <Text style={styles.grandTotalText}>
              {formatMoney(invoice.total, invoice.currency)}
            </Text>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Generated by Nexulon Invoice
        </Text>
      </Page>
    </Document>
  );
}
