import "server-only";

import { DateTime } from "luxon";
import {
  computeAvailableSlots,
  type AvailableSlot,
  type BusyInterval,
} from "@/lib/availability/engine";
import { isoToStoredWeekday, manilaWeekday, nowInManila, toUtcIso } from "@/lib/availability/time";
import { ACTIVE_BOOKING_STATUSES, BOOKING_DEFAULTS, TIMEZONE } from "@/lib/constants";
import { getBusyIntervals } from "@/lib/calendar/busy";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AvailabilityRequest } from "@/lib/validation/booking";

type AdminClient = ReturnType<typeof createAdminClient>;

export type BookingAvailability = {
  slots: AvailableSlot[];
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    price: number;
  };
  technician: {
    id: string;
    name: string;
  };
};

export type BookingAvailabilityResult =
  { ok: true; value: BookingAvailability } | { ok: false; reason: "not_found" | "load_failed" };

type AvailabilityDependencies = {
  admin?: AdminClient;
  now?: string;
  busyIntervals?: BusyInterval[];
  /** Ignore the booking being moved while rechecking a reschedule. */
  excludeBookingId?: string;
  /** Preserve the original duration snapshot when moving an existing booking. */
  durationMinutes?: number;
};

/** Loads private schedule inputs server-side and returns only computed slots. */
export async function loadBookingAvailability(
  input: AvailabilityRequest,
  dependencies: AvailabilityDependencies = {},
): Promise<BookingAvailabilityResult> {
  const admin = dependencies.admin ?? createAdminClient();
  const weekday = isoToStoredWeekday(manilaWeekday(input.date));
  const requestedDay = DateTime.fromISO(input.date, { zone: TIMEZONE });
  if (!requestedDay.isValid) return { ok: false, reason: "not_found" };

  const dayStart = toUtcIso(requestedDay.startOf("day"));
  const dayEnd = toUtcIso(requestedDay.plus({ days: 1 }).startOf("day"));

  const googleBusyPromise = dependencies.busyIntervals
    ? Promise.resolve(dependencies.busyIntervals)
    : getBusyIntervals(input.technician_id, { from: dayStart, to: dayEnd }, { admin });

  const [
    serviceResult,
    technicianResult,
    assignmentResult,
    settingsResult,
    rulesResult,
    overrideResult,
    blocksResult,
    bookingsResult,
    googleBusyIntervals,
  ] = await Promise.all([
    admin
      .from("services")
      .select("id,name,duration_minutes,price")
      .eq("id", input.service_id)
      .eq("active", true)
      .maybeSingle(),
    admin
      .from("profiles")
      .select("id,full_name")
      .eq("id", input.technician_id)
      .eq("role", "technician")
      .eq("active", true)
      .maybeSingle(),
    admin
      .from("technician_services")
      .select("technician_id")
      .eq("technician_id", input.technician_id)
      .eq("service_id", input.service_id)
      .maybeSingle(),
    admin
      .from("business_settings")
      .select(
        "minimum_notice_minutes,booking_window_weeks,slot_interval_minutes,default_buffer_minutes",
      )
      .limit(1)
      .maybeSingle(),
    admin
      .from("availability_rules")
      .select("weekday,start_time,end_time,active")
      .eq("technician_id", input.technician_id)
      .eq("weekday", weekday)
      .eq("active", true),
    admin
      .from("availability_overrides")
      .select("date,is_available,start_time,end_time")
      .eq("technician_id", input.technician_id)
      .eq("date", input.date)
      .maybeSingle(),
    admin
      .from("blocked_periods")
      .select("starts_at,ends_at")
      .eq("technician_id", input.technician_id)
      .lt("starts_at", dayEnd)
      .gt("ends_at", dayStart),
    admin
      .from("bookings")
      .select("id,starts_at,ends_at,status")
      .eq("technician_id", input.technician_id)
      .in("status", ACTIVE_BOOKING_STATUSES)
      .lt("starts_at", dayEnd)
      .gt("ends_at", dayStart),
    googleBusyPromise,
  ]);

  const failed = [
    serviceResult,
    technicianResult,
    assignmentResult,
    settingsResult,
    rulesResult,
    overrideResult,
    blocksResult,
    bookingsResult,
  ].some((result) => result.error);
  if (failed) return { ok: false, reason: "load_failed" };

  if (!serviceResult.data || !technicianResult.data || !assignmentResult.data) {
    return { ok: false, reason: "not_found" };
  }

  const settings = settingsResult.data;
  const durationMinutes = dependencies.durationMinutes ?? serviceResult.data.duration_minutes;
  const slots = computeAvailableSlots({
    date: input.date,
    now: dependencies.now ?? toUtcIso(nowInManila()),
    weeklyRules: (rulesResult.data ?? []).map((rule) => ({
      weekday: rule.weekday,
      startTime: rule.start_time,
      endTime: rule.end_time,
      active: rule.active,
    })),
    dateOverrides: overrideResult.data
      ? [
          {
            date: overrideResult.data.date,
            isAvailable: overrideResult.data.is_available,
            startTime: overrideResult.data.start_time,
            endTime: overrideResult.data.end_time,
          },
        ]
      : [],
    blockedIntervals: (blocksResult.data ?? []).map((period) => ({
      start: period.starts_at,
      end: period.ends_at,
    })),
    existingBookings: (bookingsResult.data ?? [])
      .filter((booking) => booking.id !== dependencies.excludeBookingId)
      .map((booking) => ({
        start: booking.starts_at,
        end: booking.ends_at,
        status: booking.status,
      })),
    busyIntervals: googleBusyIntervals,
    durationMinutes,
    bufferMinutes: settings?.default_buffer_minutes ?? BOOKING_DEFAULTS.bufferMinutes,
    minimumNoticeMinutes: settings?.minimum_notice_minutes ?? BOOKING_DEFAULTS.minimumNoticeMinutes,
    bookingWindowWeeks: settings?.booking_window_weeks ?? BOOKING_DEFAULTS.bookingWindowWeeks,
    slotIntervalMinutes: settings?.slot_interval_minutes ?? BOOKING_DEFAULTS.slotIntervalMinutes,
  });

  return {
    ok: true,
    value: {
      slots,
      service: {
        id: serviceResult.data.id,
        name: serviceResult.data.name,
        durationMinutes,
        price: Number(serviceResult.data.price),
      },
      technician: {
        id: technicianResult.data.id,
        name: technicianResult.data.full_name,
      },
    },
  };
}
