import { DateTime, toManila } from "@/lib/availability/time";
import { TIMEZONE } from "@/lib/constants";
import type { BookingStatus, NotificationType } from "@/types/database";

export type ReminderType = Extract<NotificationType, "reminder_24h" | "reminder_2h">;

export type ReminderCandidateRow = {
  id: string;
  starts_at: string;
  status: BookingStatus;
  notification_log: ReadonlyArray<{
    notification_type: NotificationType;
    status: string;
  }>;
};

export type DueReminder = {
  bookingId: string;
  type: ReminderType;
};

const WINDOWS: ReadonlyArray<{
  type: ReminderType;
  earliestMinutes: number;
  latestMinutes: number;
}> = [
  {
    type: "reminder_24h",
    earliestMinutes: 23 * 60,
    latestMinutes: 25 * 60,
  },
  {
    type: "reminder_2h",
    earliestMinutes: 90,
    latestMinutes: 150,
  },
];

/** Selects reminders due in the Manila-time windows without performing I/O. */
export function selectDueReminders(
  now: DateTime,
  candidates: readonly ReminderCandidateRow[],
): DueReminder[] {
  if (!now.isValid) return [];

  const manilaNow = now.setZone(TIMEZONE);
  const due: DueReminder[] = [];

  for (const booking of candidates) {
    if (booking.status !== "confirmed") continue;

    const startsAt = toManila(booking.starts_at);
    if (!startsAt.isValid) continue;

    const minutesUntilStart = startsAt.diff(manilaNow, "minutes").minutes;
    for (const window of WINDOWS) {
      if (minutesUntilStart < window.earliestMinutes || minutesUntilStart > window.latestMinutes) {
        continue;
      }

      const alreadySent = booking.notification_log.some(
        (entry) => entry.notification_type === window.type && entry.status === "sent",
      );
      if (!alreadySent) due.push({ bookingId: booking.id, type: window.type });
    }
  }

  return due;
}
