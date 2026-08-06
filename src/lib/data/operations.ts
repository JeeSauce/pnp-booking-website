import "server-only";

import { DateTime } from "luxon";
import { nowInManila } from "@/lib/availability/time";
import { BOOKING_DEFAULTS, TIMEZONE } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { BookingStatus, PaymentStatus, Profile } from "@/types/database";

export type StaffTechnicianOption = { id: string; name: string; active: boolean };

export type StaffBooking = {
  id: string;
  bookingCode: string;
  serviceId: string;
  serviceName: string;
  technicianId: string;
  technicianName: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientNotes: string | null;
  referencePhotoPath: string | null;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  price: number;
  durationMinutes: number;
  policyAcceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BookingFilters = {
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  dateFrom?: string;
  dateTo?: string;
  technicianId?: string;
  limit?: number;
};

export type StaffBookingDetail = StaffBooking & {
  referencePhotoUrl: string | null;
  assignedTechnicians: StaffTechnicianOption[];
  minimumDate: string;
  maximumDate: string;
};

const BOOKING_COLUMNS =
  "id,booking_code,service_id,technician_id,client_name,client_email,client_phone,client_notes,reference_photo_path,starts_at,ends_at,status,payment_status,price_snapshot,duration_snapshot,policy_accepted_at,created_at,updated_at" as const;

function dayStart(date: string): string | null {
  return DateTime.fromISO(date, { zone: TIMEZONE }).startOf("day").toUTC().toISO();
}

function dayAfter(date: string): string | null {
  return DateTime.fromISO(date, { zone: TIMEZONE })
    .plus({ days: 1 })
    .startOf("day")
    .toUTC()
    .toISO();
}

export async function getStaffTechnicians(profile: Pick<Profile, "id" | "role">) {
  const supabase = await createClient();
  const query = supabase.from("profiles").select("id,full_name,active").order("full_name");
  const { data, error } =
    profile.role === "owner"
      ? await query.eq("role", "technician")
      : await query.eq("id", profile.id);
  if (error) throw new Error("Technicians could not be loaded.");
  return (data ?? []).map((technician) => ({
    id: technician.id,
    name: technician.full_name,
    active: technician.active,
  }));
}

export async function getStaffBookings(
  profile: Pick<Profile, "id" | "role">,
  filters: BookingFilters = {},
): Promise<StaffBooking[]> {
  const supabase = await createClient();
  let query = supabase
    .from("bookings")
    .select(BOOKING_COLUMNS)
    .order("starts_at", { ascending: true })
    .limit(Math.min(filters.limit ?? 200, 500));

  if (profile.role !== "owner") query = query.eq("technician_id", profile.id);
  else if (filters.technicianId) query = query.eq("technician_id", filters.technicianId);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.paymentStatus) query = query.eq("payment_status", filters.paymentStatus);
  const from = filters.dateFrom ? dayStart(filters.dateFrom) : null;
  const to = filters.dateTo ? dayAfter(filters.dateTo) : null;
  if (from) query = query.gte("starts_at", from);
  if (to) query = query.lt("starts_at", to);

  const { data: rows, error } = await query;
  if (error) throw new Error("Bookings could not be loaded.");
  if (!rows?.length) return [];

  const admin = createAdminClient();
  const serviceIds = [...new Set(rows.map((booking) => booking.service_id))];
  const technicianIds = [...new Set(rows.map((booking) => booking.technician_id))];
  const [servicesResult, techniciansResult] = await Promise.all([
    admin.from("services").select("id,name").in("id", serviceIds),
    admin.from("profiles").select("id,full_name").in("id", technicianIds),
  ]);
  if (servicesResult.error || techniciansResult.error) {
    throw new Error("Booking details could not be loaded.");
  }
  const serviceNames = new Map((servicesResult.data ?? []).map((row) => [row.id, row.name]));
  const technicianNames = new Map(
    (techniciansResult.data ?? []).map((row) => [row.id, row.full_name]),
  );

  return rows.map((booking) => ({
    id: booking.id,
    bookingCode: booking.booking_code,
    serviceId: booking.service_id,
    serviceName: serviceNames.get(booking.service_id) ?? "Service",
    technicianId: booking.technician_id,
    technicianName: technicianNames.get(booking.technician_id) ?? "Technician",
    clientName: booking.client_name,
    clientEmail: booking.client_email,
    clientPhone: booking.client_phone,
    clientNotes: booking.client_notes,
    referencePhotoPath: booking.reference_photo_path,
    startsAt: booking.starts_at,
    endsAt: booking.ends_at,
    status: booking.status,
    paymentStatus: booking.payment_status,
    price: Number(booking.price_snapshot),
    durationMinutes: booking.duration_snapshot,
    policyAcceptedAt: booking.policy_accepted_at,
    createdAt: booking.created_at,
    updatedAt: booking.updated_at,
  }));
}

export async function getStaffBookingDetail(
  profile: Pick<Profile, "id" | "role">,
  bookingId: string,
): Promise<StaffBookingDetail | null> {
  const supabase = await createClient();
  let query = supabase.from("bookings").select(BOOKING_COLUMNS).eq("id", bookingId);
  if (profile.role !== "owner") query = query.eq("technician_id", profile.id);
  const { data: booking, error } = await query.maybeSingle();
  if (error || !booking) return null;

  const admin = createAdminClient();
  const [serviceResult, technicianResult, assignmentsResult, settingsResult] = await Promise.all([
    admin.from("services").select("id,name").eq("id", booking.service_id).maybeSingle(),
    admin.from("profiles").select("id,full_name").eq("id", booking.technician_id).maybeSingle(),
    admin.from("technician_services").select("technician_id").eq("service_id", booking.service_id),
    admin
      .from("business_settings")
      .select("minimum_notice_minutes,booking_window_weeks")
      .limit(1)
      .maybeSingle(),
  ]);
  if (
    serviceResult.error ||
    technicianResult.error ||
    assignmentsResult.error ||
    settingsResult.error
  ) {
    throw new Error("Booking details could not be loaded.");
  }

  const assignedIds = (assignmentsResult.data ?? []).map((row) => row.technician_id);
  const assignedResult =
    profile.role === "owner" && assignedIds.length
      ? await admin
          .from("profiles")
          .select("id,full_name,active")
          .in("id", assignedIds)
          .eq("role", "technician")
          .order("full_name")
      : { data: [], error: null };
  if (assignedResult.error) throw new Error("Assigned technicians could not be loaded.");

  let referencePhotoUrl: string | null = null;
  if (booking.reference_photo_path) {
    const { data: signedPhoto, error: signedPhotoError } = await admin.storage
      .from("reference-photos")
      .createSignedUrl(booking.reference_photo_path, 120);
    if (!signedPhotoError) referencePhotoUrl = signedPhoto.signedUrl;
  }

  const settings = settingsResult.data;
  const now = nowInManila();
  return {
    id: booking.id,
    bookingCode: booking.booking_code,
    serviceId: booking.service_id,
    serviceName: serviceResult.data?.name ?? "Service",
    technicianId: booking.technician_id,
    technicianName: technicianResult.data?.full_name ?? "Technician",
    clientName: booking.client_name,
    clientEmail: booking.client_email,
    clientPhone: booking.client_phone,
    clientNotes: booking.client_notes,
    referencePhotoPath: booking.reference_photo_path,
    referencePhotoUrl,
    startsAt: booking.starts_at,
    endsAt: booking.ends_at,
    status: booking.status,
    paymentStatus: booking.payment_status,
    price: Number(booking.price_snapshot),
    durationMinutes: booking.duration_snapshot,
    policyAcceptedAt: booking.policy_accepted_at,
    createdAt: booking.created_at,
    updatedAt: booking.updated_at,
    assignedTechnicians: (assignedResult.data ?? []).map((technician) => ({
      id: technician.id,
      name: technician.full_name,
      active: technician.active,
    })),
    minimumDate: now
      .plus({ minutes: settings?.minimum_notice_minutes ?? BOOKING_DEFAULTS.minimumNoticeMinutes })
      .toFormat("yyyy-MM-dd"),
    maximumDate: now
      .plus({ weeks: settings?.booking_window_weeks ?? BOOKING_DEFAULTS.bookingWindowWeeks })
      .toFormat("yyyy-MM-dd"),
  };
}
