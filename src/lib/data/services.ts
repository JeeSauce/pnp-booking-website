import "server-only";

import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { DEMO_SERVICES, type DemoService } from "@/lib/demo";

/**
 * Active services for public display. Falls back to editable demo services when
 * Supabase is not configured or has no seeded rows yet, so the site renders
 * before the database is connected.
 */
export async function getDisplayServices(): Promise<{
  services: DemoService[];
  isDemo: boolean;
}> {
  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) {
    return { services: DEMO_SERVICES, isDemo: true };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("services")
      .select("name, description, duration_minutes, price")
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) {
      return { services: DEMO_SERVICES, isDemo: true };
    }

    return {
      services: data.map((s) => ({
        name: s.name,
        description: s.description ?? "",
        durationMinutes: s.duration_minutes,
        price: Number(s.price),
      })),
      isDemo: false,
    };
  } catch {
    return { services: DEMO_SERVICES, isDemo: true };
  }
}
