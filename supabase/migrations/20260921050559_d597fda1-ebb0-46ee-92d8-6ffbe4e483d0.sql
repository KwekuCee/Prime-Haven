CREATE TABLE public.hire_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text NOT NULL,
  email text NOT NULL,
  whatsapp text,
  service_slug text NOT NULL,
  service_label text,
  tier text,
  budget text,
  deadline date,
  brief text NOT NULL,
  reference_images text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'new',
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hire_requests TO authenticated;
GRANT ALL ON public.hire_requests TO service_role;

ALTER TABLE public.hire_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage hire requests"
ON public.hire_requests FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'masteradmin'))
WITH CHECK (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'masteradmin'));

CREATE TRIGGER update_hire_requests_updated_at
BEFORE UPDATE ON public.hire_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();