"use client";

import { Plus, Trash2 } from "lucide-react";
import { UseFormRegister, UseFormWatch, UseFormSetValue } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InvoiceFormData } from "@/lib/validations";

interface LineItemEditorProps {
  fields: { id: string }[];
  append: (value: {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }) => void;
  remove: (index: number) => void;
  register: UseFormRegister<InvoiceFormData>;
  watch: UseFormWatch<InvoiceFormData>;
  setValue: UseFormSetValue<InvoiceFormData>;
}

function formatDollars(dollars: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(dollars);
}

export function LineItemEditor({
  fields,
  append,
  remove,
  register,
  watch,
}: LineItemEditorProps) {
  return (
    <div className="space-y-3">
      <div className="hidden grid-cols-12 gap-2 text-xs font-medium text-muted-foreground sm:grid">
        <div className="col-span-5">Description</div>
        <div className="col-span-2">Qty</div>
        <div className="col-span-2">Unit Price ($)</div>
        <div className="col-span-2 text-right">Amount</div>
        <div className="col-span-1" />
      </div>

      {fields.map((field, index) => {
        const quantity = watch(`lineItems.${index}.quantity`) || 0;
        const unitPrice = watch(`lineItems.${index}.unitPrice`) || 0;
        const amount = quantity * unitPrice;

        return (
          <div
            key={field.id}
            className="grid grid-cols-12 items-start gap-2"
          >
            <div className="col-span-12 sm:col-span-5">
              <Label className="sm:hidden">Description</Label>
              <Input
                {...register(`lineItems.${index}.description`)}
                placeholder="Item description"
              />
            </div>
            <div className="col-span-4 sm:col-span-2">
              <Label className="sm:hidden">Qty</Label>
              <Input
                type="number"
                min="1"
                {...register(`lineItems.${index}.quantity`, {
                  valueAsNumber: true,
                })}
              />
            </div>
            <div className="col-span-4 sm:col-span-2">
              <Label className="sm:hidden">Price ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                {...register(`lineItems.${index}.unitPrice`, {
                  valueAsNumber: true,
                })}
              />
            </div>
            <div className="col-span-3 sm:col-span-2 flex items-center justify-end text-sm font-medium">
              {formatDollars(amount)}
            </div>
            <div className="col-span-1 flex justify-end">
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          append({ description: "", quantity: 1, unitPrice: 0, amount: 0 })
        }
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Line Item
      </Button>
    </div>
  );
}
