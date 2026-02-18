export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      designer_details: {
        Row: {
          available_hours: number | null
          created_at: string
          experience_level: string | null
          id: string
          monthly_points: number | null
          payment_details: Json | null
          payment_method: string | null
          portfolio_url: string | null
          professional_title: string | null
          profile_photo_url: string | null
          salary_estimated: number | null
          skills: string[] | null
          talent_score: number | null
          talent_score_breakdown: Json | null
          talent_score_updated_at: string | null
          total_points: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          available_hours?: number | null
          created_at?: string
          experience_level?: string | null
          id?: string
          monthly_points?: number | null
          payment_details?: Json | null
          payment_method?: string | null
          portfolio_url?: string | null
          professional_title?: string | null
          profile_photo_url?: string | null
          salary_estimated?: number | null
          skills?: string[] | null
          talent_score?: number | null
          talent_score_breakdown?: Json | null
          talent_score_updated_at?: string | null
          total_points?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          available_hours?: number | null
          created_at?: string
          experience_level?: string | null
          id?: string
          monthly_points?: number | null
          payment_details?: Json | null
          payment_method?: string | null
          portfolio_url?: string | null
          professional_title?: string | null
          profile_photo_url?: string | null
          salary_estimated?: number | null
          skills?: string[] | null
          talent_score?: number | null
          talent_score_breakdown?: Json | null
          talent_score_updated_at?: string | null
          total_points?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_verification_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      monthly_records: {
        Row: {
          created_at: string
          id: string
          month: number
          record_data: Json
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          month: number
          record_data?: Json
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          month?: number
          record_data?: Json
          year?: number
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_details: Json | null
          payment_gateway: string | null
          processed_by_admin_id: string | null
          status: string | null
          timestamp: string | null
          transaction_id: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_details?: Json | null
          payment_gateway?: string | null
          processed_by_admin_id?: string | null
          status?: string | null
          timestamp?: string | null
          transaction_id?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_details?: Json | null
          payment_gateway?: string | null
          processed_by_admin_id?: string | null
          status?: string | null
          timestamp?: string | null
          transaction_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          category: string
          client: string
          created_at: string
          created_by: string | null
          id: string
          image_url: string
          project_url: string | null
          title: string
        }
        Insert: {
          category: string
          client: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url: string
          project_url?: string | null
          title: string
        }
        Update: {
          category?: string
          client?: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string
          project_url?: string | null
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          discord_invite_sent: boolean | null
          dob: string | null
          email: string
          email_verified: boolean | null
          full_name: string | null
          id: string
          is_active: boolean | null
          join_date: string | null
          phone: string | null
          registration_fee_paid: boolean | null
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          discord_invite_sent?: boolean | null
          dob?: string | null
          email: string
          email_verified?: boolean | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          join_date?: string | null
          phone?: string | null
          registration_fee_paid?: boolean | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          discord_invite_sent?: boolean | null
          dob?: string | null
          email?: string
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          join_date?: string | null
          phone?: string | null
          registration_fee_paid?: boolean | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      submissions: {
        Row: {
          client_accepted: boolean | null
          client_accepted_at: string | null
          client_accepted_by: string | null
          client_preference: boolean | null
          client_ref: string | null
          created_at: string
          designer_id: string
          files_urls: string[] | null
          final_approval_date: string | null
          id: string
          parent_submission_id: string | null
          ph_approved: boolean | null
          ph_approved_at: string | null
          ph_approved_by: string | null
          points_awarded: number | null
          project_name: string
          rejection_reason: string | null
          reviewer_id: string | null
          revisions_count: number | null
          service_type: string
          status: string | null
          submission_date: string | null
          updated_at: string
        }
        Insert: {
          client_accepted?: boolean | null
          client_accepted_at?: string | null
          client_accepted_by?: string | null
          client_preference?: boolean | null
          client_ref?: string | null
          created_at?: string
          designer_id: string
          files_urls?: string[] | null
          final_approval_date?: string | null
          id?: string
          parent_submission_id?: string | null
          ph_approved?: boolean | null
          ph_approved_at?: string | null
          ph_approved_by?: string | null
          points_awarded?: number | null
          project_name: string
          rejection_reason?: string | null
          reviewer_id?: string | null
          revisions_count?: number | null
          service_type: string
          status?: string | null
          submission_date?: string | null
          updated_at?: string
        }
        Update: {
          client_accepted?: boolean | null
          client_accepted_at?: string | null
          client_accepted_by?: string | null
          client_preference?: boolean | null
          client_ref?: string | null
          created_at?: string
          designer_id?: string
          files_urls?: string[] | null
          final_approval_date?: string | null
          id?: string
          parent_submission_id?: string | null
          ph_approved?: boolean | null
          ph_approved_at?: string | null
          ph_approved_by?: string | null
          points_awarded?: number | null
          project_name?: string
          rejection_reason?: string | null
          reviewer_id?: string | null
          revisions_count?: number | null
          service_type?: string
          status?: string | null
          submission_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_parent_submission_id_fkey"
            columns: ["parent_submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          action_type: string
          admin_id: string | null
          description: string | null
          id: string
          ip_address: unknown
          new_value: Json | null
          old_value: Json | null
          timestamp: string | null
        }
        Insert: {
          action_type: string
          admin_id?: string | null
          description?: string | null
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          timestamp?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string | null
          description?: string | null
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          timestamp?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          allow_messages: boolean | null
          created_at: string
          currency: string | null
          data_sharing: boolean | null
          email_notifications: boolean | null
          id: string
          marketing_emails: boolean | null
          payment_alerts: boolean | null
          profile_visibility: string | null
          project_updates: boolean | null
          push_notifications: boolean | null
          show_earnings: boolean | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_messages?: boolean | null
          created_at?: string
          currency?: string | null
          data_sharing?: boolean | null
          email_notifications?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          payment_alerts?: boolean | null
          profile_visibility?: string | null
          project_updates?: boolean | null
          push_notifications?: boolean | null
          show_earnings?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_messages?: boolean | null
          created_at?: string
          currency?: string | null
          data_sharing?: boolean | null
          email_notifications?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          payment_alerts?: boolean | null
          profile_visibility?: string | null
          project_updates?: boolean | null
          push_notifications?: boolean | null
          show_earnings?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "designer" | "superadmin" | "masteradmin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["designer", "superadmin", "masteradmin"],
    },
  },
} as const
