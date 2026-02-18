import type { InvoiceStatus, Tier } from "@/lib/constants";

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface UserType {
  _id: string;
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  imageUrl?: string;
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessAddress?: Address;
  businessLogo?: string;
  defaultCurrency: string;
  defaultTaxRate: number;
  tier: Tier;
  tierUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientType {
  _id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  contactPerson?: string;
  address?: Address;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceType {
  _id: string;
  userId: string;
  clientId: string | ClientType;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountType?: "percentage" | "fixed";
  discountValue?: number;
  discountAmount: number;
  total: number;
  currency: string;
  notes?: string;
  internalNotes?: string;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  paymentLink?: string;
  paidAt?: string;
  paidAmount?: number;
  sentAt?: string;
  sentTo?: string;
  viewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentType {
  _id: string;
  invoiceId: string;
  userId: string;
  stripeSessionId: string;
  stripePaymentIntentId: string;
  amount: number;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  paymentMethod?: string;
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardMetrics {
  totalRevenue: number;
  outstandingAmount: number;
  overdueCount: number;
  totalInvoices: number;
  totalClients: number;
}

export interface AdminUserType {
  _id: string;
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  imageUrl?: string;
  businessName?: string;
  tier: Tier;
  tierUpdatedAt?: string;
  invoicesThisMonth: number;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  proUsers: number;
  freeUsers: number;
  invoicesThisMonth: number;
}
