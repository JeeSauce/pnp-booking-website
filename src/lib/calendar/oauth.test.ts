import { describe, expect, it } from "vitest";
import { signState, verifyState } from "@/lib/calendar/oauth";

const TEST_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
const TECHNICIAN_ID = "10000000-0000-4000-8000-000000000001";
const NOW = Date.parse("2026-08-11T00:00:00.000Z");

describe("Google OAuth state", () => {
  it("accepts a valid signed state", () => {
    const state = signState(TECHNICIAN_ID, {
      now: NOW,
      nonce: "fixed-test-nonce-value",
      encodedKey: TEST_KEY,
    });

    expect(verifyState(state, { now: NOW + 60_000, encodedKey: TEST_KEY })).toMatchObject({
      technicianId: TECHNICIAN_ID,
      nonce: "fixed-test-nonce-value",
    });
  });

  it("rejects tampered and expired state", () => {
    const state = signState(TECHNICIAN_ID, {
      now: NOW,
      nonce: "fixed-test-nonce-value",
      encodedKey: TEST_KEY,
    });
    const replacement = state.endsWith("a") ? "b" : "a";
    const tampered = state.slice(0, -1) + replacement;

    expect(verifyState(tampered, { now: NOW, encodedKey: TEST_KEY })).toBeNull();
    expect(
      verifyState(state, {
        now: NOW + 11 * 60_000,
        encodedKey: TEST_KEY,
      }),
    ).toBeNull();
  });
});
