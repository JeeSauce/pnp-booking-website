import { z } from "zod";
import { dateSchema, localDateTimeSchema, optionalText, uuidSchema } from "@/lib/validation/shared";

export const blockedPeriodSchema = z
  .object({
    technician_id: uuidSchema,
    block_type: z.enum(["full_day", "partial"]),
    date: z.string(),
    starts_at_local: z.string(),
    ends_at_local: z.string(),
    reason: optionalText(300),
  })
  .superRefine((value, context) => {
    if (value.block_type === "full_day") {
      if (!dateSchema.safeParse(value.date).success) {
        context.addIssue({ code: "custom", path: ["date"], message: "Choose a valid date." });
      }
      return;
    }

    const start = localDateTimeSchema.safeParse(value.starts_at_local);
    const end = localDateTimeSchema.safeParse(value.ends_at_local);
    if (!start.success) {
      context.addIssue({
        code: "custom",
        path: ["starts_at_local"],
        message: "Choose a valid start.",
      });
    }
    if (!end.success) {
      context.addIssue({
        code: "custom",
        path: ["ends_at_local"],
        message: "Choose a valid end.",
      });
    }
    if (start.success && end.success && end.data <= start.data) {
      context.addIssue({
        code: "custom",
        path: ["ends_at_local"],
        message: "End must be later than start.",
      });
    }
  });

export const blockedPeriodIdSchema = z.object({ id: uuidSchema });
