-- Allow all authenticated users to read designer_details for leaderboard
CREATE POLICY "Authenticated users can view all designer details for leaderboard"
ON public.designer_details
FOR SELECT
TO authenticated
USING (true);

-- Allow all authenticated users to read all profiles for leaderboard names
CREATE POLICY "Authenticated users can view all profiles for leaderboard"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);