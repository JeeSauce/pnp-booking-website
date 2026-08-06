"use server";

import { revalidatePath } from "next/cache";
import { requireProfile, isOwner } from "@/lib/auth/session";
import { redirectWithMessage } from "@/lib/actions/redirect";
import { createClient } from "@/lib/supabase/server";
import { firstZodError } from "@/lib/validation/shared";
import {
  availabilityOverrideSchema,
  availabilityRuleSchema,
  scheduleRecordIdSchema,
  timeWindowsOverlap,
} from "@/lib/validation/availability";

const PATH = "/dashboard/availability";

function technicianPath(technicianId: string): string {
  return PATH + "?technician=" + encodeURIComponent(technicianId);
}

async function authorizeTechnician(technicianId: string) {
  const profile = await requireProfile();
  if (!isOwner(profile) && technicianId !== profile.id) {
    redirectWithMessage(PATH, "error", "You can only manage your own availability.");
  }
  return profile;
}

export async function createAvailabilityRule(formData: FormData): Promise<void> {
  const parsed = availabilityRuleSchema.safeParse({
    technician_id: formData.get("technician_id"),
    weekday: formData.get("weekday"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
  });
  if (!parsed.success) redirectWithMessage(PATH, "error", firstZodError(parsed.error));
  await authorizeTechnician(parsed.data.technician_id);

  const targetPath = technicianPath(parsed.data.technician_id);
  const supabase = await createClient();
  const { data: existing, error: loadError } = await supabase
    .from("availability_rules")
    .select("start_time,end_time")
    .eq("technician_id", parsed.data.technician_id)
    .eq("weekday", parsed.data.weekday)
    .eq("active", true);
  if (loadError) redirectWithMessage(targetPath, "error", "Working hours could not be checked.");

  const overlaps = existing.some((rule) =>
    timeWindowsOverlap(
      parsed.data.start_time,
      parsed.data.end_time,
      rule.start_time.slice(0, 5),
      rule.end_time.slice(0, 5),
    ),
  );
  if (overlaps) {
    redirectWithMessage(targetPath, "error", "That working period overlaps an existing period.");
  }

  const { error } = await supabase.from("availability_rules").insert(parsed.data);
  if (error) redirectWithMessage(targetPath, "error", "Working hours could not be added.");

  revalidatePath(PATH);
  redirectWithMessage(targetPath, "success", "Working hours added.");
}

export async function deleteAvailabilityRule(formData: FormData): Promise<void> {
  const parsed = scheduleRecordIdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) redirectWithMessage(PATH, "error", firstZodError(parsed.error));

  const profile = await requireProfile();
  const supabase = await createClient();
  let query = supabase.from("availability_rules").select("technician_id").eq("id", parsed.data.id);
  if (!isOwner(profile)) query = query.eq("technician_id", profile.id);
  const { data, error: loadError } = await query.single();
  if (loadError || !data) redirectWithMessage(PATH, "error", "Working period was not found.");

  const { error } = await supabase.from("availability_rules").delete().eq("id", parsed.data.id);
  if (error) redirectWithMessage(PATH, "error", "Working period could not be removed.");

  const targetPath = technicianPath(data.technician_id);
  revalidatePath(PATH);
  redirectWithMessage(targetPath, "success", "Working period removed.");
}

export async function createAvailabilityOverride(formData: FormData): Promise<void> {
  const parsed = availabilityOverrideSchema.safeParse({
    technician_id: formData.get("technician_id"),
    date: formData.get("date"),
    is_available: formData.get("is_available") === "true",
    start_time: formData.get("start_time") ?? "",
    end_time: formData.get("end_time") ?? "",
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) redirectWithMessage(PATH, "error", firstZodError(parsed.error));
  await authorizeTechnician(parsed.data.technician_id);

  const targetPath = technicianPath(parsed.data.technician_id);
  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("availability_overrides")
    .select("id", { count: "exact", head: true })
    .eq("technician_id", parsed.data.technician_id)
    .eq("date", parsed.data.date);
  if (countError) redirectWithMessage(targetPath, "error", "Date override could not be checked.");
  if ((count ?? 0) > 0) {
    redirectWithMessage(targetPath, "error", "An override already exists for that date.");
  }

  const values = {
    technician_id: parsed.data.technician_id,
    date: parsed.data.date,
    is_available: parsed.data.is_available,
    start_time: parsed.data.is_available ? parsed.data.start_time : null,
    end_time: parsed.data.is_available ? parsed.data.end_time : null,
    reason: parsed.data.reason,
  };
  const { error } = await supabase.from("availability_overrides").insert(values);
  if (error) redirectWithMessage(targetPath, "error", "Date override could not be added.");

  revalidatePath(PATH);
  redirectWithMessage(targetPath, "success", "Date override added.");
}

export async function deleteAvailabilityOverride(formData: FormData): Promise<void> {
  const parsed = scheduleRecordIdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) redirectWithMessage(PATH, "error", firstZodError(parsed.error));

  const profile = await requireProfile();
  const supabase = await createClient();
  let query = supabase
    .from("availability_overrides")
    .select("technician_id")
    .eq("id", parsed.data.id);
  if (!isOwner(profile)) query = query.eq("technician_id", profile.id);
  const { data, error: loadError } = await query.single();
  if (loadError || !data) redirectWithMessage(PATH, "error", "Date override was not found.");

  const { error } = await supabase.from("availability_overrides").delete().eq("id", parsed.data.id);
  if (error) redirectWithMessage(PATH, "error", "Date override could not be removed.");

  const targetPath = technicianPath(data.technician_id);
  revalidatePath(PATH);
  redirectWithMessage(targetPath, "success", "Date override removed.");
}
