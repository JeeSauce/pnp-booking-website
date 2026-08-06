import { z } from "zod";
import { dateSchema, optionalText, timeSchema, uuidSchema } from "@/lib/validation/shared";

export const availabilityRuleSchema = z
  .object({
    technician_id: uuidSchema,
    weekday: z.coerce.number().int().min(0).max(6),
    start_time: timeSchema,
    end_time: timeSchema,
  })
  .refine((value) => value.end_time > value.start_time, {
    message: "End time must be later than start time.",
    path: ["end_time"],
  });

export const availabilityOverrideSchema = z
  .object({
    technician_id: uuidSchema,
    date: dateSchema,
    is_available: z.boolean(),
    start_time: z.string(),
    end_time: z.string(),
    reason: optionalText(300),
  })
  .superRefine((value, context) => {
    if (!value.is_available) return;
    const start = timeSchema.safeParse(value.start_time);
    const end = timeSchema.safeParse(value.end_time);
    if (!start.success) {
      context.addIssue({
        code: "custom",
        path: ["start_time"],
        message: "Start time is required.",
      });
    }
    if (!end.success) {
      context.addIssue({ code: "custom", path: ["end_time"], message: "End time is required." });
    }
    if (start.success && end.success && end.data <= start.data) {
      context.addIssue({
        code: "custom",
        path: ["end_time"],
        message: "End time must be later than start time.",
      });
    }
  });

export const scheduleRecordIdSchema = z.object({ id: uuidSchema });

export function timeWindowsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  return startA < endB && endA > startB;
}
