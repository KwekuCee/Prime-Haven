-- Create portfolio_items table for company works display
CREATE TABLE public.portfolio_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  client TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

-- Everyone can view portfolio items (they're public on the website)
CREATE POLICY "Portfolio items are viewable by everyone"
ON public.portfolio_items
FOR SELECT
USING (true);

-- Only admins can insert portfolio items
CREATE POLICY "Admins can insert portfolio items"
ON public.portfolio_items
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'masteradmin') OR has_role(auth.uid(), 'superadmin')
);

-- Only admins can update portfolio items
CREATE POLICY "Admins can update portfolio items"
ON public.portfolio_items
FOR UPDATE
USING (
  has_role(auth.uid(), 'masteradmin') OR has_role(auth.uid(), 'superadmin')
);

-- Only admins can delete portfolio items
CREATE POLICY "Admins can delete portfolio items"
ON public.portfolio_items
FOR DELETE
USING (
  has_role(auth.uid(), 'masteradmin') OR has_role(auth.uid(), 'superadmin')
);