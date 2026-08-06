import { describe, it, expect } from "vitest";
import {
  addMinutes,
  fitsWithin,
  intervalsOverlap,
  isoToStoredWeekday,
  manilaDateKey,
  manilaDateTime,
  manilaWeekday,
  toManila,
  toUtcIso,
} from "./time";

describe("timezone helpers (Asia/Manila, UTC+8, no DST)", () => {
  it("parses a UTC timestamp into Manila wall-clock time", () => {
    // 01:00 UTC is 09:00 in Manila (+8).
    const dt = toManila("2026-03-02T01:00:00Z");
    expect(dt.hour).toBe(9);
    expect(dt.zoneName).toBe("Asia/Manila");
  });

  it("keeps the same calendar date when the UTC instant crosses midnight PH-side", () => {
    // 23:00 UTC on Mar 1 is 07:00 Mar 2 in Manila.
    const dt = toManila("2026-03-01T23:00:00Z");
    expect(manilaDateKey(dt)).toBe("2026-03-02");
  });

  it("builds a Manila DateTime from a date + HH:mm and serializes back to UTC", () => {
    const start = manilaDateTime("2026-03-02", "09:00");
    expect(start.hour).toBe(9);
    // 09:00 Manila -> 01:00 UTC
    expect(toUtcIso(start)).toBe("2026-03-02T01:00:00.000Z");
  });

  it("accepts HH:mm:ss times as well", () => {
    const start = manilaDateTime("2026-03-02", "14:30:00");
    expect(start.hour).toBe(14);
    expect(start.minute).toBe(30);
  });

  it("computes the end of a 120-minute appointment", () => {
    const start = manilaDateTime("2026-03-02", "09:00");
    const end = addMinutes(start, 120);
    expect(end.hour).toBe(11);
    expect(end.minute).toBe(0);
  });
});

describe("weekday conversion", () => {
  it("maps ISO weekday (1=Mon..7=Sun) to stored weekday (0=Sun..6=Sat)", () => {
    expect(isoToStoredWeekday(1)).toBe(1); // Monday
    expect(isoToStoredWeekday(7)).toBe(0); // Sunday
    expect(isoToStoredWeekday(6)).toBe(6); // Saturday
  });

  it("returns the ISO weekday of a Manila date", () => {
    // 2026-03-02 is a Monday.
    expect(manilaWeekday("2026-03-02")).toBe(1);
    expect(isoToStoredWeekday(manilaWeekday("2026-03-08"))).toBe(0); // Sunday
  });
});

describe("overlap and containment", () => {
  const at = (t: string) => manilaDateTime("2026-03-02", t);

  it("detects overlapping intervals", () => {
    expect(intervalsOverlap(at("09:00"), at("11:00"), at("10:00"), at("12:00"))).toBe(true);
  });

  it("treats back-to-back intervals as non-overlapping (touching edges allowed)", () => {
    expect(intervalsOverlap(at("09:00"), at("11:00"), at("11:00"), at("13:00"))).toBe(false);
  });

  it("detects a fully contained interval as overlapping", () => {
    expect(intervalsOverlap(at("09:00"), at("13:00"), at("10:00"), at("11:00"))).toBe(true);
  });

  it("confirms a 2h slot fits within working hours", () => {
    expect(fitsWithin(at("09:00"), at("11:00"), at("09:00"), at("19:00"))).toBe(true);
  });

  it("rejects a slot that runs past working hours", () => {
    expect(fitsWithin(at("18:00"), at("20:00"), at("09:00"), at("19:00"))).toBe(false);
  });
});
