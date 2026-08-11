import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeGoogleCalendarClient } from "@/lib/calendar/client";
import { encryptToken } from "@/lib/calendar/crypto";
import {
  syncBookingCreated,
  type CalendarSyncBooking,
  type CalendarSyncRepository,
} from "@/lib/calendar/sync";
import type {
  CalendarConnectionRepository,
  StoredCalendarConnection,
} from "@/lib/calendar/connections";
import type { CalendarSyncStatus } from "@/types/database";

const TEST_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
const NOW = Date.parse("2026-08-11T00:00:00.000Z");
const TECHNICIAN_ID = "10000000-0000-4000-8000-000000000001";

class MemoryConnectionRepository implements CalendarConnectionRepository {
  constructor(public row: StoredCalendarConnection | null) {}

  async findByTechnicianId(technicianId: string) {
    return this.row?.technician_id === technicianId ? this.row : null;
  }

  async upsert() {
    throw new Error("Not used in sync tests.");
  }

  async updateAccessToken() {
    throw new Error("Not used in sync tests.");
  }

  async deleteByTechnicianId() {
    this.row = null;
  }
}

class MemorySyncRepository implements CalendarSyncRepository {
  readonly statuses: CalendarSyncStatus[] = [];

  constructor(public booking: CalendarSyncBooking) {}

  async getBooking(bookingId: string) {
    return bookingId === this.booking.id ? this.booking : null;
  }

  async updateBooking(
    bookingId: string,
    update: { status: CalendarSyncStatus; googleEventId?: string | null },
  ) {
    if (bookingId !== this.booking.id) throw new Error("Missing booking");
    this.statuses.push(update.status);
    if (update.googleEventId !== undefined) {
      this.booking = { ...this.booking, googleEventId: update.googleEventId };
    }
  }
}

function booking(): CalendarSyncBooking {
  return {
    id: "30000000-0000-4000-8000-000000000001",
    bookingCode: "PNP-TEST01",
    technicianId: TECHNICIAN_ID,
    technicianName: "Test Technician",
    serviceName: "Gel Manicure",
    clientName: "Test Client",
    clientEmail: "client@example.test",
    clientPhone: "09170000000",
    clientNotes: null,
    startsAt: "2026-08-12T01:00:00.000Z",
    endsAt: "2026-08-12T03:00:00.000Z",
    status: "confirmed",
    googleEventId: null,
  };
}

function connected(): StoredCalendarConnection {
  return {
    id: "20000000-0000-4000-8000-000000000001",
    technician_id: TECHNICIAN_ID,
    calendar_id: "primary",
    access_token: encryptToken("access-token"),
    refresh_token: encryptToken("refresh-token"),
    token_expires_at: new Date(NOW + 3_600_000).toISOString(),
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

describe("booking calendar sync", () => {
  it("marks a created event as synced and stores its event id", async () => {
    const repository = new MemorySyncRepository(booking());
    const connections = new MemoryConnectionRepository(connected());
    const client = new FakeGoogleCalendarClient({ createEvent: () => "google-event-1" });

    const result = await syncBookingCreated(repository.booking.id, {
      repository,
      connectionRepository: connections,
      client,
      now: NOW,
    });

    expect(result).toEqual({ status: "synced" });
    expect(repository.statuses).toEqual(["pending", "synced"]);
    expect(repository.booking.googleEventId).toBe("google-event-1");
    expect(client.calls.created).toHaveLength(1);
  });

  it("records failed when Google throws without losing the database booking", async () => {
    const repository = new MemorySyncRepository(booking());
    const connections = new MemoryConnectionRepository(connected());
    const client = new FakeGoogleCalendarClient({
      createEvent: () => {
        throw new Error("Google unavailable");
      },
    });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const result = await syncBookingCreated(repository.booking.id, {
      repository,
      connectionRepository: connections,
      client,
      now: NOW,
    });

    expect(result).toEqual({ status: "failed" });
    expect(repository.statuses).toEqual(["pending", "failed"]);
    expect(repository.booking.googleEventId).toBeNull();
  });

  it("records not_connected without calling Google", async () => {
    const repository = new MemorySyncRepository(booking());
    const connections = new MemoryConnectionRepository(null);
    const client = new FakeGoogleCalendarClient();

    const result = await syncBookingCreated(repository.booking.id, {
      repository,
      connectionRepository: connections,
      client,
      now: NOW,
    });

    expect(result).toEqual({ status: "not_connected" });
    expect(repository.statuses).toEqual(["not_connected"]);
    expect(client.calls.created).toHaveLength(0);
  });
});
