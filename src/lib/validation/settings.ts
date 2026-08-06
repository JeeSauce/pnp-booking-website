import { z } from "zod";
import { TIMEZONE } from "@/lib/constants";
import { optionalText, uuidSchema } from "@/lib/validation/shared";

export const businessSettingsSchema = z.object({
  id: uuidSchema,
  business_name: z.string().trim().min(2, "Business name is required.").max(120),
  timezone: z.literal(TIMEZONE),
  address: optionalText(500),
  facebook_url: z
    .union([z.literal(""), z.url("Enter a valid Facebook URL.")])
    .transform((value) => value || null),
  maribank_account_name: optionalText(150),
  payment_amount_note: optionalText(500),
  minimum_notice_minutes: z.coerce.number().int().min(0).max(10080),
  booking_window_weeks: z.coerce.number().int().min(1).max(52),
  slot_interval_minutes: z.coerce.number().int().min(5).max(240),
  default_buffer_minutes: z.coerce.number().int().min(0).max(240),
  cancellation_policy: optionalText(2000),
  notification_email: z
    .union([z.literal(""), z.email("Enter a valid notification email.")])
    .transform((value) => value || null),
});

export const qrUploadSchema = z.object({
  settings_id: uuidSchema,
  image: z
    .custom<File>((value) => value instanceof File, "Choose a QR image.")
    .refine((file) => file.size > 0, "Choose a QR image.")
    .refine((file) => file.size <= 5 * 1024 * 1024, "QR image must be 5 MB or smaller.")
    .refine(
      (file) => ["image/png", "image/jpeg", "image/webp"].includes(file.type),
      "Upload a PNG, JPEG, or WebP image.",
    ),
});
