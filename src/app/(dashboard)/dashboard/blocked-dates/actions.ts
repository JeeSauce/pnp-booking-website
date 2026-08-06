"use server";

import { revalidatePath } from "next/cache";
import { DateTime } from "luxon";
import { requireProfile, isOwner } from "@/lib/auth/session";
import { redirectWithMessage } from "@/lib/actions/redirect";
import { TIMEZONE } from "@/lib/constants";
import { toUtcIso } from "@/lib/availability/time";
import { createClient } from "@/lib/supabase/server";
import { blockedPeriodIdSchema, blockedPeriodSchema } from "@/lib/validation/blocked-periods";
import { firstZodError } from "@/lib/validation/shared";

const PATH = "/dashboard/blocked-dates";

function technicianPath(technicianId: string): string {
  return PATH + "?technician=" + encodeURIComponent(technicianId);
}

export async function createBlockedPeriod(formData: FormData): Promise<void> {
  const parsed = blockedPeriodSchema.safeParse({
    technician_id: formData.get("technician_id"),
    block_type: formData.get("block_type"),
    date: formData.get("date") ?? "",
    starts_at_local: formData.get("starts_at_local") ?? "",
    ends_at_local: formData.get("ends_at_local") ?? "",
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) redirectWithMessage(PATH, "error", firstZodError(parsed.error));

  const profile = await requireProfile();
  if (!isOwner(profile) && parsed.data.technician_id !== profile.id) {
    redirectWithMessage(PATH, "error", "You can only manage your own blocked periods.");
  }

  const targetPath = technicianPath(parsed.data.technician_id);
  const startsAt =
    parsed.data.block_type === "full_day"
      ? DateTime.fromISO(parsed.data.date, { zone: TIMEZONE }).startOf("day")
      : DateTime.fromISO(parsed.data.starts_at_local, { zone: TIMEZONE });
  const endsAt =
    parsed.data.block_type === "full_day"
      ? startsAt.plus({ days: 1 })
      : DateTime.fromISO(parsed.data.ends_at_local, { zone: TIMEZONE });
  if (!startsAt.isValid || !endsAt.isValid || endsAt <= startsAt) {
    redirectWithMessage(targetPath, "error", "Choose a valid blocked date or time range.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("blocked_periods").insert({
    technician_id: parsed.data.technician_id,
    starts_at: toUtcIso(startsAt),
    ends_at: toUtcIso(endsAt),
    reason: parsed.data.reason,
    created_by: profile.id,
  });
  if (error) redirectWithMessage(targetPath, "error", "Blocked period could not be added.");

  revalidatePath(PATH);
  redirectWithMessage(targetPath, "success", "Blocked period added.");
}

export async function deleteBlockedPeriod(formData: FormData): Promise<void> {
  const parsed = blockedPeriodIdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) redirectWithMessage(PATH, "error", firstZodError(parsed.error));

  const profile = await requireProfile();
  const supabase = await createClient();
  let query = supabase.from("blocked_periods").select("technician_id").eq("id", parsed.data.id);
  if (!isOwner(profile)) query = query.eq("technician_id", profile.id);
  const { data, error: loadError } = await query.single();
  if (loadError || !data) redirectWithMessage(PATH, "error", "Blocked period was not found.");

  const { error } = await supabase.from("blocked_periods").delete().eq("id", parsed.data.id);
  if (error) redirectWithMessage(PATH, "error", "Blocked period could not be removed.");

  const targetPath = technicianPath(data.technician_id);
  revalidatePath(PATH);
  redirectWithMessage(targetPath, "success", "Blocked period removed.");
}
