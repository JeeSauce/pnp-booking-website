import "server-only";

import {
  createGoogleCalendarClient,
  type BusyInterval,
  type GoogleCalendarClient,
} from "@/lib/calendar/client";
import {
  getValidAccessToken,
  type CalendarConnectionDependencies,
} from "@/lib/calendar/connections";

export type BusyIntervalDependencies = CalendarConnectionDependencies & {
  client?: GoogleCalendarClient;
};

export async function getBusyIntervals(
  technicianId: string,
  range: { from: string; to: string },
  dependencies: BusyIntervalDependencies = {},
): Promise<BusyInterval[]> {
  try {
    const access = await getValidAccessToken(technicianId, dependencies);
    if (!access) return [];
    const client = dependencies.client ?? createGoogleCalendarClient();
    return await client.freeBusy(access.accessToken, access.calendarId, range);
  } catch {
    console.warn("Google Calendar busy read failed; studio availability remains available.");
    return [];
  }
}
