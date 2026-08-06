import Link from "next/link";
import { CalendarDays, Clock3, UserRound } from "lucide-react";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/dashboard/booking-status";
import { Card, CardContent } from "@/components/ui/card";
import { formatManilaDate, formatManilaTime } from "@/lib/bookings/format";
import type { StaffBooking } from "@/lib/data/operations";

export function BookingListItem({
  booking,
  showTechnician,
}: {
  booking: StaffBooking;
  showTechnician: boolean;
}) {
  return (
    <Link href={`/dashboard/bookings/${booking.id}`} className="group block rounded-xl">
      <Card className="transition-colors group-hover:border-primary/40 group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold text-primary">{booking.clientName}</p>
              <span className="text-xs text-muted-foreground">{booking.bookingCode}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{booking.serviceName}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> {formatManilaDate(booking.startsAt)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" /> {formatManilaTime(booking.startsAt)} -{" "}
                {formatManilaTime(booking.endsAt)}
              </span>
              {showTechnician ? (
                <span className="inline-flex items-center gap-1.5">
                  <UserRound className="h-3.5 w-3.5" /> {booking.technicianName}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:max-w-48 sm:justify-end">
            <BookingStatusBadge status={booking.status} />
            <PaymentStatusBadge status={booking.paymentStatus} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
