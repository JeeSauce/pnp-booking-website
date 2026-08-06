import { loadBookingAvailability } from "@/lib/bookings/availability";
import { availabilityRequestSchema } from "@/lib/validation/booking";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const parsed = availabilityRequestSchema.safeParse({
    service_id: searchParams.get("serviceId"),
    technician_id: searchParams.get("technicianId"),
    date: searchParams.get("date"),
  });

  if (!parsed.success) {
    return Response.json(
      { error: "Choose a valid service, technician, and date." },
      { status: 400 },
    );
  }

  const result = await loadBookingAvailability(parsed.data);
  if (!result.ok) {
    const status = result.reason === "not_found" ? 404 : 503;
    const message =
      result.reason === "not_found"
        ? "That service or technician is unavailable."
        : "Available times could not be loaded.";
    return Response.json({ error: message }, { status });
  }

  return Response.json(
    {
      slots: result.value.slots,
      durationMinutes: result.value.service.durationMinutes,
      timezone: "Asia/Manila",
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
}
