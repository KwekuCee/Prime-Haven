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
      affiliate_payouts: {
        Row: {
          affiliate_id: string
          amount: number
          created_at: string
          id: string
          status: string | null
        }
        Insert: {
          affiliate_id: string
          amount: number
          created_at?: string
          id?: string
          status?: string | null
        }
        Update: {
          affiliate_id?: string
          amount?: number
          created_at?: string
          id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payouts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_profiles: {
        Row: {
          clicks: number | null
          created_at: string
          id: string
          referral_code: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clicks?: number | null
          created_at?: string
          id?: string
          referral_code: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clicks?: number | null
          created_at?: string
          id?: string
          referral_code?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      affiliate_referrals: {
        Row: {
          affiliate_id: string
          client_name: string
          commission: number
          created_at: string
          id: string
          service_booked: string
          status: string | null
        }
        Insert: {
          affiliate_id: string
          client_name: string
          commission?: number
          created_at?: string
          id?: string
          service_booked: string
          status?: string | null
        }
        Update: {
          affiliate_id?: string
          client_name?: string
          commission?: number
          created_at?: string
          id?: string
          service_booked?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_referrals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          created_at: string | null
          criteria: Json
          description: string
          icon_name: string | null
          id: string
          key: string
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          criteria?: Json
          description: string
          icon_name?: string | null
          id?: string
          key: string
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          criteria?: Json
          description?: string
          icon_name?: string | null
          id?: string
          key?: string
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          affiliate_links: Json | null
          author_id: string | null
          category: string
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string
          id: string
          is_published: boolean
          is_sponsored: boolean
          published_at: string | null
          slug: string
          sponsor_name: string | null
          title: string
          updated_at: string
        }
        Insert: {
          affiliate_links?: Json | null
          author_id?: string | null
          category?: string
          content: string
          cover_image_url?: string | null
          created_at?: string
          excerpt: string
          id?: string
          is_published?: boolean
          is_sponsored?: boolean
          published_at?: string | null
          slug: string
          sponsor_name?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          affiliate_links?: Json | null
          author_id?: string | null
          category?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          is_published?: boolean
          is_sponsored?: boolean
          published_at?: string | null
          slug?: string
          sponsor_name?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_debts: {
        Row: {
          amount_owed: number
          client_name: string
          created_at: string
          id: string
          project_name: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          amount_owed?: number
          client_name: string
          created_at?: string
          id?: string
          project_name?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount_owed?: number
          client_name?: string
          created_at?: string
          id?: string
          project_name?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      client_orders: {
        Row: {
          assigned_designer_id: string | null
          claimed_at: string | null
          client_email: string
          client_name: string
          client_rating: number | null
          client_review: string | null
          client_whatsapp: string | null
          created_at: string
          deadline_at: string | null
          description: string | null
          discord_message_id: string | null
          discord_posted: boolean | null
          id: string
          payment_reference: string | null
          payment_status: string
          price: number
          project_status: string | null
          service_type: string
          tier: string
          updated_at: string
        }
        Insert: {
          assigned_designer_id?: string | null
          claimed_at?: string | null
          client_email: string
          client_name: string
          client_rating?: number | null
          client_review?: string | null
          client_whatsapp?: string | null
          created_at?: string
          deadline_at?: string | null
          description?: string | null
          discord_message_id?: string | null
          discord_posted?: boolean | null
          id?: string
          payment_reference?: string | null
          payment_status?: string
          price: number
          project_status?: string | null
          service_type: string
          tier: string
          updated_at?: string
        }
        Update: {
          assigned_designer_id?: string | null
          claimed_at?: string | null
          client_email?: string
          client_name?: string
          client_rating?: number | null
          client_review?: string | null
          client_whatsapp?: string | null
          created_at?: string
          deadline_at?: string | null
          description?: string | null
          discord_message_id?: string | null
          discord_posted?: boolean | null
          id?: string
          payment_reference?: string | null
          payment_status?: string
          price?: number
          project_status?: string | null
          service_type?: string
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_projects: {
        Row: {
          accepted_designer_id: string | null
          budget: string | null
          category: string
          client_email: string | null
          client_id: string | null
          client_name: string
          client_whatsapp: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string | null
          id: string
          max_assignees: number | null
          progress_percentage: number
          required_professions: string[] | null
          status: string
          tip_total: number
          title: string
          tracking_token: string
          updated_at: string
        }
        Insert: {
          accepted_designer_id?: string | null
          budget?: string | null
          category?: string
          client_email?: string | null
          client_id?: string | null
          client_name: string
          client_whatsapp?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          max_assignees?: number | null
          progress_percentage?: number
          required_professions?: string[] | null
          status?: string
          tip_total?: number
          title: string
          tracking_token?: string
          updated_at?: string
        }
        Update: {
          accepted_designer_id?: string | null
          budget?: string | null
          category?: string
          client_email?: string | null
          client_id?: string | null
          client_name?: string
          client_whatsapp?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          max_assignees?: number | null
          progress_percentage?: number
          required_professions?: string[] | null
          status?: string
          tip_total?: number
          title?: string
          tracking_token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_support_tickets: {
        Row: {
          client_email: string
          created_at: string
          description: string
          id: string
          status: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          client_email: string
          created_at?: string
          description: string
          id?: string
          status?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          client_email?: string
          created_at?: string
          description?: string
          id?: string
          status?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          is_primary: boolean
          name: string
          notes: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          notes?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          notes?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      consultation_bookings: {
        Row: {
          company_name: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          message: string | null
          phone: string | null
          preferred_date: string
          preferred_time: string
          service_interest: string | null
          status: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          message?: string | null
          phone?: string | null
          preferred_date: string
          preferred_time: string
          service_interest?: string | null
          status?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          message?: string | null
          phone?: string | null
          preferred_date?: string
          preferred_time?: string
          service_interest?: string | null
          status?: string
        }
        Relationships: []
      }
      designer_details: {
        Row: {
          available_hours: number | null
          created_at: string
          experience_level: string | null
          extra_profession_paid: boolean
          id: string
          monthly_points: number | null
          paid_professions: string[] | null
          payment_details: Json | null
          payment_method: string | null
          portfolio_url: string | null
          professional_title: string | null
          professions: string[] | null
          profile_photo_url: string | null
          salary_estimated: number | null
          salary_paid_at: string | null
          salary_paid_by: string | null
          salary_payment_status: string | null
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
          extra_profession_paid?: boolean
          id?: string
          monthly_points?: number | null
          paid_professions?: string[] | null
          payment_details?: Json | null
          payment_method?: string | null
          portfolio_url?: string | null
          professional_title?: string | null
          professions?: string[] | null
          profile_photo_url?: string | null
          salary_estimated?: number | null
          salary_paid_at?: string | null
          salary_paid_by?: string | null
          salary_payment_status?: string | null
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
          extra_profession_paid?: boolean
          id?: string
          monthly_points?: number | null
          paid_professions?: string[] | null
          payment_details?: Json | null
          payment_method?: string | null
          portfolio_url?: string | null
          professional_title?: string | null
          professions?: string[] | null
          profile_photo_url?: string | null
          salary_estimated?: number | null
          salary_paid_at?: string | null
          salary_paid_by?: string | null
          salary_payment_status?: string | null
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
      job_contract_claims: {
        Row: {
          claimed_at: string
          contract_id: string
          designer_id: string
          id: string
          status: string
        }
        Insert: {
          claimed_at?: string
          contract_id: string
          designer_id: string
          id?: string
          status?: string
        }
        Update: {
          claimed_at?: string
          contract_id?: string
          designer_id?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_contract_claims_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "job_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      job_contracts: {
        Row: {
          active_designer_ids: string[]
          active_designers_count: number
          budget: string | null
          category: string
          client_name: string | null
          created_at: string
          deadline: string | null
          description: string
          discord_channel_id: string | null
          discord_message_id: string | null
          id: string
          posted_by: string | null
          reference_files: string[] | null
          requirements: string | null
          special_instructions: string | null
          status: string
          target_professions: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          active_designer_ids?: string[]
          active_designers_count?: number
          budget?: string | null
          category: string
          client_name?: string | null
          created_at?: string
          deadline?: string | null
          description: string
          discord_channel_id?: string | null
          discord_message_id?: string | null
          id?: string
          posted_by?: string | null
          reference_files?: string[] | null
          requirements?: string | null
          special_instructions?: string | null
          status?: string
          target_professions?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          active_designer_ids?: string[]
          active_designers_count?: number
          budget?: string | null
          category?: string
          client_name?: string | null
          created_at?: string
          deadline?: string | null
          description?: string
          discord_channel_id?: string | null
          discord_message_id?: string | null
          id?: string
          posted_by?: string | null
          reference_files?: string[] | null
          requirements?: string | null
          special_instructions?: string | null
          status?: string
          target_professions?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketing_assets: {
        Row: {
          asset_type: string | null
          asset_url: string
          created_at: string
          description: string | null
          id: string
          title: string
        }
        Insert: {
          asset_type?: string | null
          asset_url: string
          created_at?: string
          description?: string | null
          id?: string
          title: string
        }
        Update: {
          asset_type?: string | null
          asset_url?: string
          created_at?: string
          description?: string | null
          id?: string
          title?: string
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
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          is_active: boolean
          subscribed_at: string
          unsubscribed_at: string | null
        }
        Insert: {
          email: string
          id?: string
          is_active?: boolean
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Update: {
          email?: string
          id?: string
          is_active?: boolean
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string
          read: boolean | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message: string
          read?: boolean | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string | null
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
          designer_id: string | null
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
          designer_id?: string | null
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
          designer_id?: string | null
          id?: string
          image_url?: string
          project_url?: string | null
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bio: string | null
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
          specialty: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          bio?: string | null
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
          specialty?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          bio?: string | null
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
          specialty?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      project_assignments: {
        Row: {
          created_at: string | null
          designer_id: string
          id: string
          project_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          designer_id: string
          id?: string
          project_id: string
          status?: string
        }
        Update: {
          created_at?: string | null
          designer_id?: string
          id?: string
          project_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          project_id: string
          sender_id: string | null
          sender_name: string | null
          sender_role: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          project_id: string
          sender_id?: string | null
          sender_name?: string | null
          sender_role: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          project_id?: string
          sender_id?: string | null
          sender_name?: string | null
          sender_role?: string
        }
        Relationships: []
      }
      project_deliverables: {
        Row: {
          description: string | null
          file_url: string
          id: string
          project_id: string
          title: string
          uploaded_at: string
        }
        Insert: {
          description?: string | null
          file_url: string
          id?: string
          project_id: string
          title: string
          uploaded_at?: string
        }
        Update: {
          description?: string | null
          file_url?: string
          id?: string
          project_id?: string
          title?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_deliverables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_feedback: {
        Row: {
          client_name: string
          content: string
          created_at: string
          id: string
          project_id: string
        }
        Insert: {
          client_name: string
          content: string
          created_at?: string
          id?: string
          project_id: string
        }
        Update: {
          client_name?: string
          content?: string
          created_at?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_feedback_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_messages: {
        Row: {
          attachments: string[] | null
          content: string
          created_at: string | null
          id: string
          order_id: string
          sender_id: string
        }
        Insert: {
          attachments?: string[] | null
          content: string
          created_at?: string | null
          id?: string
          order_id: string
          sender_id: string
        }
        Update: {
          attachments?: string[] | null
          content?: string
          created_at?: string | null
          id?: string
          order_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "client_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          project_id: string
          sort_order: number
          status: string
          title: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          project_id: string
          sort_order?: number
          status?: string
          title: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          project_id?: string
          sort_order?: number
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_revisions: {
        Row: {
          client_email: string
          created_at: string
          feedback: string
          id: string
          submission_id: string
        }
        Insert: {
          client_email: string
          created_at?: string
          feedback: string
          id?: string
          submission_id: string
        }
        Update: {
          client_email?: string
          created_at?: string
          feedback?: string
          id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_revisions_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tips: {
        Row: {
          amount: number
          client_email: string | null
          client_name: string | null
          created_at: string
          currency: string
          designer_id: string | null
          id: string
          message: string | null
          project_id: string
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          currency?: string
          designer_id?: string | null
          id?: string
          message?: string | null
          project_id: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          currency?: string
          designer_id?: string | null
          id?: string
          message?: string | null
          project_id?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string | null
          discount_percent: number
          expiry_date: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          discount_percent: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          discount_percent?: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      promo_email_signups: {
        Row: {
          captured_at: string
          email: string
          id: string
          ip: string | null
          popup_id: string | null
        }
        Insert: {
          captured_at?: string
          email: string
          id?: string
          ip?: string | null
          popup_id?: string | null
        }
        Update: {
          captured_at?: string
          email?: string
          id?: string
          ip?: string | null
          popup_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_email_signups_popup_id_fkey"
            columns: ["popup_id"]
            isOneToOne: false
            referencedRelation: "promo_popups"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_popups: {
        Row: {
          accent_color: string | null
          background_color: string | null
          collect_email: boolean
          created_at: string
          cta_label: string | null
          cta_url: string | null
          description: string | null
          expiry_date: string | null
          id: string
          image_url: string | null
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          background_color?: string | null
          collect_email?: boolean
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          background_color?: string | null
          collect_email?: boolean
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_pricing: {
        Row: {
          created_at: string
          description: string | null
          discord_category: string | null
          features: string[] | null
          id: string
          is_active: boolean
          price: number
          service_label: string
          service_type: string
          tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discord_category?: string | null
          features?: string[] | null
          id?: string
          is_active?: boolean
          price?: number
          service_label: string
          service_type: string
          tier?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discord_category?: string | null
          features?: string[] | null
          id?: string
          is_active?: boolean
          price?: number
          service_label?: string
          service_type?: string
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_promos: {
        Row: {
          created_at: string | null
          delay_ms: number | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          link_url: string | null
          target_audience: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delay_ms?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          target_audience?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delay_ms?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          target_audience?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      smm_analytics: {
        Row: {
          campaign_id: string
          followers_gained: number | null
          id: string
          platform: string
          recorded_at: string
          top_post_url: string | null
          total_engagement: number | null
          total_impressions: number | null
          total_posts: number | null
          total_reach: number | null
          week_start: string
        }
        Insert: {
          campaign_id: string
          followers_gained?: number | null
          id?: string
          platform: string
          recorded_at?: string
          top_post_url?: string | null
          total_engagement?: number | null
          total_impressions?: number | null
          total_posts?: number | null
          total_reach?: number | null
          week_start: string
        }
        Update: {
          campaign_id?: string
          followers_gained?: number | null
          id?: string
          platform?: string
          recorded_at?: string
          top_post_url?: string | null
          total_engagement?: number | null
          total_impressions?: number | null
          total_posts?: number | null
          total_reach?: number | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "smm_analytics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "smm_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      smm_campaign_posts: {
        Row: {
          campaign_id: string
          caption: string | null
          comments: number
          created_at: string
          engagement_data: Json | null
          id: string
          likes: number
          media_url: string | null
          notes: string | null
          platform: string
          platform_post_id: string | null
          post_type: string
          posted_at: string | null
          reach: number
          scheduled_at: string | null
          shares: number
          status: string
          updated_at: string
          views: number
        }
        Insert: {
          campaign_id: string
          caption?: string | null
          comments?: number
          created_at?: string
          engagement_data?: Json | null
          id?: string
          likes?: number
          media_url?: string | null
          notes?: string | null
          platform: string
          platform_post_id?: string | null
          post_type?: string
          posted_at?: string | null
          reach?: number
          scheduled_at?: string | null
          shares?: number
          status?: string
          updated_at?: string
          views?: number
        }
        Update: {
          campaign_id?: string
          caption?: string | null
          comments?: number
          created_at?: string
          engagement_data?: Json | null
          id?: string
          likes?: number
          media_url?: string | null
          notes?: string | null
          platform?: string
          platform_post_id?: string | null
          post_type?: string
          posted_at?: string | null
          reach?: number
          scheduled_at?: string | null
          shares?: number
          status?: string
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "smm_campaign_posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "smm_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      smm_campaigns: {
        Row: {
          campaign_name: string
          client_name: string | null
          contract_id: string | null
          created_at: string
          end_date: string | null
          goal: string | null
          id: string
          notes: string | null
          platforms: string[]
          smm_user_id: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          campaign_name: string
          client_name?: string | null
          contract_id?: string | null
          created_at?: string
          end_date?: string | null
          goal?: string | null
          id?: string
          notes?: string | null
          platforms?: string[]
          smm_user_id: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_name?: string
          client_name?: string | null
          contract_id?: string | null
          created_at?: string
          end_date?: string | null
          goal?: string | null
          id?: string
          notes?: string | null
          platforms?: string[]
          smm_user_id?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "smm_campaigns_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "job_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      smm_platform_connections: {
        Row: {
          access_token: string | null
          account_id: string | null
          account_name: string | null
          connected_at: string
          created_at: string
          expires_at: string | null
          followers_count: number | null
          id: string
          last_synced_at: string | null
          platform: string
          refresh_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          account_id?: string | null
          account_name?: string | null
          connected_at?: string
          created_at?: string
          expires_at?: string | null
          followers_count?: number | null
          id?: string
          last_synced_at?: string | null
          platform: string
          refresh_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          account_id?: string | null
          account_name?: string | null
          connected_at?: string
          created_at?: string
          expires_at?: string | null
          followers_count?: number | null
          id?: string
          last_synced_at?: string | null
          platform?: string
          refresh_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          client_accepted: boolean | null
          client_accepted_at: string | null
          client_accepted_by: string | null
          client_preference: boolean | null
          client_project_id: string | null
          client_ref: string | null
          created_at: string
          design_link: string | null
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
          client_project_id?: string | null
          client_ref?: string | null
          created_at?: string
          design_link?: string | null
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
          client_project_id?: string | null
          client_ref?: string | null
          created_at?: string
          design_link?: string | null
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
            foreignKeyName: "submissions_client_project_id_fkey"
            columns: ["client_project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
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
      team_members: {
        Row: {
          bio: string
          created_at: string
          display_order: number
          full_name: string
          id: string
          is_visible: boolean
          photo_url: string | null
          position_level: number
          role_title: string
          updated_at: string
        }
        Insert: {
          bio: string
          created_at?: string
          display_order?: number
          full_name: string
          id?: string
          is_visible?: boolean
          photo_url?: string | null
          position_level?: number
          role_title: string
          updated_at?: string
        }
        Update: {
          bio?: string
          created_at?: string
          display_order?: number
          full_name?: string
          id?: string
          is_visible?: boolean
          photo_url?: string | null
          position_level?: number
          role_title?: string
          updated_at?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          client_name: string
          company_role: string | null
          created_at: string
          created_by: string | null
          display_order: number | null
          id: string
          is_visible: boolean
          rating: number
          review_text: string
          service_used: string | null
          updated_at: string
        }
        Insert: {
          client_name: string
          company_role?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_visible?: boolean
          rating?: number
          review_text: string
          service_used?: string | null
          updated_at?: string
        }
        Update: {
          client_name?: string
          company_role?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_visible?: boolean
          rating?: number
          review_text?: string
          service_used?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          id: string
          meta: Json | null
          source: string | null
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          badge_id: string
          id?: string
          meta?: Json | null
          source?: string | null
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          badge_id?: string
          id?: string
          meta?: Json | null
          source?: string | null
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_payout_methods: {
        Row: {
          account_name: string
          created_at: string
          id: string
          is_default: boolean
          phone_number: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          created_at?: string
          id?: string
          is_default?: boolean
          phone_number: string
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          created_at?: string
          id?: string
          is_default?: boolean
          phone_number?: string
          provider?: string
          updated_at?: string
          user_id?: string
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
      visitor_analytics: {
        Row: {
          city: string | null
          country: string | null
          country_code: string | null
          created_at: string
          id: string
          ip_hash: string
          is_registered_user: boolean | null
          latitude: number | null
          longitude: number | null
          page_path: string
          region: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          ip_hash: string
          is_registered_user?: boolean | null
          latitude?: number | null
          longitude?: number | null
          page_path?: string
          region?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          ip_hash?: string
          is_registered_user?: boolean | null
          latitude?: number | null
          longitude?: number | null
          page_path?: string
          region?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          created_at: string
          currency: string
          failure_reason: string | null
          id: string
          korapay_reference: string | null
          payout_method_id: string
          processed_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          korapay_reference?: string | null
          payout_method_id: string
          processed_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          korapay_reference?: string | null
          payout_method_id?: string
          processed_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_payout_method_id_fkey"
            columns: ["payout_method_id"]
            isOneToOne: false
            referencedRelation: "user_payout_methods"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      leaderboard_designer_details: {
        Row: {
          experience_level: string | null
          monthly_points: number | null
          professional_title: string | null
          professions: string[] | null
          profile_photo_url: string | null
          skills: string[] | null
          talent_score: number | null
          total_points: number | null
          user_id: string | null
        }
        Insert: {
          experience_level?: string | null
          monthly_points?: number | null
          professional_title?: string | null
          professions?: string[] | null
          profile_photo_url?: string | null
          skills?: string[] | null
          talent_score?: number | null
          total_points?: number | null
          user_id?: string | null
        }
        Update: {
          experience_level?: string | null
          monthly_points?: number | null
          professional_title?: string | null
          professions?: string[] | null
          profile_photo_url?: string | null
          skills?: string[] | null
          talent_score?: number | null
          total_points?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      leaderboard_profiles: {
        Row: {
          full_name: string | null
          id: string | null
          username: string | null
        }
        Insert: {
          full_name?: string | null
          id?: string | null
          username?: string | null
        }
        Update: {
          full_name?: string | null
          id?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      allocate_client_acceptance_points: {
        Args: { p_designer_id: string; p_points: number }
        Returns: undefined
      }
      claim_project: { Args: { p_project_id: string }; Returns: undefined }
      generate_monthly_report_now: {
        Args: { p_month?: number; p_year?: number }
        Returns: undefined
      }
      get_pending_client_projects: {
        Args: never
        Returns: {
          budget: string
          category: string
          created_at: string
          deadline: string
          description: string
          id: string
          max_assignees: number
          required_professions: string[]
          status: string
          title: string
        }[]
      }
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
      notify_discord_order: {
        Args: {
          p_amount: number
          p_client_email: string
          p_client_name: string
          p_client_whatsapp?: string
          p_discord_category: string
          p_gateway?: string
          p_service_label: string
          p_service_type: string
          p_tier: string
        }
        Returns: undefined
      }
      process_affiliate_commission: {
        Args: {
          p_client_name: string
          p_commission: number
          p_ref_code: string
          p_service: string
        }
        Returns: undefined
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
