"use server";

import { revalidatePath } from "next/cache";
import { requireProfile, requireRole } from "@/lib/auth/session";
import { redirectWithMessage } from "@/lib/actions/redirect";
import {
  cancelBookingByAdmin,
  rescheduleBookingByAdmin,
  retryCalendarSync,
  setBookingOutcome,
  updateBookingPayment,
  type BookingOperationResult,
} from "@/lib/bookings/operations";
import { firstZodError } from "@/lib/validation/shared";
import {
  bookingIdentitySchema,
  outcomeOperationSchema,
  paymentOperationSchema,
  rescheduleOperationSchema,
} from "@/lib/validation/operations";

function detailPath(bookingId: string) {
  return `/dashboard/bookings/${bookingId}`;
}

function finish(bookingId: string, result: BookingOperationResult, success: string): never {
  const path = detailPath(bookingId);
  if (!result.ok) redirectWithMessage(path, "error", result.message);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/payments");
  revalidatePath(path);
  redirectWithMessage(path, "success", success);
}

export async function updatePaymentAction(formData: FormData): Promise<void> {
  const profile = await requireRole("owner");
  const parsed = paymentOperationSchema.safeParse({
    booking_id: formData.get("booking_id"),
    payment_status: formData.get("payment_status"),
  });
  if (!parsed.success) {
    const fallback = bookingIdentitySchema.safeParse({ booking_id: formData.get("booking_id") });
    redirectWithMessage(
      fallback.success ? detailPath(fallback.data.booking_id) : "/dashboard/payments",
      "error",
      firstZodError(parsed.error),
    );
  }
  const result = await updateBookingPayment(parsed.data, profile);
  finish(
    parsed.data.booking_id,
    result,
    parsed.data.payment_status === "verified" ? "Payment verified." : "Payment waived.",
  );
}

export async function setOutcomeAction(formData: FormData): Promise<void> {
  const profile = await requireProfile();
  const parsed = outcomeOperationSchema.safeParse({
    booking_id: formData.get("booking_id"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    const fallback = bookingIdentitySchema.safeParse({ booking_id: formData.get("booking_id") });
    redirectWithMessage(
      fallback.success ? detailPath(fallback.data.booking_id) : "/dashboard/bookings",
      "error",
      firstZodError(parsed.error),
    );
  }
  const result = await setBookingOutcome(parsed.data, profile);
  finish(
    parsed.data.booking_id,
    result,
    parsed.data.status === "completed" ? "Booking marked completed." : "Booking marked no-show.",
  );
}

export async function cancelBookingAction(formData: FormData): Promise<void> {
  const profile = await requireRole("owner");
  const parsed = bookingIdentitySchema.safeParse({ booking_id: formData.get("booking_id") });
  if (!parsed.success) {
    redirectWithMessage("/dashboard/bookings", "error", firstZodError(parsed.error));
  }
  const result = await cancelBookingByAdmin(parsed.data.booking_id, profile);
  finish(parsed.data.booking_id, result, "Booking cancelled. The slot is available again.");
}

export async function rescheduleBookingAction(formData: FormData): Promise<void> {
  const profile = await requireRole("owner");
  const parsed = rescheduleOperationSchema.safeParse({
    booking_id: formData.get("booking_id"),
    technician_id: formData.get("technician_id"),
    date: formData.get("date"),
    starts_at: formData.get("starts_at"),
  });
  if (!parsed.success) {
    const fallback = bookingIdentitySchema.safeParse({ booking_id: formData.get("booking_id") });
    redirectWithMessage(
      fallback.success ? detailPath(fallback.data.booking_id) : "/dashboard/bookings",
      "error",
      firstZodError(parsed.error),
    );
  }
  const result = await rescheduleBookingByAdmin(parsed.data, profile);
  finish(parsed.data.booking_id, result, "Booking rescheduled.");
}
export async function retryCalendarSyncAction(formData: FormData): Promise<void> {
  const profile = await requireRole("owner");
  const parsed = bookingIdentitySchema.safeParse({ booking_id: formData.get("booking_id") });
  if (!parsed.success) {
    redirectWithMessage("/dashboard/bookings", "error", firstZodError(parsed.error));
  }
  const result = await retryCalendarSync(parsed.data.booking_id, profile);
  finish(parsed.data.booking_id, result, "Google Calendar sync completed.");
}
