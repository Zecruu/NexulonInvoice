"use client";

import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientSelect } from "@/components/clients/client-select";
import { LineItemEditor } from "./line-item-editor";
import { invoiceSchema, InvoiceFormData } from "@/lib/validations";
import { createInvoice, updateInvoice } from "@/actions/invoice-actions";
import { formatDateISO } from "@/lib/format";
import type { ClientType, InvoiceType } from "@/types";

function formatDollars(dollars: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(dollars);
}

interface InvoiceFormProps {
  clients: ClientType[];
  invoice?: InvoiceType;
}

export function InvoiceForm({ clients, invoice }: InvoiceFormProps) {
  const router = useRouter();
  const isEditing = !!invoice;

  const today = formatDateISO(new Date());
  const defaultDue = formatDateISO(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      clientId:
        (typeof invoice?.clientId === "object"
          ? invoice.clientId._id
          : invoice?.clientId) || "",
      issueDate: invoice ? formatDateISO(invoice.issueDate) : today,
      dueDate: invoice ? formatDateISO(invoice.dueDate) : defaultDue,
      lineItems: invoice?.lineItems?.length
        ? invoice.lineItems.map((item) => ({
            ...item,
            unitPrice: item.unitPrice / 100,
            amount: item.amount / 100,
          }))
        : [{ description: "", quantity: 1, unitPrice: 0, amount: 0 }],
      taxRate: invoice?.taxRate ?? 0,
      discountType: invoice?.discountType,
      discountValue: invoice?.discountValue
        ? invoice.discountType === "fixed"
          ? invoice.discountValue / 100
          : invoice.discountValue
        : 0,
      notes: invoice?.notes || "",
      internalNotes: invoice?.internalNotes || "",
      currency: invoice?.currency || "USD",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lineItems",
  });

  const watchedItems = watch("lineItems");
  const watchedTaxRate = watch("taxRate") || 0;
  const watchedDiscountType = watch("discountType");
  const watchedDiscountValue = watch("discountValue") || 0;

  // Calculate totals
  const subtotal = watchedItems.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0),
    0
  );
  const taxAmount = subtotal * (watchedTaxRate / 100);
  let discountAmount = 0;
  if (watchedDiscountType && watchedDiscountValue) {
    discountAmount =
      watchedDiscountType === "percentage"
        ? Math.round(subtotal * (watchedDiscountValue / 100))
        : watchedDiscountValue;
  }
  const total = subtotal + taxAmount - discountAmount;

  async function onSubmit(data: InvoiceFormData) {
    const result = isEditing
      ? await updateInvoice(invoice!._id, data)
      : await createInvoice(data);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(isEditing ? "Invoice updated" : "Invoice created");
    if (!isEditing && "invoiceId" in result) {
      router.push(`/invoices/${result.invoiceId}`);
    } else {
      router.push("/invoices");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main form */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Client *</Label>
                <ClientSelect
                  clients={clients}
                  value={watch("clientId")}
                  onChange={(val) => setValue("clientId", val)}
                />
                {errors.clientId && (
                  <p className="text-sm text-destructive">
                    {errors.clientId.message}
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="issueDate">Issue Date *</Label>
                  <Input
                    id="issueDate"
                    type="date"
                    {...register("issueDate")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <Input id="dueDate" type="date" {...register("dueDate")} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <LineItemEditor
                fields={fields}
                append={append}
                remove={remove}
                register={register}
                watch={watch}
                setValue={setValue}
              />
              {errors.lineItems && (
                <p className="mt-2 text-sm text-destructive">
                  {errors.lineItems.message ||
                    errors.lineItems.root?.message}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tax & Discount</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    {...register("taxRate", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Discount Type</Label>
                  <Select
                    value={watch("discountType") || ""}
                    onValueChange={(val) =>
                      setValue(
                        "discountType",
                        val as "percentage" | "fixed" | undefined
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No discount" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {watchedDiscountType && (
                <div className="space-y-2">
                  <Label htmlFor="discountValue">
                    Discount Value{" "}
                    {watchedDiscountType === "percentage" ? "(%)" : "($)"}
                  </Label>
                  <Input
                    id="discountValue"
                    type="number"
                    min="0"
                    {...register("discountValue", { valueAsNumber: true })}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Notes to Client</Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Thank you for your business!"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="internalNotes">Internal Notes</Label>
                <Textarea
                  id="internalNotes"
                  {...register("internalNotes")}
                  placeholder="Internal notes (not visible to client)..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Totals sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatDollars(subtotal)}</span>
                </div>
                {watchedTaxRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Tax ({watchedTaxRate}%)
                    </span>
                    <span>{formatDollars(taxAmount)}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-green-600">
                      -{formatDollars(discountAmount)}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatDollars(total)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : isEditing
                    ? "Update Invoice"
                    : "Save as Draft"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
