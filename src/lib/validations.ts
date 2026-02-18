import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  contactPerson: z.string().optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  notes: z.string().optional(),
});

export type ClientFormData = z.infer<typeof clientSchema>;

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Price must be 0 or more"),
  amount: z.number(),
});

export const invoiceSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
  taxRate: z.number().min(0).max(100),
  discountType: z.enum(["percentage", "fixed"]).optional(),
  discountValue: z.number().min(0).optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  currency: z.string(),
});

export type InvoiceFormData = z.infer<typeof invoiceSchema>;

export const settingsSchema = z.object({
  businessName: z.string().optional(),
  businessEmail: z.string().email().optional().or(z.literal("")),
  businessPhone: z.string().optional(),
  businessAddress: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  defaultCurrency: z.string().default("USD"),
  defaultTaxRate: z.number().min(0).max(100).default(0),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;
