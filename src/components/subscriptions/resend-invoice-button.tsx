"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resendInvoiceEmail } from "@/actions/email-actions";

export function ResendInvoiceButton({
  invoiceId,
  disabled,
}: {
  invoiceId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function resend() {
    setLoading(true);
    const r = await resendInvoiceEmail(invoiceId);
    setLoading(false);
    if (r.error) {
      toast.error(r.error);
      return;
    }
    toast.success("Invoice resent with current branding");
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={resend}
      disabled={loading || disabled}
      title="Resend with current logo + business name"
      className="h-7 px-2 text-xs"
    >
      <Send className="mr-1 h-3 w-3" />
      {loading ? "Sending…" : "Resend"}
    </Button>
  );
}
