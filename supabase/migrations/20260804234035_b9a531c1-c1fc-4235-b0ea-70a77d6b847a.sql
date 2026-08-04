DROP POLICY IF EXISTS "Anyone can submit a consultation booking" ON public.consultation_bookings;

CREATE POLICY "Anyone can submit a validated consultation booking"
  ON public.consultation_bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND full_name IS NOT NULL
    AND length(btrim(full_name)) BETWEEN 2 AND 100
    AND email IS NOT NULL
    AND length(email) <= 255
    AND email ~* '^[A-Za-z0-9._%%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND (phone IS NULL OR length(btrim(phone)) BETWEEN 5 AND 30)
    AND (company_name IS NULL OR length(company_name) <= 150)
    AND (service_interest IS NULL OR length(service_interest) <= 100)
    AND (message IS NULL OR length(message) <= 1000)
    AND preferred_time IS NOT NULL
    AND length(preferred_time) <= 30
    AND preferred_date IS NOT NULL
    AND preferred_date >= (CURRENT_DATE - INTERVAL '1 day')
  );

DROP POLICY IF EXISTS "Anyone can create a pending tip" ON public.project_tips;

CREATE POLICY "Anyone can create a validated pending tip"
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
    AND (
      client_email IS NULL
      OR (
        length(client_email) <= 255
        AND client_email ~* '^[A-Za-z0-9._%%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
      )
    )
    AND (client_name IS NULL OR length(btrim(client_name)) BETWEEN 1 AND 100)
    AND (message IS NULL OR length(message) <= 500)
    AND (currency IS NULL OR currency IN ('GHS','USD'))
  );
