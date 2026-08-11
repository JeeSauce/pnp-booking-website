import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeGoogleCalendarClient } from "@/lib/calendar/client";
import {
  getConnectionStatus,
  getValidAccessToken,
  type CalendarConnectionRepository,
  type StoredCalendarConnection,
} from "@/lib/calendar/connections";
import { decryptToken, encryptToken } from "@/lib/calendar/crypto";
import { getBusyIntervals } from "@/lib/calendar/busy";
import type { TablesInsert } from "@/types/database";

const TEST_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
const NOW = Date.parse("2026-08-11T00:00:00.000Z");
const TECHNICIAN_ID = "10000000-0000-4000-8000-000000000001";

class MemoryConnectionRepository implements CalendarConnectionRepository {
  constructor(public row: StoredCalendarConnection | null) {}

  async findByTechnicianId(technicianId: string) {
    return this.row?.technician_id === technicianId ? this.row : null;
  }

  async upsert(connection: TablesInsert<"calendar_connections">) {
    this.row = {
      id: this.row?.id ?? "20000000-0000-4000-8000-000000000001",
      technician_id: connection.technician_id,
      calendar_id: connection.calendar_id ?? "primary",
      access_token: connection.access_token,
      refresh_token: connection.refresh_token,
      token_expires_at: connection.token_expires_at ?? null,
      scope: connection.scope ?? null,
      created_at: this.row?.created_at ?? "2026-08-10T00:00:00.000Z",
      updated_at: "2026-08-11T00:00:00.000Z",
    };
  }

  async updateAccessToken(
    technicianId: string,
    values: { accessToken: string; expiresAt: string | null; scope: string | null },
  ) {
    if (!this.row || this.row.technician_id !== technicianId) throw new Error("Missing row");
    this.row = {
      ...this.row,
      access_token: values.accessToken,
      token_expires_at: values.expiresAt,
      scope: values.scope,
      updated_at: new Date(NOW).toISOString(),
    };
  }

  async deleteByTechnicianId(technicianId: string) {
    if (this.row?.technician_id === technicianId) this.row = null;
  }
}

function storedConnection(expiresAt: string): StoredCalendarConnection {
  return {
    id: "20000000-0000-4000-8000-000000000001",
    technician_id: TECHNICIAN_ID,
    calendar_id: "primary",
    access_token: encryptToken("old-access-token"),
    refresh_token: encryptToken("refresh-token"),
    token_expires_at: expiresAt,
    scope: "calendar",
    created_at: "2026-08-10T00:00:00.000Z",
    updated_at: "2026-08-10T00:00:00.000Z",
  };
}

beforeEach(() => {
  vi.stubEnv("CALENDAR_TOKEN_ENCRYPTION_KEY", TEST_KEY);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("calendar connections", () => {
  it("returns only safe connection status fields", async () => {
    const repository = new MemoryConnectionRepository(
      storedConnection(new Date(NOW + 3_600_000).toISOString()),
    );

    await expect(getConnectionStatus(TECHNICIAN_ID, { repository })).resolves.toEqual({
      connected: true,
      calendarId: "primary",
      connectedAt: "2026-08-10T00:00:00.000Z",
    });
  });
  it("refreshes an expiring access token and persists the replacement", async () => {
    const repository = new MemoryConnectionRepository(
      storedConnection(new Date(NOW + 60_000).toISOString()),
    );
    const client = new FakeGoogleCalendarClient({
      refreshAccessToken: () => ({
        accessToken: "new-access-token",
        expiresAt: new Date(NOW + 3_600_000).toISOString(),
        scope: "calendar refreshed",
      }),
    });

    const access = await getValidAccessToken(TECHNICIAN_ID, {
      repository,
      client,
      now: NOW,
    });

    expect(access).toEqual({ accessToken: "new-access-token", calendarId: "primary" });
    expect(client.calls.refreshedTokens).toEqual(["refresh-token"]);
    expect(repository.row?.access_token).not.toBe("new-access-token");
    expect(decryptToken(repository.row?.access_token ?? "")).toBe("new-access-token");
    expect(repository.row?.scope).toBe("calendar refreshed");
  });

  it("fails open when the Google busy request throws", async () => {
    const repository = new MemoryConnectionRepository(
      storedConnection(new Date(NOW + 3_600_000).toISOString()),
    );
    const client = new FakeGoogleCalendarClient({
      freeBusy: () => {
        throw new Error("Google unavailable");
      },
    });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const busy = await getBusyIntervals(
      TECHNICIAN_ID,
      {
        from: "2026-08-11T00:00:00.000Z",
        to: "2026-08-12T00:00:00.000Z",
      },
      { repository, client, now: NOW },
    );

    expect(busy).toEqual([]);
    expect(console.warn).toHaveBeenCalledOnce();
  });
});
