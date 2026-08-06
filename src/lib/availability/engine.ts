import { ACTIVE_BOOKING_STATUSES, TIMEZONE } from "@/lib/constants";
import {
  DateTime,
  addMinutes,
  fitsWithin,
  intervalsOverlap,
  isoToStoredWeekday,
  manilaDateTime,
  manilaWeekday,
  toManila,
  toUtcIso,
} from "@/lib/availability/time";

export type AvailabilityRule = {
  weekday: number;
  startTime: string;
  endTime: string;
  active?: boolean;
};

export type AvailabilityOverride = {
  date: string;
  isAvailable: boolean;
  startTime?: string | null;
  endTime?: string | null;
};

export type BusyInterval = {
  start: string;
  end: string;
};

export type ExistingBooking = BusyInterval & {
  status: "confirmed" | "completed" | "cancelled_by_admin" | "no_show";
};

export type AvailabilityEngineInput = {
  date: string;
  now: string;
  weeklyRules: AvailabilityRule[];
  dateOverrides: AvailabilityOverride[];
  blockedIntervals: BusyInterval[];
  existingBookings: ExistingBooking[];
  busyIntervals?: BusyInterval[];
  durationMinutes: number;
  bufferMinutes: number;
  minimumNoticeMinutes: number;
  bookingWindowWeeks: number;
  slotIntervalMinutes: number;
};

export type AvailableSlot = {
  start: string;
  end: string;
  label: string;
};

type ManilaInterval = {
  start: DateTime;
  end: DateTime;
};

function parseInterval(interval: BusyInterval): ManilaInterval | null {
  const start = toManila(interval.start);
  const end = toManila(interval.end);

  if (!start.isValid || !end.isValid || end <= start) return null;
  return { start, end };
}

function workingWindows(input: AvailabilityEngineInput): ManilaInterval[] {
  const override = input.dateOverrides.find((item) => item.date === input.date);

  if (override) {
    if (!override.isAvailable || !override.startTime || !override.endTime) return [];
    return [
      {
        start: manilaDateTime(input.date, override.startTime),
        end: manilaDateTime(input.date, override.endTime),
      },
    ];
  }

  const weekday = isoToStoredWeekday(manilaWeekday(input.date));
  return input.weeklyRules
    .filter((rule) => rule.weekday === weekday && rule.active !== false)
    .map((rule) => ({
      start: manilaDateTime(input.date, rule.startTime),
      end: manilaDateTime(input.date, rule.endTime),
    }))
    .filter(({ start, end }) => start.isValid && end.isValid && end > start)
    .sort((a, b) => a.start.toMillis() - b.start.toMillis());
}

/**
 * Computes available appointment starts using Manila wall-clock rules.
 *
 * The function is deliberately pure: callers inject the current instant and
 * every blocking interval. `end` is the client-facing appointment end; the
 * configured buffer is enforced after it as unavailable technician time.
 */
export function computeAvailableSlots(input: AvailabilityEngineInput): AvailableSlot[] {
  if (
    input.durationMinutes <= 0 ||
    input.bufferMinutes < 0 ||
    input.minimumNoticeMinutes < 0 ||
    input.bookingWindowWeeks <= 0 ||
    input.slotIntervalMinutes <= 0
  ) {
    return [];
  }

  const now = toManila(input.now);
  const requestedDay = DateTime.fromISO(input.date, { zone: TIMEZONE });
  if (!now.isValid || !requestedDay.isValid) return [];

  const earliestStart = addMinutes(now, input.minimumNoticeMinutes);
  const bookingWindowEnd = now.plus({ weeks: input.bookingWindowWeeks });
  const blockers = [...input.blockedIntervals, ...(input.busyIntervals ?? [])]
    .map(parseInterval)
    .filter((interval): interval is ManilaInterval => interval !== null);

  const activeBookings = input.existingBookings
    .filter((booking) => ACTIVE_BOOKING_STATUSES.includes(booking.status))
    .map(parseInterval)
    .filter((interval): interval is ManilaInterval => interval !== null)
    .map((interval) => ({
      start: interval.start,
      end: addMinutes(interval.end, input.bufferMinutes),
    }));

  const slots = new Map<string, AvailableSlot>();

  for (const window of workingWindows(input)) {
    for (
      let start = window.start;
      start < window.end;
      start = addMinutes(start, input.slotIntervalMinutes)
    ) {
      const end = addMinutes(start, input.durationMinutes);
      const occupiedEnd = addMinutes(end, input.bufferMinutes);

      if (!fitsWithin(start, occupiedEnd, window.start, window.end)) continue;
      if (start < earliestStart || occupiedEnd > bookingWindowEnd) continue;

      const overlapsBlocker = [...blockers, ...activeBookings].some((blocked) =>
        intervalsOverlap(start, occupiedEnd, blocked.start, blocked.end),
      );
      if (overlapsBlocker) continue;

      const startIso = toUtcIso(start);
      slots.set(startIso, {
        start: startIso,
        end: toUtcIso(end),
        label: start.toFormat("h:mm a"),
      });
    }
  }

  return [...slots.values()].sort((a, b) => a.start.localeCompare(b.start));
}
