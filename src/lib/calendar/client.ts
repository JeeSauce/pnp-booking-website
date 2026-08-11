import "server-only";

import { z } from "zod";
import { TIMEZONE } from "@/lib/constants";
import { serverEnv } from "@/lib/env";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export type BusyInterval = { start: string; end: string };

export type CalendarRange = {
  from: string;
  to: string;
};

export type EventInput = {
  summary: string;
  description: string;
  start: string;
  end: string;
};

export type OAuthTokenSet = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  scope: string | null;
};

export type RefreshedAccessToken = Omit<OAuthTokenSet, "refreshToken">;

export interface GoogleCalendarClient {
  exchangeCode(code: string): Promise<OAuthTokenSet>;
  refreshAccessToken(refreshToken: string): Promise<RefreshedAccessToken>;
  freeBusy(accessToken: string, calendarId: string, range: CalendarRange): Promise<BusyInterval[]>;
  createEvent(accessToken: string, calendarId: string, event: EventInput): Promise<string>;
  updateEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    event: EventInput,
  ): Promise<void>;
  deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void>;
}

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  expires_in: z.number().positive().optional(),
  scope: z.string().optional(),
});

const freeBusyResponseSchema = z.object({
  calendars: z.record(
    z.string(),
    z.object({
      busy: z.array(z.object({ start: z.string(), end: z.string() })).default([]),
    }),
  ),
});

const eventResponseSchema = z.object({ id: z.string().min(1) });

type Fetch = typeof fetch;

async function parseJson<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  if (!response.ok) {
    throw new Error("Google Calendar request failed with status " + response.status + ".");
  }
  return schema.parse(await response.json());
}

function tokenExpiry(expiresIn: number | undefined, now: () => number): string | null {
  return expiresIn ? new Date(now() + expiresIn * 1000).toISOString() : null;
}

function eventBody(event: EventInput) {
  return {
    summary: event.summary,
    description: event.description,
    start: { dateTime: event.start, timeZone: TIMEZONE },
    end: { dateTime: event.end, timeZone: TIMEZONE },
  };
}

export function createGoogleCalendarClient(
  fetchImpl: Fetch = fetch,
  now: () => number = Date.now,
): GoogleCalendarClient {
  const oauth = serverEnv.googleOAuth;

  async function authorizedJson<T>(
    url: string,
    accessToken: string,
    schema: z.ZodType<T>,
    init: RequestInit,
  ): Promise<T> {
    const response = await fetchImpl(url, {
      ...init,
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
    return parseJson(response, schema);
  }

  return {
    async exchangeCode(code) {
      const body = new URLSearchParams({
        code,
        client_id: oauth.clientId,
        client_secret: oauth.clientSecret,
        redirect_uri: oauth.redirectUrl,
        grant_type: "authorization_code",
      });
      const response = await fetchImpl(TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const tokens = await parseJson(response, tokenResponseSchema);
      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt: tokenExpiry(tokens.expires_in, now),
        scope: tokens.scope ?? null,
      };
    },

    async refreshAccessToken(refreshToken) {
      const body = new URLSearchParams({
        client_id: oauth.clientId,
        client_secret: oauth.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      });
      const response = await fetchImpl(TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const tokens = await parseJson(response, tokenResponseSchema);
      return {
        accessToken: tokens.access_token,
        expiresAt: tokenExpiry(tokens.expires_in, now),
        scope: tokens.scope ?? null,
      };
    },

    async freeBusy(accessToken, calendarId, range) {
      const response = await authorizedJson(
        CALENDAR_API + "/freeBusy",
        accessToken,
        freeBusyResponseSchema,
        {
          method: "POST",
          body: JSON.stringify({
            timeMin: range.from,
            timeMax: range.to,
            timeZone: TIMEZONE,
            items: [{ id: calendarId }],
          }),
        },
      );
      return response.calendars[calendarId]?.busy ?? [];
    },

    async createEvent(accessToken, calendarId, event) {
      const response = await authorizedJson(
        CALENDAR_API + "/calendars/" + encodeURIComponent(calendarId) + "/events",
        accessToken,
        eventResponseSchema,
        { method: "POST", body: JSON.stringify(eventBody(event)) },
      );
      return response.id;
    },

    async updateEvent(accessToken, calendarId, eventId, event) {
      await authorizedJson(
        CALENDAR_API +
          "/calendars/" +
          encodeURIComponent(calendarId) +
          "/events/" +
          encodeURIComponent(eventId),
        accessToken,
        eventResponseSchema,
        { method: "PUT", body: JSON.stringify(eventBody(event)) },
      );
    },

    async deleteEvent(accessToken, calendarId, eventId) {
      const response = await fetchImpl(
        CALENDAR_API +
          "/calendars/" +
          encodeURIComponent(calendarId) +
          "/events/" +
          encodeURIComponent(eventId),
        { method: "DELETE", headers: { Authorization: "Bearer " + accessToken } },
      );
      if (!response.ok && response.status !== 404) {
        throw new Error("Google Calendar request failed with status " + response.status + ".");
      }
    },
  };
}

export async function revokeGoogleToken(token: string, fetchImpl: Fetch = fetch): Promise<void> {
  const response = await fetchImpl(REVOKE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  });
  if (!response.ok) {
    throw new Error("Google OAuth token revocation failed with status " + response.status + ".");
  }
}

type MaybePromise<T> = T | Promise<T>;

export type FakeGoogleCalendarHandlers = {
  exchangeCode: (code: string) => MaybePromise<OAuthTokenSet>;
  refreshAccessToken: (refreshToken: string) => MaybePromise<RefreshedAccessToken>;
  freeBusy: (
    accessToken: string,
    calendarId: string,
    range: CalendarRange,
  ) => MaybePromise<BusyInterval[]>;
  createEvent: (accessToken: string, calendarId: string, event: EventInput) => MaybePromise<string>;
  updateEvent: (
    accessToken: string,
    calendarId: string,
    eventId: string,
    event: EventInput,
  ) => MaybePromise<void>;
  deleteEvent: (accessToken: string, calendarId: string, eventId: string) => MaybePromise<void>;
};

export class FakeGoogleCalendarClient implements GoogleCalendarClient {
  readonly calls: {
    exchangedCodes: string[];
    refreshedTokens: string[];
    freeBusy: Array<{ accessToken: string; calendarId: string; range: CalendarRange }>;
    created: Array<{ accessToken: string; calendarId: string; event: EventInput }>;
    updated: Array<{
      accessToken: string;
      calendarId: string;
      eventId: string;
      event: EventInput;
    }>;
    deleted: Array<{ accessToken: string; calendarId: string; eventId: string }>;
  } = {
    exchangedCodes: [],
    refreshedTokens: [],
    freeBusy: [],
    created: [],
    updated: [],
    deleted: [],
  };

  constructor(private readonly handlers: Partial<FakeGoogleCalendarHandlers> = {}) {}

  async exchangeCode(code: string): Promise<OAuthTokenSet> {
    this.calls.exchangedCodes.push(code);
    return this.handlers.exchangeCode
      ? this.handlers.exchangeCode(code)
      : {
          accessToken: "fake-access-token",
          refreshToken: "fake-refresh-token",
          expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
          scope: null,
        };
  }

  async refreshAccessToken(refreshToken: string): Promise<RefreshedAccessToken> {
    this.calls.refreshedTokens.push(refreshToken);
    return this.handlers.refreshAccessToken
      ? this.handlers.refreshAccessToken(refreshToken)
      : {
          accessToken: "fake-refreshed-access-token",
          expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
          scope: null,
        };
  }

  async freeBusy(
    accessToken: string,
    calendarId: string,
    range: CalendarRange,
  ): Promise<BusyInterval[]> {
    this.calls.freeBusy.push({ accessToken, calendarId, range });
    return this.handlers.freeBusy ? this.handlers.freeBusy(accessToken, calendarId, range) : [];
  }

  async createEvent(accessToken: string, calendarId: string, event: EventInput): Promise<string> {
    this.calls.created.push({ accessToken, calendarId, event });
    return this.handlers.createEvent
      ? this.handlers.createEvent(accessToken, calendarId, event)
      : "fake-event-id";
  }

  async updateEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    event: EventInput,
  ): Promise<void> {
    this.calls.updated.push({ accessToken, calendarId, eventId, event });
    await this.handlers.updateEvent?.(accessToken, calendarId, eventId, event);
  }

  async deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void> {
    this.calls.deleted.push({ accessToken, calendarId, eventId });
    await this.handlers.deleteEvent?.(accessToken, calendarId, eventId);
  }
}
