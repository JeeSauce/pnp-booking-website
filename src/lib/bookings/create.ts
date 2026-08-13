import "server-only";

import { DateTime } from "luxon";
import { loadBookingAvailability } from "@/lib/bookings/availability";
import { syncBookingCreated } from "@/lib/calendar/sync";
import { sendBookingEmail } from "@/lib/email/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BookingSubmission } from "@/lib/validation/booking";

type AdminClient = ReturnType<typeof createAdminClient>;

export type CreateBookingResult =
  { ok: true; bookingCode: string } | { ok: false; kind: "conflict" | "error"; message: string };

type CreateBookingDependencies = {
  admin?: AdminClient;
  now?: string;
};

const PHOTO_EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function normalizeInstant(value: string): string | null {
  return DateTime.fromISO(value, { setZone: true }).toUTC().toISO();
}

async function removeUploadedPhoto(admin: AdminClient, path: string | null): Promise<void> {
  if (!path) return;
  await admin.storage.from("reference-photos").remove([path]);
}

/** Rechecks the selected slot and performs the trusted booking write. */
export async function createBooking(
  input: BookingSubmission,
  dependencies: CreateBookingDependencies = {},
): Promise<CreateBookingResult> {
  const admin = dependencies.admin ?? createAdminClient();
  const availability = await loadBookingAvailability(
    {
      service_id: input.service_id,
      technician_id: input.technician_id,
      date: input.date,
    },
    { admin, now: dependencies.now },
  );

  if (!availability.ok) {
    return availability.reason === "not_found"
      ? { ok: false, kind: "conflict", message: "That booking option is no longer available." }
      : { ok: false, kind: "error", message: "Availability could not be checked. Try again." };
  }

  const requestedStart = normalizeInstant(input.starts_at);
  const selectedSlot = availability.value.slots.find((slot) => slot.start === requestedStart);
  if (!selectedSlot) {
    return {
      ok: false,
      kind: "conflict",
      message: "That slot was just taken. Please choose another time.",
    };
  }

  let referencePhotoPath: string | null = null;
  if (input.reference_photo) {
    const extension = PHOTO_EXTENSION[input.reference_photo.type];
    if (!extension) {
      return { ok: false, kind: "error", message: "The reference photo type is not supported." };
    }

    referencePhotoPath = `booking-references/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await admin.storage
      .from("reference-photos")
      .upload(referencePhotoPath, await input.reference_photo.arrayBuffer(), {
        contentType: input.reference_photo.type,
        cacheControl: "3600",
        upsert: false,
      });
    if (uploadError) {
      return { ok: false, kind: "error", message: "The reference photo could not be uploaded." };
    }
  }

  const policyAcceptedAt = dependencies.now ?? DateTime.utc().toISO();
  const { data, error } = await admin
    .from("bookings")
    .insert({
      service_id: availability.value.service.id,
      technician_id: availability.value.technician.id,
      client_name: input.client_name,
      client_email: input.client_email,
      client_phone: input.client_phone,
      client_notes: input.client_notes,
      reference_photo_path: referencePhotoPath,
      starts_at: selectedSlot.start,
      ends_at: selectedSlot.end,
      status: "confirmed",
      payment_status: "unverified",
      price_snapshot: availability.value.service.price,
      duration_snapshot: availability.value.service.durationMinutes,
      policy_accepted_at: policyAcceptedAt,
      calendar_sync_status: "not_connected",
      created_by: null,
    })
    .select("id,booking_code")
    .single();

  if (error || !data) {
    await removeUploadedPhoto(admin, referencePhotoPath);
    if (error?.code === "23P01") {
      return {
        ok: false,
        kind: "conflict",
        message: "That slot was just taken. Please choose another time.",
      };
    }
    return { ok: false, kind: "error", message: "Your booking could not be confirmed." };
  }

  await Promise.all([
    syncBookingCreated(data.id, { admin }),
    sendBookingEmail(data.id, "booking_confirmation", { admin }),
    sendBookingEmail(data.id, "new_booking_admin", { admin }),
  ]);
  return { ok: true, bookingCode: data.booking_code };
}
