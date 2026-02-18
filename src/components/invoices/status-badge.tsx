import { Badge } from "@/components/ui/badge";
import {
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
} from "@/lib/constants";
import type { InvoiceStatus } from "@/lib/constants";

interface StatusBadgeProps {
  status: InvoiceStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge variant="secondary" className={INVOICE_STATUS_COLORS[status]}>
      {INVOICE_STATUS_LABELS[status]}
    </Badge>
  );
}
