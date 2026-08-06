import type { Metadata } from "next";
import Link from "next/link";
import { DateTime } from "luxon";
import { ChevronLeft, ChevronRight, UserRound } from "lucide-react";
import { requireProfile, isOwner } from "@/lib/auth/session";
import { nowInManila } from "@/lib/availability/time";
import { TIMEZONE } from "@/lib/constants";
import { getStaffBookings, getStaffTechnicians } from "@/lib/data/operations";
import { uuidSchema } from "@/lib/validation/shared";
import { PageHeader } from "@/components/dashboard/page-header";
import { BookingStatusBadge } from "@/components/dashboard/booking-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export const metadata: Metadata = { title: "Calendar" };

type PageProps = {
  searchParams: Promise<{ date?: string; view?: string; technician?: string }>;
};

export default async function CalendarPage({ searchParams }: PageProps) {
  const profile = await requireProfile();
  const owner = isOwner(profile);
  const params = await searchParams;
  const requestedDate = params.date
    ? DateTime.fromISO(params.date, { zone: TIMEZONE }).startOf("day")
    : nowInManila().startOf("day");
  const anchor = requestedDate.isValid ? requestedDate : nowInManila().startOf("day");
  const view = params.view === "week" ? "week" : "day";
  const rangeStart = view === "week" ? anchor.startOf("week") : anchor;
  const rangeEnd = view === "week" ? rangeStart.plus({ days: 6 }) : rangeStart;
  const technicianId =
    owner && uuidSchema.safeParse(params.technician).success ? params.technician : undefined;

  const [bookings, technicians] = await Promise.all([
    getStaffBookings(profile, {
      dateFrom: rangeStart.toFormat("yyyy-MM-dd"),
      dateTo: rangeEnd.toFormat("yyyy-MM-dd"),
      technicianId,
    }),
    getStaffTechnicians(profile),
  ]);
  const days = Array.from({ length: view === "week" ? 7 : 1 }, (_, index) =>
    rangeStart.plus({ days: index }),
  );
  const step = view === "week" ? 7 : 1;

  function calendarHref(date: DateTime, nextView = view) {
    const query = new URLSearchParams({ date: date.toFormat("yyyy-MM-dd"), view: nextView });
    if (technicianId) query.set("technician", technicianId);
    return `/dashboard/calendar?${query}`;
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={owner ? "Studio operations" : "My schedule"}
        title={owner ? "Calendar" : "My calendar"}
        description="A read-only view of appointments in Asia/Manila. Open any booking to see its details and permitted actions."
      />

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="icon" aria-label="Previous period">
              <Link href={calendarHref(rangeStart.minus({ days: step }))}>
                <ChevronLeft />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={calendarHref(nowInManila().startOf("day"))}>Today</Link>
            </Button>
            <Button asChild variant="outline" size="icon" aria-label="Next period">
              <Link href={calendarHref(rangeStart.plus({ days: step }))}>
                <ChevronRight />
              </Link>
            </Button>
            <div className="ml-1 flex rounded-md border border-border p-1">
              <Button asChild size="sm" variant={view === "day" ? "soft" : "ghost"}>
                <Link href={calendarHref(anchor, "day")}>Day</Link>
              </Button>
              <Button asChild size="sm" variant={view === "week" ? "soft" : "ghost"}>
                <Link href={calendarHref(anchor, "week")}>Week</Link>
              </Button>
            </div>
          </div>

          {owner ? (
            <form method="get" className="flex min-w-64 flex-col gap-2 sm:flex-row sm:items-end">
              <input type="hidden" name="date" value={anchor.toFormat("yyyy-MM-dd")} />
              <input type="hidden" name="view" value={view} />
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="calendar-technician">Technician</Label>
                <Select
                  id="calendar-technician"
                  name="technician"
                  defaultValue={technicianId ?? ""}
                >
                  <option value="">All technicians</option>
                  {technicians.map((technician) => (
                    <option key={technician.id} value={technician.id}>
                      {technician.name}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit" variant="outline">
                View
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>

      <div className={view === "week" ? "grid gap-4 xl:grid-cols-2" : "flex flex-col gap-4"}>
        {days.map((day) => {
          const key = day.toFormat("yyyy-MM-dd");
          const dayBookings = bookings.filter(
            (booking) =>
              DateTime.fromISO(booking.startsAt, { setZone: true })
                .setZone(TIMEZONE)
                .toFormat("yyyy-MM-dd") === key,
          );
          return (
            <Card key={key}>
              <CardHeader className="border-b border-border">
                <CardTitle className="text-lg">
                  {day.toFormat(view === "week" ? "cccc, LLL d" : "cccc, LLLL d, yyyy")}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {dayBookings.length} appointment{dayBookings.length === 1 ? "" : "s"}
                </p>
              </CardHeader>
              <CardContent className="p-4">
                {dayBookings.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No appointments.</p>
                ) : (
                  <ol className="flex flex-col gap-3">
                    {dayBookings.map((booking) => (
                      <li key={booking.id}>
                        <Link
                          href={`/dashboard/bookings/${booking.id}`}
                          className="block rounded-lg border border-border p-4 transition-colors hover:border-primary/40 hover:bg-secondary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-primary">
                                {DateTime.fromISO(booking.startsAt, { setZone: true })
                                  .setZone(TIMEZONE)
                                  .toFormat("h:mm a")}{" "}
                                <span className="font-normal text-muted-foreground">
                                  · {booking.clientName}
                                </span>
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {booking.serviceName}
                              </p>
                              {owner ? (
                                <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-taupe">
                                  <UserRound className="h-3.5 w-3.5" /> {booking.technicianName}
                                </p>
                              ) : null}
                            </div>
                            <BookingStatusBadge status={booking.status} />
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
