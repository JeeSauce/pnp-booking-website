import { z } from "zod";
import { DEFAULT_SERVICE_DURATION_MINUTES } from "@/lib/constants";
import { optionalText, uuidSchema } from "@/lib/validation/shared";

export const serviceSchema = z.object({
  id: uuidSchema.optional(),
  name: z.string().trim().min(2, "Service name is required.").max(100),
  description: optionalText(600),
  preparation_instructions: optionalText(1000),
  duration_minutes: z.coerce
    .number()
    .int()
    .min(15, "Duration must be at least 15 minutes.")
    .max(720, "Duration must be 12 hours or less.")
    .default(DEFAULT_SERVICE_DURATION_MINUTES),
  price: z.coerce.number().min(0, "Price cannot be negative.").max(999999.99),
  active: z.boolean(),
  sort_order: z.coerce.number().int().min(0).max(10000),
});

export const serviceIdSchema = z.object({ id: uuidSchema });
export const reorderServiceSchema = z.object({
  id: uuidSchema,
  direction: z.enum(["up", "down"]),
});
