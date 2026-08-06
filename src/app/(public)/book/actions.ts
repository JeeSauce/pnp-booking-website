"use server";

import { createBooking, type CreateBookingResult } from "@/lib/bookings/create";
import { bookingSubmissionSchema } from "@/lib/validation/booking";
import { firstZodError } from "@/lib/validation/shared";

export async function submitBooking(formData: FormData): Promise<CreateBookingResult> {
  const rawPhoto = formData.get("reference_photo");
  const referencePhoto = rawPhoto instanceof File && rawPhoto.size > 0 ? rawPhoto : undefined;
  const parsed = bookingSubmissionSchema.safeParse({
    service_id: formData.get("service_id"),
    technician_id: formData.get("technician_id"),
    date: formData.get("date"),
    starts_at: formData.get("starts_at"),
    client_name: formData.get("client_name"),
    client_phone: formData.get("client_phone"),
    client_email: formData.get("client_email"),
    client_notes: formData.get("client_notes") ?? "",
    policy_accepted: formData.get("policy_accepted") === "true",
    reference_photo: referencePhoto,
  });

  if (!parsed.success) {
    return {
      ok: false,
      kind: "error",
      message: firstZodError(parsed.error),
    };
  }

  try {
    return await createBooking(parsed.data);
  } catch {
    return {
      ok: false,
      kind: "error",
      message: "Your booking could not be confirmed. Please try again.",
    };
  }
}
