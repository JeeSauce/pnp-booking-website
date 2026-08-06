import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/env";
import { nowInManila } from "@/lib/availability/time";
import { BOOKING_DEFAULTS } from "@/lib/constants";

export type BookingTechnicianOption = {
  id: string;
  name: string;
};

export type BookingServiceOption = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  technicians: BookingTechnicianOption[];
};

export type BookingCatalog = {
  services: BookingServiceOption[];
  cancellationPolicy: string;
  minimumDate: string;
  maximumDate: string;
  configured: boolean;
};

const DEFAULT_POLICY =
  "Appointments are reserved instantly and cannot be cancelled or rescheduled online. Contact the studio for any changes.";

function dateLimits(settings?: { minimum_notice_minutes: number; booking_window_weeks: number }) {
  const now = nowInManila();
  return {
    minimumDate: now
      .plus({ minutes: settings?.minimum_notice_minutes ?? BOOKING_DEFAULTS.minimumNoticeMinutes })
      .toFormat("yyyy-MM-dd"),
    maximumDate: now
      .plus({ weeks: settings?.booking_window_weeks ?? BOOKING_DEFAULTS.bookingWindowWeeks })
      .toFormat("yyyy-MM-dd"),
  };
}

function unavailableCatalog(): BookingCatalog {
  return {
    services: [],
    cancellationPolicy: DEFAULT_POLICY,
    configured: false,
    ...dateLimits(),
  };
}

/** Public-safe booking choices. Raw schedules and private staff fields never leave the server. */
export async function getBookingCatalog(): Promise<BookingCatalog> {
  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) {
    return unavailableCatalog();
  }

  try {
    const admin = createAdminClient();
    const [servicesResult, assignmentsResult, settingsResult] = await Promise.all([
      admin
        .from("services")
        .select("id,name,description,duration_minutes,price,sort_order")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      admin.from("technician_services").select("service_id,technician_id"),
      admin
        .from("business_settings")
        .select("cancellation_policy,minimum_notice_minutes,booking_window_weeks")
        .limit(1)
        .maybeSingle(),
    ]);

    if (servicesResult.error || assignmentsResult.error || settingsResult.error) {
      return unavailableCatalog();
    }

    const technicianIds = [
      ...new Set((assignmentsResult.data ?? []).map((assignment) => assignment.technician_id)),
    ];
    const techniciansResult = technicianIds.length
      ? await admin
          .from("profiles")
          .select("id,full_name")
          .in("id", technicianIds)
          .eq("role", "technician")
          .eq("active", true)
      : { data: [], error: null };

    if (techniciansResult.error) {
      return unavailableCatalog();
    }

    const technicianById = new Map(
      (techniciansResult.data ?? []).map((technician) => [
        technician.id,
        { id: technician.id, name: technician.full_name },
      ]),
    );
    const technicianIdsByService = new Map<string, string[]>();
    for (const assignment of assignmentsResult.data ?? []) {
      const assigned = technicianIdsByService.get(assignment.service_id) ?? [];
      assigned.push(assignment.technician_id);
      technicianIdsByService.set(assignment.service_id, assigned);
    }

    return {
      services: (servicesResult.data ?? []).map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description ?? "",
        durationMinutes: service.duration_minutes,
        price: Number(service.price),
        technicians: (technicianIdsByService.get(service.id) ?? [])
          .map((id) => technicianById.get(id))
          .filter((technician): technician is BookingTechnicianOption => Boolean(technician))
          .sort((a, b) => a.name.localeCompare(b.name)),
      })),
      cancellationPolicy: settingsResult.data?.cancellation_policy ?? DEFAULT_POLICY,
      configured: true,
      ...dateLimits(settingsResult.data ?? undefined),
    };
  } catch {
    return unavailableCatalog();
  }
}

export type BookingConfirmation = {
  bookingCode: string;
  startsAt: string;
  endsAt: string;
  status: "confirmed" | "completed" | "cancelled_by_admin" | "no_show";
  paymentStatus: "unverified" | "verified" | "waived" | "refunded";
  price: number;
  serviceName: string;
  technicianName: string;
  businessName: string;
  maribankAccountName: string | null;
  maribankQrUrl: string | null;
  facebookUrl: string | null;
  paymentNote: string | null;
};

/** Safe, non-PII confirmation details addressed by the random booking code. */
export async function getBookingConfirmation(code: string): Promise<BookingConfirmation | null> {
  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) return null;

  try {
    const admin = createAdminClient();
    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .select(
        "booking_code,service_id,technician_id,starts_at,ends_at,status,payment_status,price_snapshot",
      )
      .eq("booking_code", code)
      .maybeSingle();
    if (bookingError || !booking) return null;

    const [serviceResult, technicianResult, settingsResult] = await Promise.all([
      admin.from("services").select("name").eq("id", booking.service_id).maybeSingle(),
      admin.from("profiles").select("full_name").eq("id", booking.technician_id).maybeSingle(),
      admin
        .from("business_settings")
        .select(
          "business_name,maribank_account_name,maribank_qr_path,facebook_url,payment_amount_note",
        )
        .limit(1)
        .maybeSingle(),
    ]);
    if (
      serviceResult.error ||
      technicianResult.error ||
      settingsResult.error ||
      !serviceResult.data ||
      !technicianResult.data ||
      !settingsResult.data
    ) {
      return null;
    }

    const qrPath = settingsResult.data.maribank_qr_path;
    const qrUrl = qrPath
      ? admin.storage.from("business-assets").getPublicUrl(qrPath).data.publicUrl
      : null;

    return {
      bookingCode: booking.booking_code,
      startsAt: booking.starts_at,
      endsAt: booking.ends_at,
      status: booking.status,
      paymentStatus: booking.payment_status,
      price: Number(booking.price_snapshot),
      serviceName: serviceResult.data.name,
      technicianName: technicianResult.data.full_name,
      businessName: settingsResult.data.business_name,
      maribankAccountName: settingsResult.data.maribank_account_name,
      maribankQrUrl: qrUrl,
      facebookUrl: settingsResult.data.facebook_url,
      paymentNote: settingsResult.data.payment_amount_note,
    };
  } catch {
    return null;
  }
}
