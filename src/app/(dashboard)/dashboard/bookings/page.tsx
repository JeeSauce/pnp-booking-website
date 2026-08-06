import type { Metadata } from "next";
import Link from "next/link";
import { Filter } from "lucide-react";
import { requireProfile, isOwner } from "@/lib/auth/session";
import { nowInManila } from "@/lib/availability/time";
import { BOOKING_STATUSES, PAYMENT_STATUSES } from "@/lib/constants";
import { getStaffBookings, getStaffTechnicians } from "@/lib/data/operations";
import { dateSchema, uuidSchema } from "@/lib/validation/shared";
import type { BookingStatus, PaymentStatus } from "@/types/database";
import { PageHeader } from "@/components/dashboard/page-header";
import { ActionNotice } from "@/components/dashboard/action-notice";
import { BookingListItem } from "@/components/dashboard/booking-list-item";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export const metadata: Metadata = { title: "Bookings" };

type PageProps = {
  searchParams: Promise<{
    status?: string;
    payment?: string;
    from?: string;
    to?: string;
    technician?: string;
    success?: string;
    error?: string;
  }>;
};

function bookingStatus(value?: string): BookingStatus | undefined {
  return BOOKING_STATUSES.find((status) => status === value);
}

function paymentStatus(value?: string): PaymentStatus | undefined {
  return PAYMENT_STATUSES.find((status) => status === value);
}

export default async function BookingsPage({ searchParams }: PageProps) {
  const profile = await requireProfile();
  const owner = isOwner(profile);
  const params = await searchParams;
  const today = nowInManila().startOf("day");
  const defaultFrom = today.minus({ days: 7 }).toFormat("yyyy-MM-dd");
  const defaultTo = today.plus({ weeks: 8 }).toFormat("yyyy-MM-dd");
  const dateFrom = dateSchema.safeParse(params.from).success ? params.from : defaultFrom;
  const dateTo = dateSchema.safeParse(params.to).success ? params.to : defaultTo;
  const technicianId =
    owner && uuidSchema.safeParse(params.technician).success ? params.technician : undefined;

  const [bookings, technicians] = await Promise.all([
    getStaffBookings(profile, {
      status: bookingStatus(params.status),
      paymentStatus: paymentStatus(params.payment),
      dateFrom,
      dateTo,
      technicianId,
    }),
    getStaffTechnicians(profile),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={owner ? "Studio operations" : "My schedule"}
        title={owner ? "Bookings" : "My bookings"}
        description="Review appointments, client details, payment state, and booking outcomes. Times are in Asia/Manila."
      />
      <ActionNotice success={params.success} error={params.error} />

      <Card>
        <CardContent className="pt-6">
          <form method="get" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="status">Booking status</Label>
              <Select id="status" name="status" defaultValue={bookingStatus(params.status) ?? ""}>
                <option value="">All statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="no_show">No-show</option>
                <option value="cancelled_by_admin">Cancelled</option>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="payment">Payment</Label>
              <Select
                id="payment"
                name="payment"
                defaultValue={paymentStatus(params.payment) ?? ""}
              >
                <option value="">All payments</option>
                <option value="unverified">Unverified</option>
                <option value="verified">Verified</option>
                <option value="waived">Waived</option>
                <option value="refunded">Refunded</option>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="from">From</Label>
              <Input id="from" name="from" type="date" defaultValue={dateFrom} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="to">To</Label>
              <Input id="to" name="to" type="date" defaultValue={dateTo} />
            </div>
            {owner ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="technician">Technician</Label>
                <Select id="technician" name="technician" defaultValue={technicianId ?? ""}>
                  <option value="">All technicians</option>
                  {technicians.map((technician) => (
                    <option key={technician.id} value={technician.id}>
                      {technician.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            <div className="flex items-end gap-2">
              <Button type="submit" className="flex-1">
                <Filter /> Apply
              </Button>
              <Button asChild variant="outline" size="default">
                <Link href="/dashboard/bookings">Reset</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <section aria-label="Booking results" className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          {bookings.length} booking{bookings.length === 1 ? "" : "s"} in this range
        </p>
        {bookings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No bookings match these filters.
            </CardContent>
          </Card>
        ) : (
          bookings.map((booking) => (
            <BookingListItem key={booking.id} booking={booking} showTechnician={owner} />
          ))
        )}
      </section>
    </div>
  );
}
