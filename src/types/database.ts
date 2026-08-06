export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      availability_overrides: {
        Row: {
          created_at: string;
          date: string;
          end_time: string | null;
          id: string;
          is_available: boolean;
          reason: string | null;
          start_time: string | null;
          technician_id: string;
        };
        Insert: {
          created_at?: string;
          date: string;
          end_time?: string | null;
          id?: string;
          is_available?: boolean;
          reason?: string | null;
          start_time?: string | null;
          technician_id: string;
        };
        Update: {
          created_at?: string;
          date?: string;
          end_time?: string | null;
          id?: string;
          is_available?: boolean;
          reason?: string | null;
          start_time?: string | null;
          technician_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "availability_overrides_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      availability_rules: {
        Row: {
          active: boolean;
          created_at: string;
          end_time: string;
          id: string;
          start_time: string;
          technician_id: string;
          weekday: number;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          end_time: string;
          id?: string;
          start_time: string;
          technician_id: string;
          weekday: number;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          end_time?: string;
          id?: string;
          start_time?: string;
          technician_id?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "availability_rules_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      blocked_periods: {
        Row: {
          created_at: string;
          created_by: string | null;
          ends_at: string;
          id: string;
          reason: string | null;
          starts_at: string;
          technician_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          ends_at: string;
          id?: string;
          reason?: string | null;
          starts_at: string;
          technician_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          ends_at?: string;
          id?: string;
          reason?: string | null;
          starts_at?: string;
          technician_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blocked_periods_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blocked_periods_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          booking_code: string;
          calendar_sync_status: Database["public"]["Enums"]["calendar_sync_status"];
          client_email: string;
          client_name: string;
          client_notes: string | null;
          client_phone: string;
          created_at: string;
          created_by: string | null;
          duration_snapshot: number;
          ends_at: string;
          google_event_id: string | null;
          id: string;
          payment_status: Database["public"]["Enums"]["payment_status"];
          policy_accepted_at: string | null;
          price_snapshot: number;
          reference_photo_path: string | null;
          service_id: string;
          starts_at: string;
          status: Database["public"]["Enums"]["booking_status"];
          technician_id: string;
          updated_at: string;
        };
        Insert: {
          booking_code?: string;
          calendar_sync_status?: Database["public"]["Enums"]["calendar_sync_status"];
          client_email: string;
          client_name: string;
          client_notes?: string | null;
          client_phone: string;
          created_at?: string;
          created_by?: string | null;
          duration_snapshot: number;
          ends_at: string;
          google_event_id?: string | null;
          id?: string;
          payment_status?: Database["public"]["Enums"]["payment_status"];
          policy_accepted_at?: string | null;
          price_snapshot: number;
          reference_photo_path?: string | null;
          service_id: string;
          starts_at: string;
          status?: Database["public"]["Enums"]["booking_status"];
          technician_id: string;
          updated_at?: string;
        };
        Update: {
          booking_code?: string;
          calendar_sync_status?: Database["public"]["Enums"]["calendar_sync_status"];
          client_email?: string;
          client_name?: string;
          client_notes?: string | null;
          client_phone?: string;
          created_at?: string;
          created_by?: string | null;
          duration_snapshot?: number;
          ends_at?: string;
          google_event_id?: string | null;
          id?: string;
          payment_status?: Database["public"]["Enums"]["payment_status"];
          policy_accepted_at?: string | null;
          price_snapshot?: number;
          reference_photo_path?: string | null;
          service_id?: string;
          starts_at?: string;
          status?: Database["public"]["Enums"]["booking_status"];
          technician_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      business_settings: {
        Row: {
          address: string | null;
          booking_window_weeks: number;
          business_name: string;
          cancellation_policy: string | null;
          created_at: string;
          default_buffer_minutes: number;
          facebook_url: string | null;
          id: string;
          maribank_account_name: string | null;
          maribank_qr_path: string | null;
          minimum_notice_minutes: number;
          notification_email: string | null;
          payment_amount_note: string | null;
          slot_interval_minutes: number;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          booking_window_weeks?: number;
          business_name?: string;
          cancellation_policy?: string | null;
          created_at?: string;
          default_buffer_minutes?: number;
          facebook_url?: string | null;
          id?: string;
          maribank_account_name?: string | null;
          maribank_qr_path?: string | null;
          minimum_notice_minutes?: number;
          notification_email?: string | null;
          payment_amount_note?: string | null;
          slot_interval_minutes?: number;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          booking_window_weeks?: number;
          business_name?: string;
          cancellation_policy?: string | null;
          created_at?: string;
          default_buffer_minutes?: number;
          facebook_url?: string | null;
          id?: string;
          maribank_account_name?: string | null;
          maribank_qr_path?: string | null;
          minimum_notice_minutes?: number;
          notification_email?: string | null;
          payment_amount_note?: string | null;
          slot_interval_minutes?: number;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      calendar_connections: {
        Row: {
          access_token: string;
          calendar_id: string;
          created_at: string;
          id: string;
          refresh_token: string;
          scope: string | null;
          technician_id: string;
          token_expires_at: string | null;
          updated_at: string;
        };
        Insert: {
          access_token: string;
          calendar_id?: string;
          created_at?: string;
          id?: string;
          refresh_token: string;
          scope?: string | null;
          technician_id: string;
          token_expires_at?: string | null;
          updated_at?: string;
        };
        Update: {
          access_token?: string;
          calendar_id?: string;
          created_at?: string;
          id?: string;
          refresh_token?: string;
          scope?: string | null;
          technician_id?: string;
          token_expires_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_connections_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_log: {
        Row: {
          booking_id: string | null;
          created_at: string;
          id: string;
          notification_type: Database["public"]["Enums"]["notification_type"];
          provider_message_id: string | null;
          recipient: string;
          sent_at: string | null;
          status: string;
        };
        Insert: {
          booking_id?: string | null;
          created_at?: string;
          id?: string;
          notification_type: Database["public"]["Enums"]["notification_type"];
          provider_message_id?: string | null;
          recipient: string;
          sent_at?: string | null;
          status?: string;
        };
        Update: {
          booking_id?: string | null;
          created_at?: string;
          id?: string;
          notification_type?: Database["public"]["Enums"]["notification_type"];
          provider_message_id?: string | null;
          recipient?: string;
          sent_at?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_log_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          active: boolean;
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          email: string;
          full_name?: string;
          id: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      services: {
        Row: {
          active: boolean;
          created_at: string;
          description: string | null;
          duration_minutes: number;
          id: string;
          name: string;
          preparation_instructions: string | null;
          price: number;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          duration_minutes?: number;
          id?: string;
          name: string;
          preparation_instructions?: string | null;
          price: number;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          duration_minutes?: number;
          id?: string;
          name?: string;
          preparation_instructions?: string | null;
          price?: number;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      technician_services: {
        Row: {
          created_at: string;
          service_id: string;
          technician_id: string;
        };
        Insert: {
          created_at?: string;
          service_id: string;
          technician_id: string;
        };
        Update: {
          created_at?: string;
          service_id?: string;
          technician_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "technician_services_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "technician_services_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_user_role: {
        Args: never;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      gen_booking_code: { Args: never; Returns: string };
      is_owner: { Args: never; Returns: boolean };
      promote_to_owner: { Args: { target_email: string }; Returns: undefined };
    };
    Enums: {
      booking_status: "confirmed" | "completed" | "cancelled_by_admin" | "no_show";
      calendar_sync_status: "pending" | "synced" | "failed" | "not_connected";
      notification_type:
        | "booking_confirmation"
        | "new_booking_admin"
        | "reminder_24h"
        | "reminder_2h"
        | "payment_verified"
        | "cancelled_by_admin"
        | "rescheduled_by_admin";
      payment_status: "unverified" | "verified" | "waived" | "refunded";
      user_role: "owner" | "technician";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      booking_status: ["confirmed", "completed", "cancelled_by_admin", "no_show"],
      calendar_sync_status: ["pending", "synced", "failed", "not_connected"],
      notification_type: [
        "booking_confirmation",
        "new_booking_admin",
        "reminder_24h",
        "reminder_2h",
        "payment_verified",
        "cancelled_by_admin",
        "rescheduled_by_admin",
      ],
      payment_status: ["unverified", "verified", "waived", "refunded"],
      user_role: ["owner", "technician"],
    },
  },
} as const;

/** Project-level aliases retained around the generated Supabase schema types. */
export type UserRole = Enums<"user_role">;
export type BookingStatus = Enums<"booking_status">;
export type PaymentStatus = Enums<"payment_status">;
export type CalendarSyncStatus = Enums<"calendar_sync_status">;
export type NotificationType = Enums<"notification_type">;

export type Profile = Tables<"profiles">;
export type BusinessSettings = Tables<"business_settings">;
export type Service = Tables<"services">;
export type AvailabilityRule = Tables<"availability_rules">;
export type AvailabilityOverride = Tables<"availability_overrides">;
export type BlockedPeriod = Tables<"blocked_periods">;
export type Booking = Tables<"bookings">;
export type NotificationLogEntry = Tables<"notification_log">;
