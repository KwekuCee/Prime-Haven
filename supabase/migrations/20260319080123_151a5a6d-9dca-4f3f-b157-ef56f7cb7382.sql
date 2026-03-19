
CREATE TABLE public.consultation_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  company_name text,
  service_interest text,
  preferred_date date NOT NULL,
  preferred_time text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.consultation_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a consultation booking"
  ON public.consultation_bookings
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins can view all consultation bookings"
  ON public.consultation_bookings
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins can update consultation bookings"
  ON public.consultation_bookings
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins can delete consultation bookings"
  ON public.consultation_bookings
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));
