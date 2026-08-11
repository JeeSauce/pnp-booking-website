import { requireProfile } from "@/lib/auth/session";
import { createGoogleCalendarClient } from "@/lib/calendar/client";
import { saveConnection } from "@/lib/calendar/connections";
import { verifyState } from "@/lib/calendar/oauth";
import { publicEnv } from "@/lib/env";

function dashboardRedirect(parameters: Record<string, string>): Response {
  const url = new URL("/dashboard/calendar-connections", publicEnv.appUrl);
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
  return Response.redirect(url, 307);
}

export async function GET(request: Request): Promise<Response> {
  const profile = await requireProfile();
  const url = new URL(request.url);
  const oauthError = url.searchParams.get("error");
  if (oauthError) {
    return dashboardRedirect({ error: "Google Calendar connection was cancelled or denied." });
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return dashboardRedirect({ error: "Google Calendar returned an incomplete response." });
  }

  const payload = verifyState(state);
  if (!payload || payload.technicianId !== profile.id) {
    return dashboardRedirect({ error: "Google Calendar connection expired. Please try again." });
  }

  try {
    const client = createGoogleCalendarClient();
    const tokens = await client.exchangeCode(code);
    await saveConnection(profile.id, tokens);
    return dashboardRedirect({ connected: "1" });
  } catch {
    console.warn("Google Calendar OAuth callback failed.");
    return dashboardRedirect({
      error: "Google Calendar could not be connected. Please try again.",
    });
  }
}
