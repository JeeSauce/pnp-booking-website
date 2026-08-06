import { getCurrentProfile, isOwner } from "@/lib/auth/session";
import { loadBookingAvailability } from "@/lib/bookings/availability";
import { createAdminClient } from "@/lib/supabase/admin";
import { rescheduleAvailabilitySchema } from "@/lib/validation/operations";

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  if (!profile.active)
    return Response.json({ error: "This account is inactive." }, { status: 403 });
  if (!isOwner(profile))
    return Response.json({ error: "Owner access is required." }, { status: 403 });

  const searchParams = new URL(request.url).searchParams;
  const parsed = rescheduleAvailabilitySchema.safeParse({
    booking_id: searchParams.get("bookingId"),
    technician_id: searchParams.get("technicianId"),
    date: searchParams.get("date"),
  });
  if (!parsed.success) {
    return Response.json({ error: "Choose a valid technician and date." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: booking, error } = await admin
    .from("bookings")
    .select("id,service_id,status,duration_snapshot")
    .eq("id", parsed.data.booking_id)
    .maybeSingle();
  if (error || !booking) return Response.json({ error: "Booking was not found." }, { status: 404 });
  if (booking.status !== "confirmed") {
    return Response.json(
      { error: "Only a confirmed booking can be rescheduled." },
      { status: 409 },
    );
  }

  const result = await loadBookingAvailability(
    {
      service_id: booking.service_id,
      technician_id: parsed.data.technician_id,
      date: parsed.data.date,
    },
    { admin, excludeBookingId: booking.id, durationMinutes: booking.duration_snapshot },
  );
  if (!result.ok) {
    return Response.json(
      {
        error:
          result.reason === "not_found"
            ? "That technician is not available for this service."
            : "Available times could not be loaded.",
      },
      { status: result.reason === "not_found" ? 404 : 503 },
    );
  }

  return Response.json(
    {
      slots: result.value.slots,
      durationMinutes: result.value.service.durationMinutes,
      timezone: "Asia/Manila",
    },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
