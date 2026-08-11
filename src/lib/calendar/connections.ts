import "server-only";

import {
  createGoogleCalendarClient,
  revokeGoogleToken,
  type GoogleCalendarClient,
  type OAuthTokenSet,
} from "@/lib/calendar/client";
import { decryptToken, encryptToken } from "@/lib/calendar/crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables, TablesInsert } from "@/types/database";

type AdminClient = ReturnType<typeof createAdminClient>;
export type StoredCalendarConnection = Tables<"calendar_connections">;
type ConnectionInsert = TablesInsert<"calendar_connections">;

const REFRESH_MARGIN_MS = 5 * 60 * 1000;

export interface CalendarConnectionRepository {
  findByTechnicianId(technicianId: string): Promise<StoredCalendarConnection | null>;
  upsert(connection: ConnectionInsert): Promise<void>;
  updateAccessToken(
    technicianId: string,
    values: { accessToken: string; expiresAt: string | null; scope: string | null },
  ): Promise<void>;
  deleteByTechnicianId(technicianId: string): Promise<void>;
}

export function createCalendarConnectionRepository(
  admin: AdminClient = createAdminClient(),
): CalendarConnectionRepository {
  return {
    async findByTechnicianId(technicianId) {
      const { data, error } = await admin
        .from("calendar_connections")
        .select("*")
        .eq("technician_id", technicianId)
        .maybeSingle();
      if (error) throw new Error("Calendar connection could not be loaded.");
      return data;
    },

    async upsert(connection) {
      const { error } = await admin.from("calendar_connections").upsert(connection, {
        onConflict: "technician_id",
      });
      if (error) throw new Error("Calendar connection could not be saved.");
    },

    async updateAccessToken(technicianId, values) {
      const { error } = await admin
        .from("calendar_connections")
        .update({
          access_token: values.accessToken,
          token_expires_at: values.expiresAt,
          scope: values.scope,
        })
        .eq("technician_id", technicianId);
      if (error) throw new Error("Refreshed calendar token could not be saved.");
    },

    async deleteByTechnicianId(technicianId) {
      const { error } = await admin
        .from("calendar_connections")
        .delete()
        .eq("technician_id", technicianId);
      if (error) throw new Error("Calendar connection could not be deleted.");
    },
  };
}

export type CalendarConnectionDependencies = {
  admin?: AdminClient;
  repository?: CalendarConnectionRepository;
  client?: GoogleCalendarClient;
  now?: number;
  refreshMarginMs?: number;
  revokeToken?: (token: string) => Promise<void>;
};

function repositoryFor(dependencies: CalendarConnectionDependencies): CalendarConnectionRepository {
  return (
    dependencies.repository ??
    createCalendarConnectionRepository(dependencies.admin ?? createAdminClient())
  );
}

export async function getConnection(
  technicianId: string,
  dependencies: CalendarConnectionDependencies = {},
): Promise<StoredCalendarConnection | null> {
  return repositoryFor(dependencies).findByTechnicianId(technicianId);
}

export async function saveConnection(
  technicianId: string,
  tokens: OAuthTokenSet,
  dependencies: CalendarConnectionDependencies & { calendarId?: string } = {},
): Promise<void> {
  if (!tokens.refreshToken) {
    throw new Error("Google did not return a refresh token. Reconnect with consent.");
  }
  await repositoryFor(dependencies).upsert({
    technician_id: technicianId,
    calendar_id: dependencies.calendarId ?? "primary",
    access_token: encryptToken(tokens.accessToken),
    refresh_token: encryptToken(tokens.refreshToken),
    token_expires_at: tokens.expiresAt,
    scope: tokens.scope,
  });
}

export async function deleteConnection(
  technicianId: string,
  dependencies: CalendarConnectionDependencies = {},
): Promise<void> {
  const repository = repositoryFor(dependencies);
  const connection = await repository.findByTechnicianId(technicianId);
  await repository.deleteByTechnicianId(technicianId);
  if (!connection) return;

  try {
    const refreshToken = decryptToken(connection.refresh_token);
    await (dependencies.revokeToken ?? revokeGoogleToken)(refreshToken);
  } catch {
    console.warn("Google OAuth token revocation failed after local disconnect.");
  }
}

export type ConnectionStatus = {
  connected: boolean;
  calendarId: string | null;
  connectedAt: string | null;
};

export async function getConnectionStatus(
  technicianId: string,
  dependencies: CalendarConnectionDependencies = {},
): Promise<ConnectionStatus> {
  const connection = await repositoryFor(dependencies).findByTechnicianId(technicianId);
  return connection
    ? {
        connected: true,
        calendarId: connection.calendar_id,
        connectedAt: connection.created_at,
      }
    : { connected: false, calendarId: null, connectedAt: null };
}

export type ValidCalendarAccess = {
  accessToken: string;
  calendarId: string;
};

export async function getValidAccessToken(
  technicianId: string,
  dependencies: CalendarConnectionDependencies = {},
): Promise<ValidCalendarAccess | null> {
  const repository = repositoryFor(dependencies);
  const connection = await repository.findByTechnicianId(technicianId);
  if (!connection) return null;

  const now = dependencies.now ?? Date.now();
  const expiresAt = connection.token_expires_at
    ? Date.parse(connection.token_expires_at)
    : Number.NaN;
  const shouldRefresh =
    !Number.isFinite(expiresAt) ||
    expiresAt - now <= (dependencies.refreshMarginMs ?? REFRESH_MARGIN_MS);

  if (!shouldRefresh) {
    return {
      accessToken: decryptToken(connection.access_token),
      calendarId: connection.calendar_id,
    };
  }

  const client = dependencies.client ?? createGoogleCalendarClient();
  const refreshed = await client.refreshAccessToken(decryptToken(connection.refresh_token));
  await repository.updateAccessToken(technicianId, {
    accessToken: encryptToken(refreshed.accessToken),
    expiresAt: refreshed.expiresAt,
    scope: refreshed.scope ?? connection.scope,
  });

  return { accessToken: refreshed.accessToken, calendarId: connection.calendar_id };
}
