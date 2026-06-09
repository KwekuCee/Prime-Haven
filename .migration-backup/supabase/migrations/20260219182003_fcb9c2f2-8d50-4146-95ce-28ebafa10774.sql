-- Create testimonials table for client reviews
CREATE TABLE public.testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  company_role TEXT,
  service_used TEXT,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable Row Level Security
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Public can view visible testimonials
CREATE POLICY "Testimonials are viewable by everyone"
ON public.testimonials
FOR SELECT
USING (is_visible = true);

-- Admins can view all testimonials
CREATE POLICY "Admins can view all testimonials"
ON public.testimonials
FOR SELECT
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Admins can insert testimonials
CREATE POLICY "Admins can insert testimonials"
ON public.testimonials
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Admins can update testimonials
CREATE POLICY "Admins can update testimonials"
ON public.testimonials
FOR UPDATE
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Admins can delete testimonials
CREATE POLICY "Admins can delete testimonials"
ON public.testimonials
FOR DELETE
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_testimonials_updated_at
BEFORE UPDATE ON public.testimonials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed a few starter testimonials
INSERT INTO public.testimonials (client_name, company_role, service_used, rating, review_text, display_order) VALUES
('Ama Boateng', 'CEO at TechStart Ghana', 'Web Development', 5, 'Prime Haven completely transformed our online presence. The team delivered a stunning website that exceeded our expectations. Their attention to detail and professionalism is unmatched.', 1),
('Kofi Mensah', 'Marketing Director, AfriBrand Co.', 'Graphic Design', 5, 'Working with Prime Haven was an absolute pleasure. They captured our brand identity perfectly and delivered high-quality designs within record time. Highly recommended!', 2),
('Sandra Owusu', 'Founder, StyleHaus', 'UI/UX Design', 5, 'The UI/UX team at Prime Haven redesigned our app and the results were phenomenal. User engagement shot up by 60% in the first month. They truly understand design.', 3);
