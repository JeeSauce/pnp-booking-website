import "server-only";

import {
  createGoogleCalendarClient,
  type EventInput,
  type GoogleCalendarClient,
} from "@/lib/calendar/client";
import {
  createCalendarConnectionRepository,
  getValidAccessToken,
  type CalendarConnectionRepository,
} from "@/lib/calendar/connections";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BookingStatus, CalendarSyncStatus } from "@/types/database";

type AdminClient = ReturnType<typeof createAdminClient>;

export type CalendarSyncBooking = {
  id: string;
  bookingCode: string;
  technicianId: string;
  technicianName: string;
  serviceName: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientNotes: string | null;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  googleEventId: string | null;
};

type SyncUpdate = {
  status: CalendarSyncStatus;
  googleEventId?: string | null;
};

export interface CalendarSyncRepository {
  getBooking(bookingId: string): Promise<CalendarSyncBooking | null>;
  updateBooking(bookingId: string, update: SyncUpdate): Promise<void>;
}

export function createCalendarSyncRepository(
  admin: AdminClient = createAdminClient(),
): CalendarSyncRepository {
  return {
    async getBooking(bookingId) {
      const { data: booking, error } = await admin
        .from("bookings")
        .select(
          "id,booking_code,technician_id,service_id,client_name,client_email,client_phone,client_notes,starts_at,ends_at,status,google_event_id",
        )
        .eq("id", bookingId)
        .maybeSingle();
      if (error) throw new Error("Booking could not be loaded for calendar sync.");
      if (!booking) return null;

      const [serviceResult, technicianResult] = await Promise.all([
        admin.from("services").select("name").eq("id", booking.service_id).maybeSingle(),
        admin.from("profiles").select("full_name").eq("id", booking.technician_id).maybeSingle(),
      ]);
      if (serviceResult.error || technicianResult.error) {
        throw new Error("Booking labels could not be loaded for calendar sync.");
      }

      return {
        id: booking.id,
        bookingCode: booking.booking_code,
        technicianId: booking.technician_id,
        technicianName: technicianResult.data?.full_name ?? "Technician",
        serviceName: serviceResult.data?.name ?? "Nail appointment",
        clientName: booking.client_name,
        clientEmail: booking.client_email,
        clientPhone: booking.client_phone,
        clientNotes: booking.client_notes,
        startsAt: booking.starts_at,
        endsAt: booking.ends_at,
        status: booking.status,
        googleEventId: booking.google_event_id,
      };
    },

    async updateBooking(bookingId, update) {
      const values =
        update.googleEventId === undefined
          ? { calendar_sync_status: update.status }
          : {
              calendar_sync_status: update.status,
              google_event_id: update.googleEventId,
            };
      const { error } = await admin.from("bookings").update(values).eq("id", bookingId);
      if (error) throw new Error("Booking calendar sync status could not be saved.");
    },
  };
}

export type CalendarSyncDependencies = {
  admin?: AdminClient;
  repository?: CalendarSyncRepository;
  connectionRepository?: CalendarConnectionRepository;
  client?: GoogleCalendarClient;
  now?: number;
  previousTechnicianId?: string;
  previousGoogleEventId?: string | null;
};

export type CalendarSyncResult = { status: CalendarSyncStatus };

function eventFor(booking: CalendarSyncBooking): EventInput {
  const details = [
    "Booking: " + booking.bookingCode,
    "Technician: " + booking.technicianName,
    "Client: " + booking.clientName,
    "Phone: " + booking.clientPhone,
    "Email: " + booking.clientEmail,
  ];
  if (booking.clientNotes) details.push("Notes: " + booking.clientNotes);
  return {
    summary: booking.serviceName + " - " + booking.clientName,
    description: details.join("\n"),
    start: booking.startsAt,
    end: booking.endsAt,
  };
}

async function runSync(
  bookingId: string,
  mode: "upsert" | "cancel",
  dependencies: CalendarSyncDependencies,
): Promise<CalendarSyncResult> {
  let admin = dependencies.admin;
  const getAdmin = () => {
    admin ??= createAdminClient();
    return admin;
  };
  const repository = dependencies.repository ?? createCalendarSyncRepository(getAdmin());
  let booking: CalendarSyncBooking | null = null;

  try {
    booking = await repository.getBooking(bookingId);
    if (!booking) return { status: "failed" };

    const connectionRepository =
      dependencies.connectionRepository ?? createCalendarConnectionRepository(getAdmin());
    const client = dependencies.client ?? createGoogleCalendarClient();

    if (
      mode === "upsert" &&
      dependencies.previousTechnicianId &&
      dependencies.previousTechnicianId !== booking.technicianId &&
      dependencies.previousGoogleEventId
    ) {
      await repository.updateBooking(bookingId, { status: "pending" });
      const previousAccess = await getValidAccessToken(dependencies.previousTechnicianId, {
        repository: connectionRepository,
        client,
        now: dependencies.now,
      });
      if (!previousAccess) {
        throw new Error("The previous technician calendar is no longer connected.");
      }
      await client.deleteEvent(
        previousAccess.accessToken,
        previousAccess.calendarId,
        dependencies.previousGoogleEventId,
      );
      await repository.updateBooking(bookingId, { status: "pending", googleEventId: null });
      booking = { ...booking, googleEventId: null };
    }

    const access = await getValidAccessToken(booking.technicianId, {
      repository: connectionRepository,
      client,
      now: dependencies.now,
    });
    if (!access) {
      await repository.updateBooking(bookingId, { status: "not_connected" });
      return { status: "not_connected" };
    }

    await repository.updateBooking(bookingId, { status: "pending" });

    if (mode === "cancel") {
      if (booking.googleEventId) {
        await client.deleteEvent(access.accessToken, access.calendarId, booking.googleEventId);
      }
      await repository.updateBooking(bookingId, { status: "synced", googleEventId: null });
      return { status: "synced" };
    }

    const event = eventFor(booking);
    if (booking.googleEventId) {
      await client.updateEvent(access.accessToken, access.calendarId, booking.googleEventId, event);
      await repository.updateBooking(bookingId, { status: "synced" });
    } else {
      const eventId = await client.createEvent(access.accessToken, access.calendarId, event);
      await repository.updateBooking(bookingId, { status: "synced", googleEventId: eventId });
    }
    return { status: "synced" };
  } catch {
    try {
      await repository.updateBooking(bookingId, { status: "failed" });
    } catch {
      console.warn("Calendar sync failed and its warning status could not be saved.");
    }
    console.warn("Google Calendar booking sync failed; the database booking was kept.");
    return { status: "failed" };
  }
}

export function syncBookingCreated(
  bookingId: string,
  dependencies: CalendarSyncDependencies = {},
): Promise<CalendarSyncResult> {
  return runSync(bookingId, "upsert", dependencies);
}

export function syncBookingRescheduled(
  bookingId: string,
  dependencies: CalendarSyncDependencies = {},
): Promise<CalendarSyncResult> {
  return runSync(bookingId, "upsert", dependencies);
}

export function syncBookingCancelled(
  bookingId: string,
  dependencies: CalendarSyncDependencies = {},
): Promise<CalendarSyncResult> {
  return runSync(bookingId, "cancel", dependencies);
}
