ALTER TABLE public.promo_popups
  ADD COLUMN expiry_date timestamptz;

-- Optional deadline for promo popups so admins can see time remaining in the promo manager.
