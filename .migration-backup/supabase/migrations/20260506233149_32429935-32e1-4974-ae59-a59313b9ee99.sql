
CREATE TABLE public.promo_popups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text,
  cta_label text,
  cta_url text,
  collect_email boolean NOT NULL DEFAULT false,
  background_color text,
  accent_color text,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX promo_popups_only_one_active
  ON public.promo_popups (is_active)
  WHERE is_active = true;

ALTER TABLE public.promo_popups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active promo"
  ON public.promo_popups FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage promo popups"
  ON public.promo_popups FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'masteradmin'::app_role) OR public.has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'masteradmin'::app_role) OR public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER trg_promo_popups_updated_at
  BEFORE UPDATE ON public.promo_popups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.promo_email_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  popup_id uuid REFERENCES public.promo_popups(id) ON DELETE SET NULL,
  email text NOT NULL,
  ip text,
  captured_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX promo_email_signups_unique_per_popup
  ON public.promo_email_signups (popup_id, lower(email));

ALTER TABLE public.promo_email_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can submit email signups"
  ON public.promo_email_signups FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins view email signups"
  ON public.promo_email_signups FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'masteradmin'::app_role) OR public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins delete email signups"
  ON public.promo_email_signups FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'masteradmin'::app_role) OR public.has_role(auth.uid(), 'superadmin'::app_role));
