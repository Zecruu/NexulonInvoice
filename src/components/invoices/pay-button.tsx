"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createCheckoutSession } from "@/actions/payment-actions";
import { formatCurrency } from "@/lib/format";

interface PayButtonProps {
  invoiceId: string;
  total: number;
  currency: string;
}

export function PayButton({ invoiceId, total, currency }: PayButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setLoading(true);
    const result = await createCheckoutSession(invoiceId);
    if (result.error) {
      alert(result.error);
      setLoading(false);
      return;
    }
    if (result.url) {
      window.location.href = result.url;
    }
  }

  return (
    <div className="text-center">
      <Button
        size="lg"
        className="w-full max-w-sm text-base"
        onClick={handlePay}
        disabled={loading}
      >
        <CreditCard className="mr-2 h-5 w-5" />
        {loading ? "Redirecting..." : `Pay ${formatCurrency(total, currency)}`}
      </Button>
    </div>
  );
}
