import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  CheckCircle2,
  Clock3,
  Mail,
  Phone,
  UserRound,
  XCircle,
} from "lucide-react";
import { requireProfile, isOwner } from "@/lib/auth/session";
import { TIMEZONE } from "@/lib/constants";
import { formatManilaDateTime, formatPeso } from "@/lib/bookings/format";
import { getStaffBookingDetail } from "@/lib/data/operations";
import { uuidSchema } from "@/lib/validation/shared";
import { DateTime } from "luxon";
import { ActionNotice } from "@/components/dashboard/action-notice";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/dashboard/booking-status";
import { ConfirmSubmitButton, SubmitButton } from "@/components/dashboard/form-controls";
import { RescheduleForm } from "@/components/dashboard/reschedule-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cancelBookingAction, setOutcomeAction, updatePaymentAction } from "../actions";

export const metadata: Metadata = { title: "Booking details" };

type PageProps = {
  params: Promise<{ booking_id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
};

export default async function BookingDetailPage({ params, searchParams }: PageProps) {
  const profile = await requireProfile();
  const owner = isOwner(profile);
  const route = await params;
  const messages = await searchParams;
  const parsed = uuidSchema.safeParse(route.booking_id);
  if (!parsed.success) notFound();
  const booking = await getStaffBookingDetail(profile, parsed.data);
  if (!booking) notFound();

  const bookingDate = DateTime.fromISO(booking.startsAt, { setZone: true })
    .setZone(TIMEZONE)
    .toFormat("yyyy-MM-dd");
  const initialRescheduleDate =
    bookingDate < booking.minimumDate ? booking.minimumDate : bookingDate;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-4">
          <Link href="/dashboard/bookings">
            <ArrowLeft /> Back to bookings
          </Link>
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-taupe">
              {booking.bookingCode}
            </p>
            <h1 className="mt-2 font-serif text-3xl text-primary">{booking.clientName}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{booking.serviceName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <BookingStatusBadge status={booking.status} />
            <PaymentStatusBadge status={booking.paymentStatus} />
          </div>
        </div>
      </div>

      <ActionNotice success={messages.success} error={messages.error} />

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Appointment</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <Detail label="Starts" value={formatManilaDateTime(booking.startsAt)} />
              <Detail label="Ends" value={formatManilaDateTime(booking.endsAt)} />
              <Detail label="Technician" value={booking.technicianName} />
              <Detail label="Duration" value={`${booking.durationMinutes} minutes`} />
              <Detail label="Price" value={formatPeso(booking.price)} />
              <Detail
                label="Policy accepted"
                value={
                  booking.policyAcceptedAt
                    ? formatManilaDateTime(booking.policyAcceptedAt)
                    : "Not recorded"
                }
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Client contact</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            <a
              className="inline-flex items-center gap-2 text-primary hover:underline"
              href={`tel:${booking.clientPhone}`}
            >
              <Phone className="h-4 w-4" /> {booking.clientPhone}
            </a>
            <a
              className="inline-flex items-center gap-2 break-all text-primary hover:underline"
              href={`mailto:${booking.clientEmail}`}
            >
              <Mail className="h-4 w-4" /> {booking.clientEmail}
            </a>
            <div className="rounded-lg bg-muted/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-taupe">
                Client notes
              </p>
              <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                {booking.clientNotes || "No notes provided."}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Private reference photo</CardTitle>
          <p className="text-sm text-muted-foreground">
            The image link is signed for two minutes and is available only to authorized staff.
          </p>
        </CardHeader>
        <CardContent>
          {booking.referencePhotoUrl ? (
            <div className="overflow-hidden rounded-lg border border-border bg-muted/40 p-3">
              <Image
                src={booking.referencePhotoUrl}
                alt={`Private nail reference uploaded by ${booking.clientName}`}
                width={900}
                height={900}
                unoptimized
                className="mx-auto max-h-[34rem] w-auto max-w-full object-contain"
              />
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No reference photo was uploaded.
            </p>
          )}
        </CardContent>
      </Card>

      {booking.status === "confirmed" ? (
        <section aria-labelledby="actions-title" className="flex flex-col gap-4">
          <div>
            <h2 id="actions-title" className="font-serif text-2xl text-primary">
              Booking actions
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Only valid state changes are shown. Changes are checked again on the server.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock3 className="h-4 w-4" /> Appointment outcome
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <form action={setOutcomeAction}>
                  <input type="hidden" name="booking_id" value={booking.id} />
                  <input type="hidden" name="status" value="completed" />
                  <SubmitButton pendingLabel="Updating...">
                    <CheckCircle2 /> Mark completed
                  </SubmitButton>
                </form>
                <form action={setOutcomeAction}>
                  <input type="hidden" name="booking_id" value={booking.id} />
                  <input type="hidden" name="status" value="no_show" />
                  <ConfirmSubmitButton
                    variant="outline"
                    pendingLabel="Updating..."
                    confirmation="Mark this client as a no-show? This cannot be undone."
                  >
                    <UserRound /> Mark no-show
                  </ConfirmSubmitButton>
                </form>
              </CardContent>
            </Card>

            {owner && booking.paymentStatus === "unverified" ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BadgeCheck className="h-4 w-4" /> Payment verification
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <form action={updatePaymentAction}>
                    <input type="hidden" name="booking_id" value={booking.id} />
                    <input type="hidden" name="payment_status" value="verified" />
                    <SubmitButton pendingLabel="Verifying...">
                      <BadgeCheck /> Verify payment
                    </SubmitButton>
                  </form>
                  <form action={updatePaymentAction}>
                    <input type="hidden" name="booking_id" value={booking.id} />
                    <input type="hidden" name="payment_status" value="waived" />
                    <ConfirmSubmitButton
                      variant="outline"
                      pendingLabel="Waiving..."
                      confirmation="Waive payment for this booking? This cannot be undone."
                    >
                      <Ban /> Waive payment
                    </ConfirmSubmitButton>
                  </form>
                </CardContent>
              </Card>
            ) : null}
          </div>

          {owner ? (
            <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Reschedule booking</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Availability is recomputed with the same engine used by the public booking flow.
                  </p>
                </CardHeader>
                <CardContent>
                  <RescheduleForm
                    bookingId={booking.id}
                    technicians={booking.assignedTechnicians}
                    initialTechnicianId={booking.technicianId}
                    initialDate={initialRescheduleDate}
                    minimumDate={booking.minimumDate}
                    maximumDate={booking.maximumDate}
                  />
                </CardContent>
              </Card>

              <Card className="border-destructive/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-destructive">
                    <XCircle className="h-4 w-4" /> Cancel booking
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Cancellation is permanent and immediately frees the appointment slot.
                  </p>
                </CardHeader>
                <CardContent>
                  <form action={cancelBookingAction}>
                    <input type="hidden" name="booking_id" value={booking.id} />
                    <ConfirmSubmitButton
                      variant="destructive"
                      pendingLabel="Cancelling..."
                      confirmation={`Cancel ${booking.clientName}'s booking? This cannot be undone.`}
                    >
                      <XCircle /> Cancel booking
                    </ConfirmSubmitButton>
                  </form>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-taupe">{label}</dt>
      <dd className="mt-1 text-foreground">{value}</dd>
    </div>
  );
}
