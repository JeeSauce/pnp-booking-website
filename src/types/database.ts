/**
 * Hand-authored Supabase schema types for Phase 1.
 *
 * This mirrors supabase/migrations exactly. Once a Supabase project is linked,
 * regenerate with:
 *   npx supabase gen types typescript --linked > src/types/database.ts
 * and keep it in sync with new migrations.
 */

export type BookingStatus = "confirmed" | "completed" | "cancelled_by_admin" | "no_show";
export type PaymentStatus = "unverified" | "verified" | "waived" | "refunded";
export type UserRole = "owner" | "technician";
export type CalendarSyncStatus = "pending" | "synced" | "failed" | "not_connected";
export type NotificationType =
  | "booking_confirmation"
  | "new_booking_admin"
  | "reminder_24h"
  | "reminder_2h"
  | "payment_verified"
  | "cancelled_by_admin"
  | "rescheduled_by_admin";

type Timestamps = {
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: UserRole;
          active: boolean;
        } & Timestamps;
        Insert: {
          id: string;
          full_name: string;
          email: string;
          role?: UserRole;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      business_settings: {
        Row: {
          id: string;
          business_name: string;
          timezone: string;
          address: string | null;
          facebook_url: string | null;
          maribank_account_name: string | null;
          maribank_qr_path: string | null;
          payment_amount_note: string | null;
          minimum_notice_minutes: number;
          booking_window_weeks: number;
          slot_interval_minutes: number;
          default_buffer_minutes: number;
          cancellation_policy: string | null;
          notification_email: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          business_name: string;
          timezone?: string;
          address?: string | null;
          facebook_url?: string | null;
          maribank_account_name?: string | null;
          maribank_qr_path?: string | null;
          payment_amount_note?: string | null;
          minimum_notice_minutes?: number;
          booking_window_weeks?: number;
          slot_interval_minutes?: number;
          default_buffer_minutes?: number;
          cancellation_policy?: string | null;
          notification_email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["business_settings"]["Insert"]>;
        Relationships: [];
      };
      services: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          preparation_instructions: string | null;
          duration_minutes: number;
          price: number;
          active: boolean;
          sort_order: number;
        } & Timestamps;
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          preparation_instructions?: string | null;
          duration_minutes?: number;
          price: number;
          active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["services"]["Insert"]>;
        Relationships: [];
      };
      technician_services: {
        Row: {
          technician_id: string;
          service_id: string;
          created_at: string;
        };
        Insert: {
          technician_id: string;
          service_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["technician_services"]["Insert"]>;
        Relationships: [];
      };
      availability_rules: {
        Row: {
          id: string;
          technician_id: string;
          weekday: number;
          start_time: string;
          end_time: string;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          technician_id: string;
          weekday: number;
          start_time: string;
          end_time: string;
          active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["availability_rules"]["Insert"]>;
        Relationships: [];
      };
      availability_overrides: {
        Row: {
          id: string;
          technician_id: string;
          date: string;
          is_available: boolean;
          start_time: string | null;
          end_time: string | null;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          technician_id: string;
          date: string;
          is_available?: boolean;
          start_time?: string | null;
          end_time?: string | null;
          reason?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["availability_overrides"]["Insert"]>;
        Relationships: [];
      };
      blocked_periods: {
        Row: {
          id: string;
          technician_id: string;
          starts_at: string;
          ends_at: string;
          reason: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          technician_id: string;
          starts_at: string;
          ends_at: string;
          reason?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["blocked_periods"]["Insert"]>;
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          booking_code: string;
          service_id: string;
          technician_id: string;
          client_name: string;
          client_email: string;
          client_phone: string;
          client_notes: string | null;
          reference_photo_path: string | null;
          starts_at: string;
          ends_at: string;
          status: BookingStatus;
          payment_status: PaymentStatus;
          price_snapshot: number;
          duration_snapshot: number;
          policy_accepted_at: string | null;
          google_event_id: string | null;
          calendar_sync_status: CalendarSyncStatus;
          created_by: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          booking_code?: string;
          service_id: string;
          technician_id: string;
          client_name: string;
          client_email: string;
          client_phone: string;
          client_notes?: string | null;
          reference_photo_path?: string | null;
          starts_at: string;
          ends_at: string;
          status?: BookingStatus;
          payment_status?: PaymentStatus;
          price_snapshot: number;
          duration_snapshot: number;
          policy_accepted_at?: string | null;
          google_event_id?: string | null;
          calendar_sync_status?: CalendarSyncStatus;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["bookings"]["Insert"]>;
        Relationships: [];
      };
      calendar_connections: {
        Row: {
          id: string;
          technician_id: string;
          calendar_id: string;
          access_token: string;
          refresh_token: string;
          token_expires_at: string | null;
          scope: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          technician_id: string;
          calendar_id: string;
          access_token: string;
          refresh_token: string;
          token_expires_at?: string | null;
          scope?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["calendar_connections"]["Insert"]>;
        Relationships: [];
      };
      notification_log: {
        Row: {
          id: string;
          booking_id: string | null;
          notification_type: NotificationType;
          recipient: string;
          sent_at: string | null;
          provider_message_id: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id?: string | null;
          notification_type: NotificationType;
          recipient: string;
          sent_at?: string | null;
          provider_message_id?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notification_log"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_user_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
    };
    Enums: {
      booking_status: BookingStatus;
      payment_status: PaymentStatus;
      user_role: UserRole;
      calendar_sync_status: CalendarSyncStatus;
      notification_type: NotificationType;
    };
  };
};

/** Convenience row aliases. */
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type BusinessSettings = Database["public"]["Tables"]["business_settings"]["Row"];
export type Service = Database["public"]["Tables"]["services"]["Row"];
export type AvailabilityRule = Database["public"]["Tables"]["availability_rules"]["Row"];
export type AvailabilityOverride = Database["public"]["Tables"]["availability_overrides"]["Row"];
export type BlockedPeriod = Database["public"]["Tables"]["blocked_periods"]["Row"];
export type Booking = Database["public"]["Tables"]["bookings"]["Row"];
export type NotificationLogEntry = Database["public"]["Tables"]["notification_log"]["Row"];
