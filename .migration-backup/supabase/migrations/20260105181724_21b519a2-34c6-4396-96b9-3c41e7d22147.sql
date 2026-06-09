-- Create role enum for the application
CREATE TYPE public.app_role AS ENUM ('designer', 'superadmin', 'masteradmin');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'designer',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Policies for user_roles table
CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Only masteradmin can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'masteradmin'))
WITH CHECK (public.has_role(auth.uid(), 'masteradmin'));

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    dob DATE,
    registration_fee_paid BOOLEAN DEFAULT false,
    join_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    discord_invite_sent BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Allow insert for authenticated users"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Create designer_details table
CREATE TABLE public.designer_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    professional_title TEXT,
    skills TEXT[] DEFAULT '{}',
    experience_level TEXT,
    available_hours INTEGER,
    portfolio_url TEXT,
    total_points INTEGER DEFAULT 0,
    monthly_points INTEGER DEFAULT 0,
    payment_method TEXT,
    payment_details JSONB,
    salary_estimated DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.designer_details ENABLE ROW LEVEL SECURITY;

-- Designer details policies
CREATE POLICY "Designers can view their own details"
ON public.designer_details FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all designer details"
ON public.designer_details FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Designers can update their own details"
ON public.designer_details FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any designer details"
ON public.designer_details FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Allow insert for authenticated designers"
ON public.designer_details FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create submissions table
CREATE TABLE public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    designer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    project_name TEXT NOT NULL,
    client_ref TEXT,
    service_type TEXT NOT NULL,
    files_urls TEXT[] DEFAULT '{}',
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'revision', 'rejected')),
    reviewer_id UUID REFERENCES auth.users(id),
    points_awarded INTEGER DEFAULT 0,
    client_preference BOOLEAN DEFAULT false,
    revisions_count INTEGER DEFAULT 0,
    final_approval_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Submissions policies
CREATE POLICY "Designers can view their own submissions"
ON public.submissions FOR SELECT
TO authenticated
USING (auth.uid() = designer_id);

CREATE POLICY "Admins can view all submissions"
ON public.submissions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Designers can create their own submissions"
ON public.submissions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = designer_id);

CREATE POLICY "Designers can update their own pending submissions"
ON public.submissions FOR UPDATE
TO authenticated
USING (auth.uid() = designer_id AND status = 'pending')
WITH CHECK (auth.uid() = designer_id);

CREATE POLICY "Admins can update any submission"
ON public.submissions FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Designers can delete their own pending submissions"
ON public.submissions FOR DELETE
TO authenticated
USING (auth.uid() = designer_id AND status = 'pending');

-- Create payments table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('registration', 'salary')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    transaction_id TEXT,
    payment_gateway TEXT,
    payment_details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    processed_by_admin_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Payments policies
CREATE POLICY "Users can view their own payments"
ON public.payments FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments"
ON public.payments FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can create their own payment records"
ON public.payments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Only admins can update payments"
ON public.payments FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'));

-- Create system_logs table
CREATE TABLE public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id),
    action_type TEXT NOT NULL,
    description TEXT,
    old_value JSONB,
    new_value JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ip_address INET
);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- System logs policies (only masteradmin can view)
CREATE POLICY "Only masteradmin can view system logs"
ON public.system_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'masteradmin'));

CREATE POLICY "Admins can create system logs"
ON public.system_logs FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'));

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
    );
    
    -- Assign default designer role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'designer');
    
    -- Create designer details
    INSERT INTO public.designer_details (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_designer_details_updated_at
    BEFORE UPDATE ON public.designer_details
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at
    BEFORE UPDATE ON public.submissions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();