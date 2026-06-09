ALTER TABLE public.team_members ADD COLUMN position_level integer NOT NULL DEFAULT 99;

COMMENT ON COLUMN public.team_members.position_level IS 'Hierarchy level: 1=C-Suite, 2=VP, 3=Director, 4=Manager, 5=Lead, 99=Other';