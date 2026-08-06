import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Ban, ExternalLink } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { formatManilaDateTime, formatPeso } from "@/lib/bookings/format";
import { getStaffBookings } from "@/lib/data/operations";
import { PageHeader } from "@/components/dashboard/page-header";
import { ConfirmSubmitButton, SubmitButton } from "@/components/dashboard/form-controls";
import { BookingStatusBadge } from "@/components/dashboard/booking-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updatePaymentAction } from "../bookings/actions";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage() {
  const profile = await requireRole("owner");
  const bookings = (
    await getStaffBookings(profile, { paymentStatus: "unverified", limit: 300 })
  ).filter((booking) => booking.status !== "cancelled_by_admin");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Studio operations"
        title="Payments"
        description="Review MariBank receipts received through Messenger, then manually verify or waive payment. Nothing is verified automatically."
      />

      <section className="flex flex-col gap-4" aria-label="Awaiting payment verification">
        <p className="text-sm text-muted-foreground">
          {bookings.length} payment{bookings.length === 1 ? "" : "s"} awaiting verification
        </p>
        {bookings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BadgeCheck className="mx-auto h-8 w-8 text-success" />
              <p className="mt-3 text-sm font-semibold text-primary">All caught up</p>
              <p className="mt-1 text-sm text-muted-foreground">
                There are no active unverified payments.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {bookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-lg">{booking.clientName}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {booking.serviceName} · {booking.technicianName}
                    </p>
                  </div>
                  <BookingStatusBadge status={booking.status} />
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-taupe">Appointment</dt>
                      <dd className="mt-1">{formatManilaDateTime(booking.startsAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-taupe">Amount</dt>
                      <dd className="mt-1 font-semibold text-primary">
                        {formatPeso(booking.price)}
                      </dd>
                    </div>
                  </dl>
                  <div className="flex flex-wrap gap-2">
                    <form action={updatePaymentAction}>
                      <input type="hidden" name="booking_id" value={booking.id} />
                      <input type="hidden" name="payment_status" value="verified" />
                      <SubmitButton size="sm" pendingLabel="Verifying...">
                        <BadgeCheck /> Verify
                      </SubmitButton>
                    </form>
                    <form action={updatePaymentAction}>
                      <input type="hidden" name="booking_id" value={booking.id} />
                      <input type="hidden" name="payment_status" value="waived" />
                      <ConfirmSubmitButton
                        size="sm"
                        variant="outline"
                        pendingLabel="Waiving..."
                        confirmation={`Waive payment for ${booking.clientName}? This cannot be undone.`}
                      >
                        <Ban /> Waive
                      </ConfirmSubmitButton>
                    </form>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/dashboard/bookings/${booking.id}`}>
                        Details <ExternalLink />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
