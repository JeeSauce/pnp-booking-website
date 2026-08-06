import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/env";

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
  configured: boolean;
};

const DEFAULT_POLICY =
  "Appointments are reserved instantly and cannot be cancelled or rescheduled online. Contact the studio for any changes.";

/** Public-safe booking choices. Raw schedules and private staff fields never leave the server. */
export async function getBookingCatalog(): Promise<BookingCatalog> {
  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) {
    return { services: [], cancellationPolicy: DEFAULT_POLICY, configured: false };
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
      admin.from("business_settings").select("cancellation_policy").limit(1).maybeSingle(),
    ]);

    if (servicesResult.error || assignmentsResult.error || settingsResult.error) {
      return { services: [], cancellationPolicy: DEFAULT_POLICY, configured: false };
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
      return { services: [], cancellationPolicy: DEFAULT_POLICY, configured: false };
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
    };
  } catch {
    return { services: [], cancellationPolicy: DEFAULT_POLICY, configured: false };
  }
}
