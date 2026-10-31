import type { OrderStatus } from "@repo/db";
import { ORDER_STATUS_LABEL } from "@repo/db/utils";

const STYLES: Record<OrderStatus, string> = {
  PAID: "bg-lime text-ink",
  PENDING: "bg-amber-100 text-amber-900",
  FAILED: "bg-red-100 text-red-800",
  EXPIRED: "bg-stone-200 text-stone-700",
  CANCELED: "bg-stone-200 text-stone-700",
};

export function StatusBadge({ status, testId }: { status: OrderStatus; testId?: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-wide ${STYLES[status]}`} data-testid={testId}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}
