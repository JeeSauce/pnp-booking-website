"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { redirectWithMessage } from "@/lib/actions/redirect";
import { createClient } from "@/lib/supabase/server";
import { firstZodError } from "@/lib/validation/shared";
import { reorderServiceSchema, serviceIdSchema, serviceSchema } from "@/lib/validation/services";

const PATH = "/dashboard/services";

function serviceInput(formData: FormData) {
  return {
    id: formData.get("id") ?? undefined,
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    preparation_instructions: formData.get("preparation_instructions") ?? "",
    duration_minutes: formData.get("duration_minutes"),
    price: formData.get("price"),
    active: formData.get("active") === "on",
    sort_order: formData.get("sort_order"),
  };
}

export async function createService(formData: FormData): Promise<void> {
  await requireRole("owner");
  const parsed = serviceSchema.safeParse(serviceInput(formData));
  if (!parsed.success) redirectWithMessage(PATH, "error", firstZodError(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.from("services").insert(parsed.data);
  if (error) redirectWithMessage(PATH, "error", "Service could not be created.");

  revalidatePath(PATH);
  revalidatePath("/");
  redirectWithMessage(PATH, "success", "Service created.");
}

export async function updateService(formData: FormData): Promise<void> {
  await requireRole("owner");
  const parsed = serviceSchema.safeParse(serviceInput(formData));
  if (!parsed.success || !parsed.data.id) {
    redirectWithMessage(
      PATH,
      "error",
      parsed.success ? "Choose a valid service." : firstZodError(parsed.error),
    );
  }

  const { id, ...values } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("services").update(values).eq("id", id);
  if (error) redirectWithMessage(PATH, "error", "Service changes could not be saved.");

  revalidatePath(PATH);
  revalidatePath("/");
  redirectWithMessage(PATH, "success", "Service updated.");
}

export async function toggleService(formData: FormData): Promise<void> {
  await requireRole("owner");
  const parsed = serviceIdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) redirectWithMessage(PATH, "error", firstZodError(parsed.error));

  const supabase = await createClient();
  const { data, error: loadError } = await supabase
    .from("services")
    .select("active")
    .eq("id", parsed.data.id)
    .single();
  if (loadError || !data) redirectWithMessage(PATH, "error", "Service was not found.");

  const { error } = await supabase
    .from("services")
    .update({ active: !data.active })
    .eq("id", parsed.data.id);
  if (error) redirectWithMessage(PATH, "error", "Service status could not be changed.");

  revalidatePath(PATH);
  revalidatePath("/");
  redirectWithMessage(PATH, "success", data.active ? "Service deactivated." : "Service activated.");
}

export async function reorderService(formData: FormData): Promise<void> {
  await requireRole("owner");
  const parsed = reorderServiceSchema.safeParse({
    id: formData.get("id"),
    direction: formData.get("direction"),
  });
  if (!parsed.success) redirectWithMessage(PATH, "error", firstZodError(parsed.error));

  const supabase = await createClient();
  const { data, error: loadError } = await supabase
    .from("services")
    .select("id, sort_order")
    .order("sort_order")
    .order("created_at");
  if (loadError || !data) redirectWithMessage(PATH, "error", "Services could not be reordered.");

  const index = data.findIndex((service) => service.id === parsed.data.id);
  const neighborIndex = parsed.data.direction === "up" ? index - 1 : index + 1;
  if (index < 0 || neighborIndex < 0 || neighborIndex >= data.length) {
    redirectWithMessage(PATH, "error", "Service is already at that edge.");
  }

  const current = data[index];
  const neighbor = data[neighborIndex];
  const currentOrder = current.sort_order;
  const neighborOrder =
    neighbor.sort_order === currentOrder
      ? parsed.data.direction === "up"
        ? currentOrder - 1
        : currentOrder + 1
      : neighbor.sort_order;

  const { error: currentError } = await supabase
    .from("services")
    .update({ sort_order: neighborOrder })
    .eq("id", current.id);
  const { error: neighborError } = await supabase
    .from("services")
    .update({ sort_order: currentOrder })
    .eq("id", neighbor.id);
  if (currentError || neighborError) {
    redirectWithMessage(PATH, "error", "Services could not be reordered.");
  }

  revalidatePath(PATH);
  revalidatePath("/");
  redirectWithMessage(PATH, "success", "Service order updated.");
}
