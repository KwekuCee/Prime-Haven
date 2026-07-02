
CREATE OR REPLACE FUNCTION public.validate_promo_code(p_code text)
RETURNS TABLE(code text, discount_percent integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT code, discount_percent
  FROM public.promo_codes
  WHERE code = upper(trim(p_code))
    AND is_active = true
    AND (expiry_date IS NULL OR expiry_date > now())
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.validate_promo_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_promo_code(text) TO anon, authenticated;
