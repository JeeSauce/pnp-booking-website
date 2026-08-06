import { z } from "zod";
import { dateSchema, optionalText, uuidSchema } from "@/lib/validation/shared";

export const serviceSelectionSchema = z.object({ service_id: uuidSchema });

export const technicianSelectionSchema = serviceSelectionSchema.extend({
  technician_id: uuidSchema,
});

export const dateAndSlotSchema = technicianSelectionSchema.extend({
  date: dateSchema,
  starts_at: z.iso.datetime({ offset: true, error: "Choose a valid appointment time." }),
});

export const clientDetailsSchema = z.object({
  client_name: z.string().trim().min(2, "Full name is required.").max(120),
  client_phone: z
    .string()
    .trim()
    .min(7, "Enter a valid mobile number.")
    .max(30, "Mobile number is too long."),
  client_email: z.email("Enter a valid email address.").transform((value) => value.toLowerCase()),
  client_notes: optionalText(1000),
});

export const policyAcceptanceSchema = z.object({
  policy_accepted: z.literal(true, "Accept the no-cancellation policy to continue."),
});

export const referencePhotoSchema = z
  .custom<File>(
    (value) => typeof File !== "undefined" && value instanceof File,
    "Choose a valid reference photo.",
  )
  .refine((file) => file.size > 0, "Choose a valid reference photo.")
  .refine((file) => file.size <= 5 * 1024 * 1024, "Reference photo must be 5 MB or smaller.")
  .refine(
    (file) => ["image/png", "image/jpeg", "image/webp"].includes(file.type),
    "Upload a PNG, JPEG, or WebP image.",
  );

export const bookingSubmissionSchema = dateAndSlotSchema
  .extend(clientDetailsSchema.shape)
  .extend(policyAcceptanceSchema.shape)
  .extend({ reference_photo: referencePhotoSchema.optional() });

export const availabilityRequestSchema = z.object({
  service_id: uuidSchema,
  technician_id: uuidSchema,
  date: dateSchema,
});

export const bookingCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^PNP-[A-F0-9]{6}$/, "Invalid booking code.");

export const availableSlotSchema = z.object({
  start: z.iso.datetime({ offset: true }),
  end: z.iso.datetime({ offset: true }),
  label: z.string(),
});

export const availabilityResponseSchema = z.object({
  slots: z.array(availableSlotSchema),
  durationMinutes: z.number().int().positive(),
  timezone: z.literal("Asia/Manila"),
});

export type BookingSubmission = z.infer<typeof bookingSubmissionSchema>;
export type AvailabilityRequest = z.infer<typeof availabilityRequestSchema>;
