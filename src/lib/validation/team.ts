import { z } from "zod";
import { uuidSchema } from "@/lib/validation/shared";

export const createTechnicianSchema = z.object({
  full_name: z.string().trim().min(2, "Full name is required.").max(100),
  email: z.email("Enter a valid email address.").transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Temporary password must be at least 8 characters.").max(100),
});

export const updateTechnicianSchema = z.object({
  id: uuidSchema,
  full_name: z.string().trim().min(2, "Full name is required.").max(100),
  active: z.boolean(),
  service_ids: z.array(uuidSchema).max(100),
});
