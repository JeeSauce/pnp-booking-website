"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { redirectWithMessage } from "@/lib/actions/redirect";
import { createClient } from "@/lib/supabase/server";
import { firstZodError } from "@/lib/validation/shared";
import { businessSettingsSchema, qrUploadSchema } from "@/lib/validation/settings";

const PATH = "/dashboard/settings";

export async function updateBusinessSettings(formData: FormData): Promise<void> {
  await requireRole("owner");
  const parsed = businessSettingsSchema.safeParse({
    id: formData.get("id"),
    business_name: formData.get("business_name"),
    timezone: formData.get("timezone"),
    address: formData.get("address") ?? "",
    facebook_url: formData.get("facebook_url") ?? "",
    maribank_account_name: formData.get("maribank_account_name") ?? "",
    payment_amount_note: formData.get("payment_amount_note") ?? "",
    minimum_notice_minutes: formData.get("minimum_notice_minutes"),
    booking_window_weeks: formData.get("booking_window_weeks"),
    slot_interval_minutes: formData.get("slot_interval_minutes"),
    default_buffer_minutes: formData.get("default_buffer_minutes"),
    cancellation_policy: formData.get("cancellation_policy") ?? "",
    notification_email: formData.get("notification_email") ?? "",
  });
  if (!parsed.success) redirectWithMessage(PATH, "error", firstZodError(parsed.error));

  const { id, ...values } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("business_settings").update(values).eq("id", id);
  if (error) redirectWithMessage(PATH, "error", "Business settings could not be saved.");

  revalidatePath(PATH);
  revalidatePath("/");
  redirectWithMessage(PATH, "success", "Business settings saved.");
}

export async function uploadMariBankQr(formData: FormData): Promise<void> {
  await requireRole("owner");
  const parsed = qrUploadSchema.safeParse({
    settings_id: formData.get("settings_id"),
    image: formData.get("image"),
  });
  if (!parsed.success) redirectWithMessage(PATH, "error", firstZodError(parsed.error));

  const extensionByType: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
  };
  const extension = extensionByType[parsed.data.image.type];
  if (!extension) redirectWithMessage(PATH, "error", "Unsupported QR image type.");

  const path = "maribank/qr-" + crypto.randomUUID() + "." + extension;
  const bytes = await parsed.data.image.arrayBuffer();
  const supabase = await createClient();
  const { error: uploadError } = await supabase.storage
    .from("business-assets")
    .upload(path, bytes, {
      contentType: parsed.data.image.type,
      cacheControl: "3600",
      upsert: false,
    });
  if (uploadError) redirectWithMessage(PATH, "error", "QR image could not be uploaded.");

  const { error: updateError } = await supabase
    .from("business_settings")
    .update({ maribank_qr_path: path })
    .eq("id", parsed.data.settings_id);
  if (updateError) {
    redirectWithMessage(PATH, "error", "QR uploaded, but the business setting needs review.");
  }

  revalidatePath(PATH);
  redirectWithMessage(PATH, "success", "MariBank QR uploaded.");
}
