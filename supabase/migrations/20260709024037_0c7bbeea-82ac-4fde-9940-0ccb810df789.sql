
-- 1) Tighten project_tips insert policy
DROP POLICY IF EXISTS "Anyone can create a tip" ON public.project_tips;

CREATE POLICY "Anyone can create a pending tip"
ON public.project_tips
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND transaction_id IS NULL
  AND amount IS NOT NULL
  AND amount > 0
  AND amount <= 100000
  AND designer_id IS NOT NULL
  AND project_id IS NOT NULL
);

-- 2) Restrict client-order-attachments uploads to service_role (edge functions)
DROP POLICY IF EXISTS "client_order_attachments_scoped_insert" ON storage.objects;
