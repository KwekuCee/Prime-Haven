-- APPLICANTS
CREATE TABLE public.applicants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  track text NOT NULL,
  cv_url text,
  portfolio_url text,
  portfolio_link text,
  status text NOT NULL DEFAULT 'submitted',
  access_token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  video_watched_at timestamp with time zone,
  score numeric,
  passed boolean,
  invited_at timestamp with time zone,
  payment_reference text,
  paid_at timestamp with time zone,
  user_id uuid,
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.applicants TO authenticated;
GRANT ALL ON public.applicants TO service_role;
ALTER TABLE public.applicants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage applicants" ON public.applicants
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'masteradmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'masteradmin'));

CREATE INDEX idx_applicants_status ON public.applicants(status);
CREATE INDEX idx_applicants_track ON public.applicants(track);
CREATE UNIQUE INDEX idx_applicants_token ON public.applicants(access_token);

CREATE TRIGGER update_applicants_updated_at BEFORE UPDATE ON public.applicants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- QUESTION BANK
CREATE TABLE public.assessment_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track text NOT NULL,
  question_type text NOT NULL DEFAULT 'multiple_choice',
  prompt text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_option integer,
  points integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_questions TO authenticated;
GRANT ALL ON public.assessment_questions TO service_role;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage assessment questions" ON public.assessment_questions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'masteradmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'masteradmin'));

CREATE INDEX idx_assessment_questions_track ON public.assessment_questions(track) WHERE is_active;

CREATE TRIGGER update_assessment_questions_updated_at BEFORE UPDATE ON public.assessment_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PRACTICAL TASKS
CREATE TABLE public.assessment_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track text NOT NULL,
  title text NOT NULL,
  brief text NOT NULL,
  submission_type text NOT NULL DEFAULT 'link',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_tasks TO authenticated;
GRANT SELECT ON public.assessment_tasks TO anon;
GRANT ALL ON public.assessment_tasks TO service_role;
ALTER TABLE public.assessment_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active practical briefs" ON public.assessment_tasks
  FOR SELECT USING (is_active);

CREATE POLICY "Admins manage practical briefs" ON public.assessment_tasks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'masteradmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'masteradmin'));

CREATE TRIGGER update_assessment_tasks_updated_at BEFORE UPDATE ON public.assessment_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- APPLICANT ASSESSMENTS
CREATE TABLE public.applicant_assessments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  applicant_id uuid NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
  track text NOT NULL,
  question_ids uuid[] NOT NULL DEFAULT '{}',
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  correct_count integer,
  total_questions integer,
  score numeric,
  passed boolean,
  practical_task_id uuid REFERENCES public.assessment_tasks(id),
  practical_url text,
  practical_text text,
  practical_review_status text NOT NULL DEFAULT 'pending',
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  submitted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.applicant_assessments TO authenticated;
GRANT ALL ON public.applicant_assessments TO service_role;
ALTER TABLE public.applicant_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage applicant assessments" ON public.applicant_assessments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'masteradmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'masteradmin'));

CREATE INDEX idx_applicant_assessments_applicant ON public.applicant_assessments(applicant_id);

CREATE TRIGGER update_applicant_assessments_updated_at BEFORE UPDATE ON public.applicant_assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();