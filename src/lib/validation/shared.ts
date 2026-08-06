import { z } from "zod";

export const uuidSchema = z.string().uuid("Choose a valid record.");
export const timeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Enter a valid time.");
export const dateSchema = z.iso.date("Enter a valid date.");
export const localDateTimeSchema = z.iso.datetime({
  local: true,
  precision: -1,
  error: "Enter a valid date and time.",
});

export function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max, "Use " + max + " characters or fewer.")
    .transform((value) => (value.length ? value : null));
}

export function firstZodError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check the form and try again.";
}
