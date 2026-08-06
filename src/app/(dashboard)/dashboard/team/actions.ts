"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { redirectWithMessage } from "@/lib/actions/redirect";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { firstZodError } from "@/lib/validation/shared";
import { createTechnicianSchema, updateTechnicianSchema } from "@/lib/validation/team";

const PATH = "/dashboard/team";

export async function createTechnician(formData: FormData): Promise<void> {
  await requireRole("owner");
  const parsed = createTechnicianSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirectWithMessage(PATH, "error", firstZodError(parsed.error));

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  });
  if (error || !data.user) {
    const message = error?.message.toLowerCase().includes("already")
      ? "A staff account already uses that email."
      : "Technician account could not be created.";
    redirectWithMessage(PATH, "error", message);
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ full_name: parsed.data.full_name, role: "technician", active: true })
    .eq("id", data.user.id);
  if (profileError) {
    redirectWithMessage(
      PATH,
      "error",
      "The Auth user was created, but the staff profile needs review.",
    );
  }

  revalidatePath(PATH);
  redirectWithMessage(PATH, "success", "Technician account created.");
}

export async function updateTechnician(formData: FormData): Promise<void> {
  await requireRole("owner");
  const parsed = updateTechnicianSchema.safeParse({
    id: formData.get("id"),
    full_name: formData.get("full_name"),
    active: formData.get("active") === "true",
    service_ids: formData.getAll("service_ids"),
  });
  if (!parsed.success) redirectWithMessage(PATH, "error", firstZodError(parsed.error));

  const supabase = await createClient();
  const { data: technician, error: technicianError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", parsed.data.id)
    .eq("role", "technician")
    .single();
  if (technicianError || !technician) {
    redirectWithMessage(PATH, "error", "Technician was not found.");
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.full_name, active: parsed.data.active })
    .eq("id", parsed.data.id)
    .eq("role", "technician");
  if (profileError) redirectWithMessage(PATH, "error", "Technician details could not be saved.");

  const { error: deleteError } = await supabase
    .from("technician_services")
    .delete()
    .eq("technician_id", parsed.data.id);
  if (deleteError) redirectWithMessage(PATH, "error", "Service assignments could not be saved.");

  if (parsed.data.service_ids.length > 0) {
    const { error: assignmentError } = await supabase.from("technician_services").insert(
      parsed.data.service_ids.map((serviceId) => ({
        technician_id: parsed.data.id,
        service_id: serviceId,
      })),
    );
    if (assignmentError) {
      redirectWithMessage(PATH, "error", "Service assignments could not be saved.");
    }
  }

  revalidatePath(PATH);
  redirectWithMessage(PATH, "success", "Technician updated.");
}
