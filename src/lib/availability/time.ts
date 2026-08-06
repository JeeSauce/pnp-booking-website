import { DateTime, Interval } from "luxon";
import { TIMEZONE } from "@/lib/constants";

/**
 * Timezone-aware time helpers. Every appointment calculation in the app must go
 * through these so that `Asia/Manila` is applied consistently and never leaks a
 * server-local timezone into availability math.
 */

/** Current moment as a Luxon DateTime in Asia/Manila. */
export function nowInManila(): DateTime {
  return DateTime.now().setZone(TIMEZONE);
}

/** Parse an ISO/UTC timestamp into an Asia/Manila DateTime. */
export function toManila(iso: string): DateTime {
  return DateTime.fromISO(iso, { zone: "utc" }).setZone(TIMEZONE);
}

/**
 * Build an Asia/Manila DateTime from a calendar date (`yyyy-MM-dd`) and a
 * wall-clock time (`HH:mm` or `HH:mm:ss`). Used to resolve availability rules
 * and overrides, which are stored as local dates/times.
 */
export function manilaDateTime(date: string, time: string): DateTime {
  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  return DateTime.fromISO(`${date}T${normalizedTime}`, { zone: TIMEZONE });
}

/** ISO weekday for a date in Manila: 1 = Monday ... 7 = Sunday. */
export function manilaWeekday(date: string): number {
  return DateTime.fromISO(date, { zone: TIMEZONE }).weekday;
}

/**
 * Convert Luxon's ISO weekday (1=Mon..7=Sun) to the app's stored `weekday`
 * column, which uses Postgres/JS convention (0=Sun..6=Sat).
 */
export function isoToStoredWeekday(isoWeekday: number): number {
  return isoWeekday % 7;
}

/** The `yyyy-MM-dd` calendar date of a DateTime, in Manila. */
export function manilaDateKey(dt: DateTime): string {
  return dt.setZone(TIMEZONE).toFormat("yyyy-MM-dd");
}

/** Serialize a Manila DateTime to a UTC ISO string for storage. */
export function toUtcIso(dt: DateTime): string {
  const iso = dt.toUTC().toISO();
  if (!iso) throw new Error("Invalid DateTime — cannot serialize to ISO");
  return iso;
}

/** Add minutes to a DateTime (appointment end from start + duration). */
export function addMinutes(dt: DateTime, minutes: number): DateTime {
  return dt.plus({ minutes });
}

/** True when two [start, end) intervals overlap (touching edges do not count). */
export function intervalsOverlap(
  startA: DateTime,
  endA: DateTime,
  startB: DateTime,
  endB: DateTime,
): boolean {
  const a = Interval.fromDateTimes(startA, endA);
  const b = Interval.fromDateTimes(startB, endB);
  return a.overlaps(b) && a.intersection(b)!.length("minutes") > 0;
}

/** True when [innerStart, innerEnd) fits fully inside [outerStart, outerEnd]. */
export function fitsWithin(
  innerStart: DateTime,
  innerEnd: DateTime,
  outerStart: DateTime,
  outerEnd: DateTime,
): boolean {
  return innerStart >= outerStart && innerEnd <= outerEnd;
}

export { DateTime, Interval };
