import "server-only";

import { DateTime } from "luxon";
import { loadBookingAvailability } from "@/lib/bookings/availability";
import {
  syncBookingCancelled,
  syncBookingCreated,
  syncBookingRescheduled,
} from "@/lib/calendar/sync";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/types/database";
import type {
  OutcomeOperation,
  PaymentOperation,
  RescheduleOperation,
} from "@/lib/validation/operations";

type AdminClient = ReturnType<typeof createAdminClient>;
type OperationActor = Pick<Profile, "id" | "role">;

type OperationDependencies = {
  admin?: AdminClient;
  now?: string;
};

export type BookingOperationResult =
  | { ok: true }
  | {
      ok: false;
      kind: "unauthorized" | "not_found" | "invalid_state" | "conflict" | "error";
      message: string;
    };

const NOT_FOUND: BookingOperationResult = {
  ok: false,
  kind: "not_found",
  message: "Booking was not found.",
};

function ownerOnly(actor: OperationActor): BookingOperationResult | null {
  return actor.role === "owner"
    ? null
    : { ok: false, kind: "unauthorized", message: "Only the owner can do that." };
}

function normalizeInstant(value: string): string | null {
  return DateTime.fromISO(value, { setZone: true }).toUTC().toISO();
}

export async function updateBookingPayment(
  input: PaymentOperation,
  actor: OperationActor,
  dependencies: OperationDependencies = {},
): Promise<BookingOperationResult> {
  const denied = ownerOnly(actor);
  if (denied) return denied;
  const admin = dependencies.admin ?? createAdminClient();
  const { data: booking, error: loadError } = await admin
    .from("bookings")
    .select("id,payment_status")
    .eq("id", input.booking_id)
    .maybeSingle();
  if (loadError) return { ok: false, kind: "error", message: "Payment could not be updated." };
  if (!booking) return NOT_FOUND;
  if (booking.payment_status !== "unverified") {
    return {
      ok: false,
      kind: "invalid_state",
      message: "Only an unverified payment can be verified or waived.",
    };
  }

  const { data, error } = await admin
    .from("bookings")
    .update({ payment_status: input.payment_status })
    .eq("id", input.booking_id)
    .eq("payment_status", "unverified")
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, kind: "error", message: "Payment could not be updated." };
  if (!data) {
    return {
      ok: false,
      kind: "invalid_state",
      message: "Payment status changed. Refresh and try again.",
    };
  }
  return { ok: true };
}

export async function setBookingOutcome(
  input: OutcomeOperation,
  actor: OperationActor,
  dependencies: OperationDependencies = {},
): Promise<BookingOperationResult> {
  const admin = dependencies.admin ?? createAdminClient();
  const { data: booking, error: loadError } = await admin
    .from("bookings")
    .select("id,technician_id,status")
    .eq("id", input.booking_id)
    .maybeSingle();
  if (loadError) return { ok: false, kind: "error", message: "Booking could not be updated." };
  if (!booking) return NOT_FOUND;
  if (actor.role !== "owner" && booking.technician_id !== actor.id) {
    return { ok: false, kind: "unauthorized", message: "You can only update your own booking." };
  }
  if (booking.status !== "confirmed") {
    return {
      ok: false,
      kind: "invalid_state",
      message: "Only a confirmed booking can be completed or marked no-show.",
    };
  }

  const { data, error } = await admin
    .from("bookings")
    .update({ status: input.status })
    .eq("id", input.booking_id)
    .eq("status", "confirmed")
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, kind: "error", message: "Booking could not be updated." };
  if (!data) {
    return {
      ok: false,
      kind: "invalid_state",
      message: "Booking status changed. Refresh and try again.",
    };
  }
  return { ok: true };
}

export async function cancelBookingByAdmin(
  bookingId: string,
  actor: OperationActor,
  dependencies: OperationDependencies = {},
): Promise<BookingOperationResult> {
  const denied = ownerOnly(actor);
  if (denied) return denied;
  const admin = dependencies.admin ?? createAdminClient();
  const { data: booking, error: loadError } = await admin
    .from("bookings")
    .select("id,status")
    .eq("id", bookingId)
    .maybeSingle();
  if (loadError) return { ok: false, kind: "error", message: "Booking could not be cancelled." };
  if (!booking) return NOT_FOUND;
  if (booking.status !== "confirmed") {
    return {
      ok: false,
      kind: "invalid_state",
      message: "Only a confirmed booking can be cancelled.",
    };
  }

  const { data, error } = await admin
    .from("bookings")
    .update({ status: "cancelled_by_admin" })
    .eq("id", bookingId)
    .eq("status", "confirmed")
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, kind: "error", message: "Booking could not be cancelled." };
  if (!data) {
    return {
      ok: false,
      kind: "invalid_state",
      message: "Booking status changed. Refresh and try again.",
    };
  }
  await syncBookingCancelled(data.id, { admin });
  return { ok: true };
}

export async function rescheduleBookingByAdmin(
  input: RescheduleOperation,
  actor: OperationActor,
  dependencies: OperationDependencies = {},
): Promise<BookingOperationResult> {
  const denied = ownerOnly(actor);
  if (denied) return denied;
  const admin = dependencies.admin ?? createAdminClient();
  const { data: booking, error: loadError } = await admin
    .from("bookings")
    .select("id,service_id,technician_id,status,duration_snapshot,google_event_id")
    .eq("id", input.booking_id)
    .maybeSingle();
  if (loadError) return { ok: false, kind: "error", message: "Booking could not be rescheduled." };
  if (!booking) return NOT_FOUND;
  if (booking.status !== "confirmed") {
    return {
      ok: false,
      kind: "invalid_state",
      message: "Only a confirmed booking can be rescheduled.",
    };
  }

  const availability = await loadBookingAvailability(
    { service_id: booking.service_id, technician_id: input.technician_id, date: input.date },
    {
      admin,
      now: dependencies.now,
      excludeBookingId: booking.id,
      durationMinutes: booking.duration_snapshot,
    },
  );
  if (!availability.ok) {
    return availability.reason === "not_found"
      ? {
          ok: false,
          kind: "conflict",
          message: "That technician is not available for this service.",
        }
      : { ok: false, kind: "error", message: "Availability could not be checked. Try again." };
  }

  const requestedStart = normalizeInstant(input.starts_at);
  const selectedSlot = availability.value.slots.find((slot) => slot.start === requestedStart);
  if (!selectedSlot) {
    return {
      ok: false,
      kind: "conflict",
      message: "That slot was just taken. Choose another time.",
    };
  }

  const { data, error } = await admin
    .from("bookings")
    .update({
      technician_id: input.technician_id,
      starts_at: selectedSlot.start,
      ends_at: selectedSlot.end,
    })
    .eq("id", input.booking_id)
    .eq("status", "confirmed")
    .select("id")
    .maybeSingle();
  if (error?.code === "23P01") {
    return {
      ok: false,
      kind: "conflict",
      message: "That slot was just taken. Choose another time.",
    };
  }
  if (error) return { ok: false, kind: "error", message: "Booking could not be rescheduled." };
  if (!data) {
    return {
      ok: false,
      kind: "invalid_state",
      message: "Booking status changed. Refresh and try again.",
    };
  }
  await syncBookingRescheduled(data.id, {
    admin,
    previousTechnicianId: booking.technician_id,
    previousGoogleEventId: booking.google_event_id,
  });
  return { ok: true };
}

export async function retryCalendarSync(
  bookingId: string,
  actor: OperationActor,
  dependencies: OperationDependencies = {},
): Promise<BookingOperationResult> {
  const denied = ownerOnly(actor);
  if (denied) return denied;
  const admin = dependencies.admin ?? createAdminClient();
  const { data: booking, error } = await admin
    .from("bookings")
    .select("id,status,google_event_id,calendar_sync_status")
    .eq("id", bookingId)
    .maybeSingle();
  if (error) return { ok: false, kind: "error", message: "Calendar sync could not be retried." };
  if (!booking) return NOT_FOUND;
  if (booking.calendar_sync_status !== "failed") {
    return {
      ok: false,
      kind: "invalid_state",
      message: "This booking does not have a failed calendar sync.",
    };
  }

  const result =
    booking.status === "cancelled_by_admin"
      ? await syncBookingCancelled(booking.id, { admin })
      : booking.google_event_id
        ? await syncBookingRescheduled(booking.id, { admin })
        : await syncBookingCreated(booking.id, { admin });

  if (result.status === "synced") return { ok: true };
  if (result.status === "not_connected") {
    return {
      ok: false,
      kind: "invalid_state",
      message: "The assigned technician must connect Google Calendar first.",
    };
  }
  return { ok: false, kind: "error", message: "Google Calendar sync failed again." };
}
