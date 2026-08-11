"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/session";
import { deleteConnection } from "@/lib/calendar/connections";
import { redirectWithMessage } from "@/lib/actions/redirect";

const CONNECTION_PATH = "/dashboard/calendar-connections";

export async function disconnectCalendarAction(): Promise<void> {
  const profile = await requireProfile();
  try {
    await deleteConnection(profile.id);
  } catch {
    redirectWithMessage(CONNECTION_PATH, "error", "Google Calendar could not be disconnected.");
  }
  revalidatePath(CONNECTION_PATH);
  redirectWithMessage(CONNECTION_PATH, "success", "Google Calendar disconnected.");
}
