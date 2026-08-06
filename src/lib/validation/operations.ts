import { z } from "zod";
import { dateSchema, uuidSchema } from "@/lib/validation/shared";

export const bookingIdentitySchema = z.object({ booking_id: uuidSchema });

export const paymentOperationSchema = bookingIdentitySchema.extend({
  payment_status: z.enum(["verified", "waived"], "Choose a valid payment status."),
});

export const outcomeOperationSchema = bookingIdentitySchema.extend({
  status: z.enum(["completed", "no_show"], "Choose a valid booking outcome."),
});

export const rescheduleOperationSchema = bookingIdentitySchema.extend({
  technician_id: uuidSchema,
  date: dateSchema,
  starts_at: z.iso.datetime({ offset: true, error: "Choose an available appointment time." }),
});

export const rescheduleAvailabilitySchema = z.object({
  booking_id: uuidSchema,
  technician_id: uuidSchema,
  date: dateSchema,
});

export type PaymentOperation = z.infer<typeof paymentOperationSchema>;
export type OutcomeOperation = z.infer<typeof outcomeOperationSchema>;
export type RescheduleOperation = z.infer<typeof rescheduleOperationSchema>;
