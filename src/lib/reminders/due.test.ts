import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { selectDueReminders, type ReminderCandidateRow } from "@/lib/reminders/due";
import { TIMEZONE } from "@/lib/constants";

const NOW = DateTime.fromISO("2026-08-13T09:00:00", { zone: TIMEZONE });

function candidate(
  id: string,
  hoursFromNow: number,
  overrides: Partial<ReminderCandidateRow> = {},
): ReminderCandidateRow {
  return {
    id,
    starts_at: NOW.plus({ hours: hoursFromNow }).toUTC().toISO()!,
    status: "confirmed",
    notification_log: [],
    ...overrides,
  };
}

describe("reminder due selection", () => {
  it("selects the 24-hour reminder for a confirmed booking about 24 hours out", () => {
    expect(selectDueReminders(NOW, [candidate("booking-24", 24)])).toEqual([
      { bookingId: "booking-24", type: "reminder_24h" },
    ]);
  });

  it("selects the 2-hour reminder for a confirmed booking about 2 hours out", () => {
    expect(selectDueReminders(NOW, [candidate("booking-2", 2)])).toEqual([
      { bookingId: "booking-2", type: "reminder_2h" },
    ]);
  });

  it("selects nothing outside both reminder windows", () => {
    expect(
      selectDueReminders(NOW, [candidate("booking-3", 3), candidate("booking-26", 26)]),
    ).toEqual([]);
  });

  it("excludes cancelled and other non-confirmed bookings", () => {
    expect(
      selectDueReminders(NOW, [
        candidate("cancelled", 2, { status: "cancelled_by_admin" }),
        candidate("completed", 24, { status: "completed" }),
      ]),
    ).toEqual([]);
  });

  it("blocks a sent reminder but leaves a failed reminder eligible for retry", () => {
    expect(
      selectDueReminders(NOW, [
        candidate("sent", 24, {
          notification_log: [{ notification_type: "reminder_24h", status: "sent" }],
        }),
        candidate("failed", 2, {
          notification_log: [{ notification_type: "reminder_2h", status: "failed" }],
        }),
      ]),
    ).toEqual([{ bookingId: "failed", type: "reminder_2h" }]);
  });
});
