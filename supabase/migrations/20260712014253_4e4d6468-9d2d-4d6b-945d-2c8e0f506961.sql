-- Allow guest/authenticated free promo orders (100% discount) to be inserted with completed status
-- while price=0 and reference looks like a PH-FREE-* code. Paid orders still go through the edge function
-- which uses service_role (bypasses RLS) after verifying payment.

DROP POLICY IF EXISTS "Public can create orders" ON public.client_orders;
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.client_orders;

CREATE POLICY "Public can create orders"
ON public.client_orders
FOR INSERT
TO anon
WITH CHECK (
  client_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND char_length(client_email) BETWEEN 5 AND 254
  AND client_name IS NOT NULL
  AND char_length(client_name) BETWEEN 1 AND 200
  AND (client_whatsapp IS NULL OR char_length(client_whatsapp) <= 32)
  AND COALESCE(price, 0) >= 0
  AND COALESCE(price, 0) <= 1000000
  AND (description IS NULL OR char_length(description) <= 5000)
  AND (
    COALESCE(payment_status, 'pending') = 'pending'
    OR (
      payment_status = 'completed'
      AND COALESCE(price, 0) = 0
      AND payment_reference IS NOT NULL
      AND payment_reference LIKE 'PH-FREE-%'
    )
  )
);

CREATE POLICY "Authenticated users can create orders"
ON public.client_orders
FOR INSERT
TO authenticated
WITH CHECK (
  client_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND char_length(client_email) BETWEEN 5 AND 254
  AND client_name IS NOT NULL
  AND char_length(client_name) BETWEEN 1 AND 200
  AND (client_whatsapp IS NULL OR char_length(client_whatsapp) <= 32)
  AND COALESCE(price, 0) >= 0
  AND COALESCE(price, 0) <= 1000000
  AND (description IS NULL OR char_length(description) <= 5000)
  AND (
    COALESCE(payment_status, 'pending') = 'pending'
    OR (
      payment_status = 'completed'
      AND COALESCE(price, 0) = 0
      AND payment_reference IS NOT NULL
      AND payment_reference LIKE 'PH-FREE-%'
    )
  )
);