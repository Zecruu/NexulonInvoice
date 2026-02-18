export const INVOICE_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "paid",
  "overdue",
  "cancelled",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"] as const;

export const DEFAULT_CURRENCY = "USD";
export const DEFAULT_TAX_RATE = 0;
export const DEFAULT_DUE_DAYS = 30;

// Tier system
export const TIERS = ["free", "pro"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_LIMITS: Record<Tier, number> = {
  free: 50,
  pro: 500,
};

export const TIER_LABELS: Record<Tier, string> = {
  free: "Free",
  pro: "Pro",
};

export const TIER_COLORS: Record<Tier, string> = {
  free: "bg-gray-100 text-gray-700",
  pro: "bg-purple-100 text-purple-700",
};
