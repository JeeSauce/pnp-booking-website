import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import type { Profile, UserRole } from "@/types/database";

/** The signed-in user's profile, or null if not authenticated. */
export async function getCurrentProfile(): Promise<Profile | null> {
  // Before Supabase is configured there can be no session; treat as signed out.
  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  return profile ?? null;
}

/**
 * Require an authenticated, active staff profile. Redirects to /login when
 * there is no session, and returns the profile otherwise.
 */
export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/login?error=inactive");
  return profile;
}

/**
 * Require a specific role. Technicians hitting owner-only areas are sent to
 * their own dashboard rather than shown a hard error.
 */
export async function requireRole(role: UserRole): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== role) redirect("/dashboard");
  return profile;
}

export function isOwner(profile: Pick<Profile, "role">): boolean {
  return profile.role === "owner";
}
