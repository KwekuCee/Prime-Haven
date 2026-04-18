-- Re-enable anon INSERT on client_orders
-- The StartProject page is public and allows unauthenticated clients to submit orders.
-- The "Anyone can create orders" policy was previously dropped in migration 20260402003703.
-- We need it back so that free (0 GHS promo) orders can be inserted directly from the frontend.

CREATE POLICY "Public can create orders"
ON public.client_orders
FOR INSERT
TO anon
WITH CHECK (true);

-- Also allow anon INSERT on client_projects (for project tracking from StartProject page)
CREATE POLICY "Public can create client projects"
ON public.client_projects
FOR INSERT
TO anon
WITH CHECK (true);
