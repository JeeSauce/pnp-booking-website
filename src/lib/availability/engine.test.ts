import { describe, expect, it } from "vitest";
import type { AvailabilityEngineInput } from "./engine";
import { computeAvailableSlots } from "./engine";

const DATE = "2026-03-02";
const MONDAY = 1;

function baseInput(overrides: Partial<AvailabilityEngineInput> = {}): AvailabilityEngineInput {
  return {
    date: DATE,
    now: "2026-03-01T00:00:00.000Z",
    weeklyRules: [{ weekday: MONDAY, startTime: "09:00", endTime: "19:00" }],
    dateOverrides: [],
    blockedIntervals: [],
    existingBookings: [],
    busyIntervals: [],
    durationMinutes: 120,
    bufferMinutes: 0,
    minimumNoticeMinutes: 0,
    bookingWindowWeeks: 4,
    slotIntervalMinutes: 30,
    ...overrides,
  };
}

function labels(input: AvailabilityEngineInput): string[] {
  return computeAvailableSlots(input).map((slot) => slot.label);
}

describe("computeAvailableSlots", () => {
  it("supports multiple working periods and keeps breaks unavailable", () => {
    const result = labels(
      baseInput({
        weeklyRules: [
          { weekday: MONDAY, startTime: "09:00", endTime: "13:00" },
          { weekday: MONDAY, startTime: "14:00", endTime: "19:00" },
        ],
        slotIntervalMinutes: 120,
      }),
    );

    expect(result).toEqual(["9:00 AM", "11:00 AM", "2:00 PM", "4:00 PM"]);
  });

  it("allows an appointment ending exactly at closing but not one running past it", () => {
    expect(
      labels(
        baseInput({
          weeklyRules: [{ weekday: MONDAY, startTime: "09:00", endTime: "11:00" }],
        }),
      ),
    ).toEqual(["9:00 AM"]);
  });

  it("uses a date override instead of the recurring schedule", () => {
    expect(
      labels(
        baseInput({
          dateOverrides: [
            { date: DATE, isAvailable: true, startTime: "12:00", endTime: "16:00" },
          ],
          slotIntervalMinutes: 120,
        }),
      ),
    ).toEqual(["12:00 PM", "2:00 PM"]);

    expect(
      computeAvailableSlots(
        baseInput({ dateOverrides: [{ date: DATE, isAvailable: false }] }),
      ),
    ).toEqual([]);
  });

  it("removes slots that overlap a manual blocked period", () => {
    expect(
      labels(
        baseInput({
          weeklyRules: [{ weekday: MONDAY, startTime: "09:00", endTime: "15:00" }],
          blockedIntervals: [
            { start: "2026-03-02T02:00:00.000Z", end: "2026-03-02T04:00:00.000Z" },
          ],
          slotIntervalMinutes: 60,
        }),
      ),
    ).toEqual(["12:00 PM", "1:00 PM"]);
  });

  it("blocks active bookings but ignores cancelled bookings", () => {
    const active = baseInput({
      weeklyRules: [{ weekday: MONDAY, startTime: "09:00", endTime: "15:00" }],
      existingBookings: [
        {
          start: "2026-03-02T02:00:00.000Z",
          end: "2026-03-02T04:00:00.000Z",
          status: "confirmed",
        },
      ],
      slotIntervalMinutes: 120,
    });
    expect(labels(active)).toEqual(["1:00 PM"]);

    expect(
      labels({
        ...active,
        existingBookings: active.existingBookings.map((booking) => ({
          ...booking,
          status: "cancelled_by_admin" as const,
        })),
      }),
    ).toEqual(["9:00 AM", "11:00 AM", "1:00 PM"]);
  });

  it("accepts injected Google busy intervals without calling an external service", () => {
    expect(
      labels(
        baseInput({
          weeklyRules: [{ weekday: MONDAY, startTime: "09:00", endTime: "14:00" }],
          busyIntervals: [
            { start: "2026-03-02T03:00:00.000Z", end: "2026-03-02T04:00:00.000Z" },
          ],
          slotIntervalMinutes: 60,
        }),
      ),
    ).toEqual(["9:00 AM", "12:00 PM"]);
  });

  it("enforces minimum notice and allows the exact notice boundary", () => {
    expect(
      labels(
        baseInput({
          now: "2026-03-02T01:15:00.000Z", // 9:15 AM Manila
          minimumNoticeMinutes: 120,
          weeklyRules: [{ weekday: MONDAY, startTime: "09:00", endTime: "17:00" }],
        }),
      ),
    ).toEqual([
      "11:30 AM",
      "12:00 PM",
      "12:30 PM",
      "1:00 PM",
      "1:30 PM",
      "2:00 PM",
      "2:30 PM",
      "3:00 PM",
    ]);

    expect(
      labels(
        baseInput({
          now: "2026-03-02T01:00:00.000Z",
          minimumNoticeMinutes: 120,
          weeklyRules: [{ weekday: MONDAY, startTime: "09:00", endTime: "13:00" }],
        }),
      ),
    ).toContain("11:00 AM");
  });

  it("does not emit appointments whose occupied time exceeds the booking window", () => {
    expect(
      labels(
        baseInput({
          now: "2026-02-23T02:00:00.000Z", // 10:00 AM Manila, exactly one week prior
          bookingWindowWeeks: 1,
          weeklyRules: [{ weekday: MONDAY, startTime: "09:00", endTime: "14:00" }],
          slotIntervalMinutes: 60,
        }),
      ),
    ).toEqual([]);
  });

  it("uses the Manila date when the UTC instant is still on the previous day", () => {
    const result = computeAvailableSlots(
      baseInput({
        now: "2026-03-01T16:15:00.000Z", // 12:15 AM Monday in Manila
        minimumNoticeMinutes: 0,
        weeklyRules: [{ weekday: MONDAY, startTime: "00:30", endTime: "03:00" }],
        slotIntervalMinutes: 30,
      }),
    );

    expect(result.map((slot) => slot.label)).toEqual(["12:30 AM", "1:00 AM"]);
    expect(result[0]?.start).toBe("2026-03-01T16:30:00.000Z");
  });

  it("enforces the configured buffer after appointments", () => {
    expect(
      labels(
        baseInput({
          weeklyRules: [{ weekday: MONDAY, startTime: "09:00", endTime: "14:00" }],
          existingBookings: [
            {
              start: "2026-03-02T01:00:00.000Z",
              end: "2026-03-02T03:00:00.000Z",
              status: "confirmed",
            },
          ],
          bufferMinutes: 30,
          slotIntervalMinutes: 30,
        }),
      ),
    ).toEqual(["11:30 AM"]);
  });
});
