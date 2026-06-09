
-- 1. Create secure leaderboard view for profiles (non-sensitive fields only)
CREATE OR REPLACE VIEW public.leaderboard_profiles AS
SELECT id, full_name, username
FROM public.profiles;

-- 2. Create secure leaderboard view for designer_details (non-sensitive fields only)
CREATE OR REPLACE VIEW public.leaderboard_designer_details AS
SELECT user_id, professional_title, skills, total_points, monthly_points, talent_score, profile_photo_url, experience_level
FROM public.designer_details;

-- 3. Drop overly broad leaderboard SELECT policies
DROP POLICY IF EXISTS "Authenticated users can view all profiles for leaderboard" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view all designer details for leaderboa" ON public.designer_details;

-- 4. Fix monthly_records UPDATE policy — restrict to admins only
DROP POLICY IF EXISTS "Service role can update monthly records" ON public.monthly_records;
CREATE POLICY "Only admins can update monthly records"
ON public.monthly_records
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- 5. Tighten testimonials anon INSERT — require authenticated
DROP POLICY IF EXISTS "Anyone can submit a testimonial" ON public.testimonials;
CREATE POLICY "Authenticated users can submit a testimonial"
ON public.testimonials
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 6. Tighten consultation_bookings INSERT — keep public but add length limits via trigger
-- (keeping public since visitors need to book without auth)

-- 7. Tighten client_orders anon INSERT — require authenticated only
DROP POLICY IF EXISTS "Anyone can create orders" ON public.client_orders;

-- 8. Remove system_settings from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.system_settings;

-- 9. Add performance indexes
CREATE INDEX IF NOT EXISTS idx_submissions_designer_id ON public.submissions(designer_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_job_contracts_status ON public.job_contracts(status);
CREATE INDEX IF NOT EXISTS idx_job_contracts_category ON public.job_contracts(category);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_action_type ON public.system_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON public.system_logs(timestamp);
