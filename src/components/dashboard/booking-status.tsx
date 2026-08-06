import type { BookingStatus, PaymentStatus } from "@/types/database";
import { cn } from "@/lib/utils";

const BOOKING_LABELS: Record<BookingStatus, string> = {
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled_by_admin: "Cancelled",
  no_show: "No-show",
};

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  unverified: "Awaiting verification",
  verified: "Verified",
  waived: "Waived",
  refunded: "Refunded",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold",
        status === "confirmed" && "bg-secondary text-wine",
        status === "completed" && "bg-success/10 text-success",
        status === "cancelled_by_admin" && "bg-muted text-muted-foreground",
        status === "no_show" && "bg-destructive/10 text-destructive",
      )}
    >
      {BOOKING_LABELS[status]}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold",
        status === "unverified" && "bg-amber-100 text-amber-800",
        status === "verified" && "bg-success/10 text-success",
        (status === "waived" || status === "refunded") && "bg-muted text-muted-foreground",
      )}
    >
      {PAYMENT_LABELS[status]}
    </span>
  );
}
