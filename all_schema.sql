-- ============================================
-- PRIME HAVEN - COMPLETE DATABASE SCHEMA
-- Generated: 2026-03-30
-- ============================================

-- ==================== EXTENSIONS ====================
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==================== ENUMS ====================
CREATE TYPE public.app_role AS ENUM ('designer', 'superadmin', 'masteradmin');

-- ==================== TABLES ====================

CREATE TABLE public.blog_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL,
  excerpt text NOT NULL,
  content text NOT NULL,
  cover_image_url text,
  category text NOT NULL DEFAULT 'news'::text,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_sponsored boolean NOT NULL DEFAULT false,
  sponsor_name text,
  affiliate_links jsonb DEFAULT '[]'::jsonb
);
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.client_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  client_email text NOT NULL,
  client_whatsapp text,
  service_type text NOT NULL,
  tier text NOT NULL,
  price numeric NOT NULL,
  description text,
  payment_status text NOT NULL DEFAULT 'pending'::text,
  payment_reference text,
  discord_posted boolean DEFAULT false,
  discord_message_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.client_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  client_name text NOT NULL,
  client_email text,
  client_whatsapp text,
  description text,
  category text NOT NULL DEFAULT 'web-development'::text,
  status text NOT NULL DEFAULT 'pending'::text,
  progress_percentage integer NOT NULL DEFAULT 0,
  tracking_token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'::text),
  budget text,
  deadline timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_projects ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  whatsapp text,
  company text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.consultation_bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  company_name text,
  service_interest text,
  preferred_date date NOT NULL,
  preferred_time text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.consultation_bookings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.designer_details (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  professional_title text,
  skills text[] DEFAULT '{}'::text[],
  experience_level text,
  available_hours integer,
  portfolio_url text,
  total_points integer DEFAULT 0,
  monthly_points integer DEFAULT 0,
  payment_method text,
  payment_details jsonb,
  salary_estimated numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  profile_photo_url text,
  talent_score numeric DEFAULT 0,
  talent_score_breakdown jsonb DEFAULT '{}'::jsonb,
  talent_score_updated_at timestamptz,
  salary_payment_status text DEFAULT 'unpaid'::text,
  salary_paid_at timestamptz,
  salary_paid_by uuid
);
ALTER TABLE public.designer_details ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.email_verification_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.job_contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  deadline timestamptz,
  budget text,
  requirements text,
  client_name text,
  reference_files text[],
  special_instructions text,
  discord_channel_id text,
  discord_message_id text,
  posted_by uuid,
  status text NOT NULL DEFAULT 'active'::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  active_designers_count integer NOT NULL DEFAULT 0,
  active_designer_ids uuid[] NOT NULL DEFAULT '{}'::uuid[]
);
ALTER TABLE public.job_contracts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  content text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.monthly_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  month integer NOT NULL,
  year integer NOT NULL,
  record_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.monthly_records ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.newsletter_subscribers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz
);
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL,
  status text DEFAULT 'pending'::text,
  transaction_id text,
  payment_gateway text,
  payment_details jsonb,
  timestamp timestamptz DEFAULT now(),
  processed_by_admin_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.portfolio_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  client text NOT NULL,
  category text NOT NULL,
  image_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  project_url text
);
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  phone text,
  dob date,
  registration_fee_paid boolean DEFAULT false,
  join_date timestamptz DEFAULT now(),
  discord_invite_sent boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  email_verified boolean DEFAULT false,
  username text
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.project_deliverables (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  title text NOT NULL,
  file_url text NOT NULL,
  description text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_deliverables ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.project_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  client_name text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_feedback ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.project_milestones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending'::text,
  sort_order integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.service_pricing (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_type text NOT NULL,
  service_label text NOT NULL,
  tier text NOT NULL DEFAULT 'basic'::text,
  price numeric NOT NULL DEFAULT 0,
  description text,
  features text[] DEFAULT '{}'::text[],
  is_active boolean NOT NULL DEFAULT true,
  discord_category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.service_pricing ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  designer_id uuid NOT NULL,
  project_name text NOT NULL,
  client_ref text,
  service_type text NOT NULL,
  files_urls text[] DEFAULT '{}'::text[],
  submission_date timestamptz DEFAULT now(),
  status text DEFAULT 'pending'::text,
  reviewer_id uuid,
  points_awarded integer DEFAULT 0,
  client_preference boolean DEFAULT false,
  revisions_count integer DEFAULT 0,
  final_approval_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  ph_approved boolean DEFAULT false,
  client_accepted boolean DEFAULT false,
  ph_approved_at timestamptz,
  client_accepted_at timestamptz,
  ph_approved_by uuid,
  client_accepted_by uuid,
  rejection_reason text,
  parent_submission_id uuid,
  design_link text
);
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.system_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid,
  action_type text NOT NULL,
  description text,
  old_value jsonb,
  new_value jsonb,
  timestamp timestamptz DEFAULT now(),
  ip_address inet
);
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key text NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  role_title text NOT NULL,
  bio text NOT NULL,
  photo_url text,
  display_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  position_level integer NOT NULL DEFAULT 99
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.testimonials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  company_role text,
  service_used text,
  rating integer NOT NULL DEFAULT 5,
  review_text text NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'designer'::app_role,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  theme text DEFAULT 'dark'::text,
  currency text DEFAULT 'ghs'::text,
  profile_visibility text DEFAULT 'public'::text,
  show_earnings boolean DEFAULT false,
  allow_messages boolean DEFAULT true,
  data_sharing boolean DEFAULT false,
  email_notifications boolean DEFAULT true,
  project_updates boolean DEFAULT true,
  payment_alerts boolean DEFAULT true,
  marketing_emails boolean DEFAULT false,
  push_notifications boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- ==================== UNIQUE CONSTRAINTS ====================
ALTER TABLE public.blog_posts ADD CONSTRAINT blog_posts_slug_key UNIQUE (slug);
ALTER TABLE public.client_projects ADD CONSTRAINT client_projects_tracking_token_key UNIQUE (tracking_token);
ALTER TABLE public.designer_details ADD CONSTRAINT designer_details_user_id_key UNIQUE (user_id);
ALTER TABLE public.email_verification_tokens ADD CONSTRAINT email_verification_tokens_token_key UNIQUE (token);
ALTER TABLE public.monthly_records ADD CONSTRAINT monthly_records_month_year_key UNIQUE (month, year);
ALTER TABLE public.newsletter_subscribers ADD CONSTRAINT newsletter_subscribers_email_key UNIQUE (email);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
ALTER TABLE public.service_pricing ADD CONSTRAINT service_pricing_service_type_tier_key UNIQUE (service_type, tier);
ALTER TABLE public.system_settings ADD CONSTRAINT system_settings_key_key UNIQUE (key);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_user_id_key UNIQUE (user_id);

-- ==================== FOREIGN KEYS ====================
ALTER TABLE public.designer_details ADD CONSTRAINT designer_details_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.();
ALTER TABLE public.payments ADD CONSTRAINT payments_processed_by_admin_id_fkey FOREIGN KEY (processed_by_admin_id) REFERENCES public.();
ALTER TABLE public.payments ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.();
ALTER TABLE public.portfolio_items ADD CONSTRAINT portfolio_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.();
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES public.();
ALTER TABLE public.project_deliverables ADD CONSTRAINT project_deliverables_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.();
ALTER TABLE public.project_feedback ADD CONSTRAINT project_feedback_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.();
ALTER TABLE public.project_milestones ADD CONSTRAINT project_milestones_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.();
ALTER TABLE public.submissions ADD CONSTRAINT submissions_designer_id_fkey FOREIGN KEY (designer_id) REFERENCES public.();
ALTER TABLE public.submissions ADD CONSTRAINT submissions_parent_submission_id_fkey FOREIGN KEY (parent_submission_id) REFERENCES public.();
ALTER TABLE public.submissions ADD CONSTRAINT submissions_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.();
ALTER TABLE public.system_logs ADD CONSTRAINT system_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.();
ALTER TABLE public.system_settings ADD CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.();
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.();

-- ==================== FUNCTIONS ====================
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
 RETURNS app_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
    );
    
    -- Assign default designer role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'designer');
    
    -- Create designer details
    INSERT INTO public.designer_details (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- ==================== TRIGGERS ====================
CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_designer_details_updated_at BEFORE UPDATE ON designer_details FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_contracts_updated_at BEFORE UPDATE ON job_contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_testimonials_updated_at BEFORE UPDATE ON testimonials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON blog_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_projects_updated_at BEFORE UPDATE ON client_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== RLS POLICIES ====================
CREATE POLICY "Admins can create blog posts" ON public.blog_posts AS RESTRICTIVE FOR INSERT TO {public} WITH CHECK ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can delete blog posts" ON public.blog_posts AS RESTRICTIVE FOR DELETE TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can update blog posts" ON public.blog_posts AS RESTRICTIVE FOR UPDATE TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can view all blog posts" ON public.blog_posts AS RESTRICTIVE FOR SELECT TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Published blog posts are viewable by everyone" ON public.blog_posts AS RESTRICTIVE FOR SELECT TO {public} USING ((is_published = true));
CREATE POLICY "Admins can update orders" ON public.client_orders AS RESTRICTIVE FOR UPDATE TO {authenticated} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can view all orders" ON public.client_orders AS RESTRICTIVE FOR SELECT TO {authenticated} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Anyone can create orders" ON public.client_orders AS RESTRICTIVE FOR INSERT TO {anon} WITH CHECK (true);
CREATE POLICY "Authenticated can create orders" ON public.client_orders AS RESTRICTIVE FOR INSERT TO {authenticated} WITH CHECK (true);
CREATE POLICY "Admins can manage client projects" ON public.client_projects AS RESTRICTIVE FOR ALL TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))) WITH CHECK ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can manage clients" ON public.clients AS RESTRICTIVE FOR ALL TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))) WITH CHECK ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can delete consultation bookings" ON public.consultation_bookings AS RESTRICTIVE FOR DELETE TO {authenticated} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can update consultation bookings" ON public.consultation_bookings AS RESTRICTIVE FOR UPDATE TO {authenticated} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can view all consultation bookings" ON public.consultation_bookings AS RESTRICTIVE FOR SELECT TO {authenticated} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Anyone can submit a consultation booking" ON public.consultation_bookings AS RESTRICTIVE FOR INSERT TO {public} WITH CHECK (true);
CREATE POLICY "Admins can delete designer details" ON public.designer_details AS RESTRICTIVE FOR DELETE TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can update any designer details" ON public.designer_details AS RESTRICTIVE FOR UPDATE TO {authenticated} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can view all designer details" ON public.designer_details AS RESTRICTIVE FOR SELECT TO {authenticated} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Allow insert for authenticated designers" ON public.designer_details AS RESTRICTIVE FOR INSERT TO {authenticated} WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Authenticated users can view all designer details for leaderboa" ON public.designer_details AS RESTRICTIVE FOR SELECT TO {authenticated} USING (true);
CREATE POLICY "Designers can update their own details" ON public.designer_details AS RESTRICTIVE FOR UPDATE TO {authenticated} USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Designers can view their own details" ON public.designer_details AS RESTRICTIVE FOR SELECT TO {authenticated} USING ((auth.uid() = user_id));
CREATE POLICY "Users can create their own tokens" ON public.email_verification_tokens AS RESTRICTIVE FOR INSERT TO {public} WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own tokens" ON public.email_verification_tokens AS RESTRICTIVE FOR DELETE TO {public} USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own tokens" ON public.email_verification_tokens AS RESTRICTIVE FOR SELECT TO {public} USING ((auth.uid() = user_id));
CREATE POLICY "Admins can create job contracts" ON public.job_contracts AS RESTRICTIVE FOR INSERT TO {public} WITH CHECK ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can delete job contracts" ON public.job_contracts AS RESTRICTIVE FOR DELETE TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can update job contracts" ON public.job_contracts AS RESTRICTIVE FOR UPDATE TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can view all job contracts" ON public.job_contracts AS RESTRICTIVE FOR SELECT TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Designers can view active job contracts" ON public.job_contracts AS RESTRICTIVE FOR SELECT TO {authenticated} USING (((status = 'active'::text) OR (status = 'in_progress'::text)));
CREATE POLICY "Users can delete their sent messages" ON public.messages AS RESTRICTIVE FOR DELETE TO {public} USING ((auth.uid() = sender_id));
CREATE POLICY "Users can mark received messages as read" ON public.messages AS RESTRICTIVE FOR UPDATE TO {public} USING ((auth.uid() = receiver_id));
CREATE POLICY "Users can send messages" ON public.messages AS RESTRICTIVE FOR INSERT TO {public} WITH CHECK ((auth.uid() = sender_id));
CREATE POLICY "Users can view their own messages" ON public.messages AS RESTRICTIVE FOR SELECT TO {public} USING (((auth.uid() = sender_id) OR (auth.uid() = receiver_id)));
CREATE POLICY "Only admins can delete monthly records" ON public.monthly_records AS RESTRICTIVE FOR DELETE TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Only admins can insert monthly records" ON public.monthly_records AS RESTRICTIVE FOR INSERT TO {public} WITH CHECK ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Only admins can view monthly records" ON public.monthly_records AS RESTRICTIVE FOR SELECT TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Service role can update monthly records" ON public.monthly_records AS RESTRICTIVE FOR UPDATE TO {public} USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete newsletter subscribers" ON public.newsletter_subscribers AS RESTRICTIVE FOR DELETE TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can update newsletter subscribers" ON public.newsletter_subscribers AS RESTRICTIVE FOR UPDATE TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can view newsletter subscribers" ON public.newsletter_subscribers AS RESTRICTIVE FOR SELECT TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Anyone can subscribe to newsletter" ON public.newsletter_subscribers AS RESTRICTIVE FOR INSERT TO {public} WITH CHECK (true);
CREATE POLICY "Admins can delete payments" ON public.payments AS RESTRICTIVE FOR DELETE TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can view all payments" ON public.payments AS RESTRICTIVE FOR SELECT TO {authenticated} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Only admins can update payments" ON public.payments AS RESTRICTIVE FOR UPDATE TO {authenticated} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Users can create their own payment records" ON public.payments AS RESTRICTIVE FOR INSERT TO {authenticated} WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view their own payments" ON public.payments AS RESTRICTIVE FOR SELECT TO {authenticated} USING ((auth.uid() = user_id));
CREATE POLICY "Admins can delete portfolio items" ON public.portfolio_items AS RESTRICTIVE FOR DELETE TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can insert portfolio items" ON public.portfolio_items AS RESTRICTIVE FOR INSERT TO {public} WITH CHECK ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can update portfolio items" ON public.portfolio_items AS RESTRICTIVE FOR UPDATE TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Portfolio items are viewable by everyone" ON public.portfolio_items AS RESTRICTIVE FOR SELECT TO {public} USING (true);
CREATE POLICY "Admins can delete profiles" ON public.profiles AS RESTRICTIVE FOR DELETE TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can update any profile" ON public.profiles AS RESTRICTIVE FOR UPDATE TO {authenticated} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can view all profiles" ON public.profiles AS RESTRICTIVE FOR SELECT TO {authenticated} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Allow insert for authenticated users" ON public.profiles AS RESTRICTIVE FOR INSERT TO {authenticated} WITH CHECK ((auth.uid() = id));
CREATE POLICY "Authenticated users can view all profiles for leaderboard" ON public.profiles AS RESTRICTIVE FOR SELECT TO {authenticated} USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles AS RESTRICTIVE FOR UPDATE TO {authenticated} USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));
CREATE POLICY "Users can view their own profile" ON public.profiles AS RESTRICTIVE FOR SELECT TO {authenticated} USING ((auth.uid() = id));
CREATE POLICY "Admins can manage deliverables" ON public.project_deliverables AS RESTRICTIVE FOR ALL TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))) WITH CHECK ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can manage feedback" ON public.project_feedback AS RESTRICTIVE FOR ALL TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))) WITH CHECK ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Anyone can submit feedback" ON public.project_feedback AS RESTRICTIVE FOR INSERT TO {public} WITH CHECK (true);
CREATE POLICY "Admins can manage milestones" ON public.project_milestones AS RESTRICTIVE FOR ALL TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))) WITH CHECK ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can delete pricing" ON public.service_pricing AS RESTRICTIVE FOR DELETE TO {authenticated} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can insert pricing" ON public.service_pricing AS RESTRICTIVE FOR INSERT TO {authenticated} WITH CHECK ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can update pricing" ON public.service_pricing AS RESTRICTIVE FOR UPDATE TO {authenticated} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can view all pricing" ON public.service_pricing AS RESTRICTIVE FOR SELECT TO {authenticated} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Anyone can view active pricing" ON public.service_pricing AS RESTRICTIVE FOR SELECT TO {public} USING ((is_active = true));
CREATE POLICY "Admins can delete any submission" ON public.submissions AS RESTRICTIVE FOR DELETE TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can update any submission" ON public.submissions AS RESTRICTIVE FOR UPDATE TO {authenticated} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can view all submissions" ON public.submissions AS RESTRICTIVE FOR SELECT TO {authenticated} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Designers can create their own submissions" ON public.submissions AS RESTRICTIVE FOR INSERT TO {authenticated} WITH CHECK ((auth.uid() = designer_id));
CREATE POLICY "Designers can delete their own pending submissions" ON public.submissions AS RESTRICTIVE FOR DELETE TO {authenticated} USING (((auth.uid() = designer_id) AND (status = 'pending'::text)));
CREATE POLICY "Designers can update their own pending submissions" ON public.submissions AS RESTRICTIVE FOR UPDATE TO {authenticated} USING (((auth.uid() = designer_id) AND (status = 'pending'::text))) WITH CHECK ((auth.uid() = designer_id));
CREATE POLICY "Designers can view their own submissions" ON public.submissions AS RESTRICTIVE FOR SELECT TO {authenticated} USING ((auth.uid() = designer_id));
CREATE POLICY "Admins can create system logs" ON public.system_logs AS RESTRICTIVE FOR INSERT TO {authenticated} WITH CHECK ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Authenticated users can insert system logs" ON public.system_logs AS RESTRICTIVE FOR INSERT TO {authenticated} WITH CHECK ((auth.uid() = admin_id));
CREATE POLICY "Only masteradmin can view system logs" ON public.system_logs AS RESTRICTIVE FOR SELECT TO {authenticated} USING (has_role(auth.uid(), 'masteradmin'::app_role));
CREATE POLICY "Only admins can insert system settings" ON public.system_settings AS RESTRICTIVE FOR INSERT TO {public} WITH CHECK ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Only admins can update system settings" ON public.system_settings AS RESTRICTIVE FOR UPDATE TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Only admins can view system settings" ON public.system_settings AS RESTRICTIVE FOR SELECT TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can delete team members" ON public.team_members AS RESTRICTIVE FOR DELETE TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can insert team members" ON public.team_members AS RESTRICTIVE FOR INSERT TO {public} WITH CHECK ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can update team members" ON public.team_members AS RESTRICTIVE FOR UPDATE TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can view all team members" ON public.team_members AS RESTRICTIVE FOR SELECT TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Team members are viewable by everyone" ON public.team_members AS RESTRICTIVE FOR SELECT TO {public} USING ((is_visible = true));
CREATE POLICY "Admins can delete testimonials" ON public.testimonials AS RESTRICTIVE FOR DELETE TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can insert testimonials" ON public.testimonials AS RESTRICTIVE FOR INSERT TO {public} WITH CHECK ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can update testimonials" ON public.testimonials AS RESTRICTIVE FOR UPDATE TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can view all testimonials" ON public.testimonials AS RESTRICTIVE FOR SELECT TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Anyone can submit a testimonial" ON public.testimonials AS RESTRICTIVE FOR INSERT TO {anon} WITH CHECK (true);
CREATE POLICY "Testimonials are viewable by everyone" ON public.testimonials AS RESTRICTIVE FOR SELECT TO {public} USING ((is_visible = true));
CREATE POLICY "Admins can delete user roles" ON public.user_roles AS RESTRICTIVE FOR DELETE TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can view all roles" ON public.user_roles AS RESTRICTIVE FOR SELECT TO {authenticated} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Only masteradmin can manage roles" ON public.user_roles AS RESTRICTIVE FOR ALL TO {authenticated} USING (has_role(auth.uid(), 'masteradmin'::app_role)) WITH CHECK (has_role(auth.uid(), 'masteradmin'::app_role));
CREATE POLICY "Users can view their own role" ON public.user_roles AS RESTRICTIVE FOR SELECT TO {authenticated} USING ((auth.uid() = user_id));
CREATE POLICY "Admins can view all user settings" ON public.user_settings AS RESTRICTIVE FOR SELECT TO {public} USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Users can insert their own settings" ON public.user_settings AS RESTRICTIVE FOR INSERT TO {public} WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own settings" ON public.user_settings AS RESTRICTIVE FOR UPDATE TO {public} USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own settings" ON public.user_settings AS RESTRICTIVE FOR SELECT TO {public} USING ((auth.uid() = user_id));

-- ==================== INDEXES ====================
CREATE UNIQUE INDEX blog_posts_pkey ON public.blog_posts USING btree (id);
CREATE UNIQUE INDEX blog_posts_slug_key ON public.blog_posts USING btree (slug);
CREATE UNIQUE INDEX client_orders_pkey ON public.client_orders USING btree (id);
CREATE UNIQUE INDEX client_projects_pkey ON public.client_projects USING btree (id);
CREATE UNIQUE INDEX client_projects_tracking_token_key ON public.client_projects USING btree (tracking_token);
CREATE UNIQUE INDEX clients_pkey ON public.clients USING btree (id);
CREATE UNIQUE INDEX consultation_bookings_pkey ON public.consultation_bookings USING btree (id);
CREATE UNIQUE INDEX designer_details_pkey ON public.designer_details USING btree (id);
CREATE UNIQUE INDEX designer_details_user_id_key ON public.designer_details USING btree (user_id);
CREATE UNIQUE INDEX email_verification_tokens_pkey ON public.email_verification_tokens USING btree (id);
CREATE UNIQUE INDEX email_verification_tokens_token_key ON public.email_verification_tokens USING btree (token);
CREATE INDEX idx_email_verification_tokens_token ON public.email_verification_tokens USING btree (token);
CREATE INDEX idx_email_verification_tokens_user ON public.email_verification_tokens USING btree (user_id);
CREATE UNIQUE INDEX job_contracts_pkey ON public.job_contracts USING btree (id);
CREATE INDEX idx_messages_receiver ON public.messages USING btree (receiver_id, created_at DESC);
CREATE INDEX idx_messages_sender ON public.messages USING btree (sender_id, created_at DESC);
CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id);
CREATE UNIQUE INDEX monthly_records_month_year_key ON public.monthly_records USING btree (month, year);
CREATE UNIQUE INDEX monthly_records_pkey ON public.monthly_records USING btree (id);
CREATE UNIQUE INDEX newsletter_subscribers_email_key ON public.newsletter_subscribers USING btree (email);
CREATE UNIQUE INDEX newsletter_subscribers_pkey ON public.newsletter_subscribers USING btree (id);
CREATE UNIQUE INDEX payments_pkey ON public.payments USING btree (id);
CREATE UNIQUE INDEX portfolio_items_pkey ON public.portfolio_items USING btree (id);
CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);
CREATE UNIQUE INDEX profiles_username_key ON public.profiles USING btree (username);
CREATE UNIQUE INDEX project_deliverables_pkey ON public.project_deliverables USING btree (id);
CREATE UNIQUE INDEX project_feedback_pkey ON public.project_feedback USING btree (id);
CREATE UNIQUE INDEX project_milestones_pkey ON public.project_milestones USING btree (id);
CREATE UNIQUE INDEX service_pricing_pkey ON public.service_pricing USING btree (id);
CREATE UNIQUE INDEX service_pricing_service_type_tier_key ON public.service_pricing USING btree (service_type, tier);
CREATE UNIQUE INDEX submissions_pkey ON public.submissions USING btree (id);
CREATE UNIQUE INDEX system_logs_pkey ON public.system_logs USING btree (id);
CREATE UNIQUE INDEX system_settings_key_key ON public.system_settings USING btree (key);
CREATE UNIQUE INDEX system_settings_pkey ON public.system_settings USING btree (id);
CREATE UNIQUE INDEX team_members_pkey ON public.team_members USING btree (id);
CREATE UNIQUE INDEX testimonials_pkey ON public.testimonials USING btree (id);
CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (id);
CREATE UNIQUE INDEX user_roles_user_id_role_key ON public.user_roles USING btree (user_id, role);
CREATE UNIQUE INDEX user_settings_pkey ON public.user_settings USING btree (id);
CREATE UNIQUE INDEX user_settings_user_id_key ON public.user_settings USING btree (user_id);

-- ==================== REALTIME ====================
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;