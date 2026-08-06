/**
 * Product constants for Poin't & Polish.
 * These encode the non-negotiable product rules from PROJECT_BRIEF.md.
 * Values that an admin can override at runtime live in `business_settings`;
 * the constants here are the system defaults and hard invariants.
 */

/** The one and only operating timezone. All availability math uses this. */
export const TIMEZONE = "Asia/Manila" as const;

/** A standard appointment occupies 120 minutes. */
export const DEFAULT_SERVICE_DURATION_MINUTES = 120;

/** Default admin-configurable booking settings (mirrors business_settings). */
export const BOOKING_DEFAULTS = {
  /** Minutes of buffer padded around each appointment. */
  bufferMinutes: 0,
  /** Interval between offered start times, in minutes. */
  slotIntervalMinutes: 30,
  /** Soonest a client may book from "now". */
  minimumNoticeMinutes: 120,
  /** How far into the future bookings are allowed. */
  bookingWindowWeeks: 4,
} as const;

export const BOOKING_STATUSES = [
  "confirmed",
  "completed",
  "cancelled_by_admin",
  "no_show",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PAYMENT_STATUSES = ["unverified", "verified", "waived", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const USER_ROLES = ["owner", "technician"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const CALENDAR_SYNC_STATUSES = ["pending", "synced", "failed", "not_connected"] as const;
export type CalendarSyncStatus = (typeof CALENDAR_SYNC_STATUSES)[number];

/** Booking statuses that occupy a technician's time (block availability). */
export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ["confirmed", "completed", "no_show"];

/** Notification types tracked in notification_log for idempotent sending. */
export const NOTIFICATION_TYPES = [
  "booking_confirmation",
  "new_booking_admin",
  "reminder_24h",
  "reminder_2h",
  "payment_verified",
  "cancelled_by_admin",
  "rescheduled_by_admin",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
