-- Client Dashboard V2 Additions: Support Tickets and Project Revisions

-- 1. Client Support Tickets Table
CREATE TABLE IF NOT EXISTS public.client_support_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.client_support_tickets ENABLE ROW LEVEL SECURITY;

-- Policies for Support Tickets
CREATE POLICY "Clients can view their own tickets" 
    ON public.client_support_tickets 
    FOR SELECT 
    USING (auth.jwt() ->> 'email' = client_email);

CREATE POLICY "Clients can create tickets" 
    ON public.client_support_tickets 
    FOR INSERT 
    WITH CHECK (auth.jwt() ->> 'email' = client_email);

CREATE POLICY "Admins can view and update all tickets" 
    ON public.client_support_tickets 
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('superadmin', 'masteradmin')
        )
    );

-- 2. Project Revisions Table
CREATE TABLE IF NOT EXISTS public.project_revisions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    client_email TEXT NOT NULL,
    feedback TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.project_revisions ENABLE ROW LEVEL SECURITY;

-- Policies for Project Revisions
CREATE POLICY "Clients can view their own revisions" 
    ON public.project_revisions 
    FOR SELECT 
    USING (auth.jwt() ->> 'email' = client_email);

CREATE POLICY "Clients can create revisions" 
    ON public.project_revisions 
    FOR INSERT 
    WITH CHECK (auth.jwt() ->> 'email' = client_email);

CREATE POLICY "Designers can view revisions for their submissions" 
    ON public.project_revisions 
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM submissions 
            WHERE submissions.id = project_revisions.submission_id 
            AND submissions.designer_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all revisions" 
    ON public.project_revisions 
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('superadmin', 'masteradmin')
        )
    );
