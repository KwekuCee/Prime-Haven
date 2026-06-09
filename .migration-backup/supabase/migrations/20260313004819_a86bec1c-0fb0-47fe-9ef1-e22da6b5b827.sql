CREATE POLICY "Anyone can submit a testimonial"
ON public.testimonials
FOR INSERT
TO anon
WITH CHECK (true);