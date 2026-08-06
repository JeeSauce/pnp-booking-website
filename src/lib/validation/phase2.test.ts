import { describe, expect, it } from "vitest";
import {
  availabilityOverrideSchema,
  availabilityRuleSchema,
  timeWindowsOverlap,
} from "./availability";
import { blockedPeriodSchema } from "./blocked-periods";
import { serviceSchema } from "./services";
import { businessSettingsSchema } from "./settings";
import { createTechnicianSchema } from "./team";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("Phase 2 validation", () => {
  it("accepts an editable 120-minute service", () => {
    const result = serviceSchema.safeParse({
      name: "Gel Manicure",
      description: "",
      preparation_instructions: "",
      duration_minutes: "120",
      price: "850",
      active: true,
      sort_order: "1",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.duration_minutes).toBe(120);
      expect(result.data.description).toBeNull();
    }
  });

  it("rejects an invalid service duration and price", () => {
    const result = serviceSchema.safeParse({
      name: "Gel",
      description: "",
      preparation_instructions: "",
      duration_minutes: "0",
      price: "-1",
      active: true,
      sort_order: "1",
    });
    expect(result.success).toBe(false);
  });

  it("validates technician email and temporary password", () => {
    expect(
      createTechnicianSchema.safeParse({
        full_name: "Nail Tech",
        email: "not-an-email",
        password: "short",
      }).success,
    ).toBe(false);
  });

  it("rejects recurring hours whose end is not later", () => {
    expect(
      availabilityRuleSchema.safeParse({
        technician_id: UUID,
        weekday: "1",
        start_time: "17:00",
        end_time: "09:00",
      }).success,
    ).toBe(false);
  });

  it("detects overlapping weekly windows but not touching edges", () => {
    expect(timeWindowsOverlap("09:00", "13:00", "12:00", "17:00")).toBe(true);
    expect(timeWindowsOverlap("09:00", "13:00", "13:00", "17:00")).toBe(false);
  });

  it("requires a valid window for an available override", () => {
    expect(
      availabilityOverrideSchema.safeParse({
        technician_id: UUID,
        date: "2026-08-10",
        is_available: true,
        start_time: "",
        end_time: "",
        reason: "",
      }).success,
    ).toBe(false);
  });

  it("allows an unavailable all-day override without times", () => {
    expect(
      availabilityOverrideSchema.safeParse({
        technician_id: UUID,
        date: "2026-08-10",
        is_available: false,
        start_time: "",
        end_time: "",
        reason: "Leave",
      }).success,
    ).toBe(true);
  });

  it("validates full-day and partial blocked periods", () => {
    expect(
      blockedPeriodSchema.safeParse({
        technician_id: UUID,
        block_type: "full_day",
        date: "2026-08-10",
        starts_at_local: "",
        ends_at_local: "",
        reason: "",
      }).success,
    ).toBe(true);
    expect(
      blockedPeriodSchema.safeParse({
        technician_id: UUID,
        block_type: "partial",
        date: "",
        starts_at_local: "2026-08-10T12:00",
        ends_at_local: "2026-08-10T10:00",
        reason: "",
      }).success,
    ).toBe(false);
  });

  it("accepts the fixed Manila timezone and booking limits", () => {
    expect(
      businessSettingsSchema.safeParse({
        id: UUID,
        business_name: "Poin't & Polish",
        timezone: "Asia/Manila",
        address: "",
        facebook_url: "https://facebook.com/pointandpolish",
        maribank_account_name: "",
        payment_amount_note: "",
        minimum_notice_minutes: "120",
        booking_window_weeks: "4",
        slot_interval_minutes: "30",
        default_buffer_minutes: "0",
        cancellation_policy: "",
        notification_email: "bookings@example.com",
      }).success,
    ).toBe(true);
  });

  it("rejects a non-Manila timezone", () => {
    const result = businessSettingsSchema.safeParse({
      id: UUID,
      business_name: "Poin't & Polish",
      timezone: "UTC",
      address: "",
      facebook_url: "",
      maribank_account_name: "",
      payment_amount_note: "",
      minimum_notice_minutes: "120",
      booking_window_weeks: "4",
      slot_interval_minutes: "30",
      default_buffer_minutes: "0",
      cancellation_policy: "",
      notification_email: "",
    });
    expect(result.success).toBe(false);
  });
});
