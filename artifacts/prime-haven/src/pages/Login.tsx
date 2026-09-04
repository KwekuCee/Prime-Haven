import { useState, useEffect, useRef } from 'react';
import BrandLogo from '@/components/BrandLogo';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Briefcase, Eye, EyeOff, Loader2, LogIn, Shield } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { loginSchema, LoginFormData } from '@/lib/validations';
import { supabase } from '@/integrations/supabase/client';
import ResendVerificationEmail from '@/components/auth/ResendVerificationEmail';
import ClientSignInForm from '@/components/auth/ClientSignInForm';
import AdminSignInForm from '@/components/auth/AdminSignInForm';
import { logAuthEvent } from '@/lib/authLogger';

type AuthMode = 'talent' | 'client' | 'admin';

const Login = () => {
  const [mode, setMode] = useState<AuthMode>('talent');
  const [showPassword, setShowPassword] = useState(false);
  const formPanelRef = useRef<HTMLDivElement>(null);
  const hasSwitchedMode = useRef(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signOut, loading: authLoading } = useAuth();

  // Same-origin relative next path (e.g. `/.lovable/oauth/consent?authorization_id=...`).
  const nextParam = searchParams.get('next');
  const safeNext = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : null;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    // Always require fresh credentials on the login page.
    // Sign out any existing session so users must re-enter email/password.
    signOut().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Move keyboard focus into the newly revealed form whenever the mode changes.
  useEffect(() => {
    if (!hasSwitchedMode.current) {
      hasSwitchedMode.current = true;
      return;
    }
    const panel = formPanelRef.current;
    if (!panel) return;
    const firstField = panel.querySelector<HTMLElement>('form input:not([type="hidden"]), form select, form textarea');
    (firstField ?? panel).focus({ preventScroll: true });
  }, [mode]);

  const onSubmit = async (data: LoginFormData) => {
    const { error, data: authData } = await signIn(data.email, data.password);

    if (error) {
      let errorMessage = 'An error occurred during sign in';
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Please verify your email address before signing in.';
      } else if (error.message.includes('Too many requests')) {
        errorMessage = 'Too many login attempts. Please wait a few minutes and try again.';
      } else {
        errorMessage = error.message;
      }
      logAuthEvent('login_failed', { email: data.email, description: `Failed login: ${errorMessage}` });
      toast({ variant: 'destructive', title: 'Sign In Failed', description: errorMessage });
      return;
    }

    if (authData?.user) {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      const role = roleData?.role as string | undefined;
      const isAdmin = role === 'superadmin' || role === 'masteradmin';
      const isClient = role === 'client';

      // Clients sign in immediately after paying and verify their email from
      // inside their portal, so the hard verification gate only applies to talent.
      if (!isAdmin && !isClient) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email_verified')
          .eq('id', authData.user.id)
          .single();

        if (profileData && !profileData.email_verified) {
          logAuthEvent('login_blocked_unverified', { email: data.email, user_id: authData.user.id });
          await signOut();
          toast({
            variant: 'destructive',
            title: 'Email Not Verified',
            description: 'Please verify your email address before signing in. Check your inbox for the verification link.',
          });
          return;
        }
      }

      logAuthEvent('login_success', { email: data.email, user_id: authData.user.id });
      toast({ title: 'Welcome back!', description: 'You have been signed in successfully.' });

      // Honor OAuth consent (and similar) return path when present.
      if (safeNext) {
        window.location.href = safeNext;
        return;
      }

      if (isAdmin) {
        navigate('/superadmin');
      } else if (isClient) {
        navigate('/client/dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const swapped = mode !== 'talent';

  const panelCopy = {
    talent: {
      heading: (
        <>
          Connecting <span className="text-primary">Ghana&apos;s</span> premier design{' '}
          <span className="italic">talent</span>.
        </>
      ),
      sub: 'Join the elite marketplace for creative professionals across West Africa.',
    },
    client: {
      heading: (
        <>
          Follow your <span className="text-primary">project</span> from brief to{' '}
          <span className="italic">delivery</span>.
        </>
      ),
      sub: 'Message the professional working on your project and approve the final work.',
    },
    admin: {
      heading: (
        <>
          The <span className="text-primary">control room</span> of Prime{' '}
          <span className="italic">Haven</span>.
        </>
      ),
      sub: 'Restricted access. Administrator credentials required.',
    },
  }[mode];

  const formHeading = {
    talent: { title: 'Talent Sign-in', sub: 'Welcome back to the haven.' },
    client: { title: 'Client Sign-in', sub: 'Sign in to your project portal.' },
    admin: { title: 'Admin Portal', sub: 'Authorised personnel only.' },
  }[mode];

  // Brand panel is rendered before or after the form panel in the DOM so that
  // tab order always follows the on-screen left-to-right order after the slide.
  const brandPanel = (
    <div
      className="hidden md:flex md:absolute md:inset-y-4 md:left-4 md:w-5/12 rounded-[2rem] bg-foreground p-12 lg:p-16 flex-col justify-between overflow-hidden motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-[cubic-bezier(0.76,0,0.24,1)]"
      style={{ transform: swapped ? 'translateX(calc(140% - 32px))' : 'translateX(0)' }}
      aria-hidden={false}
    >
      {/* Kente-inspired grid pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="kente-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M0 40L40 0M0 0l40 40" stroke="hsl(var(--primary))" strokeWidth="1" fill="none" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#kente-grid)" />
          </svg>
        </div>

        <div className="relative z-10">
          <Link to="/" className="inline-block">
            <BrandLogo variant="dark" height={36} />
          </Link>
        </div>

        <div className="relative z-10">
          <h1 className="text-4xl lg:text-5xl xl:text-6xl font-medium leading-[1.1] text-background font-heading tracking-tight">
            {panelCopy.heading}
          </h1>
        </div>

      <div className="relative z-10">
        <p className="text-background/60 text-sm max-w-xs">{panelCopy.sub}</p>
      </div>
    </div>
  );

  const formPanel = (
    <div
      className="w-full md:absolute md:inset-y-4 md:right-4 md:w-7/12 flex items-center justify-center p-6 md:p-12 lg:p-20 motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-[cubic-bezier(0.76,0,0.24,1)]"
      style={{ transform: swapped ? 'translateX(calc(-71.4286% + 32px))' : 'translateX(0)' }}
    >
      <div
        key={mode}
        ref={formPanelRef}
        tabIndex={-1}
        className="w-full max-w-md motion-safe:animate-fade-in focus:outline-none"
      >
          {/* Mobile logo */}
          <div className="md:hidden flex items-center gap-2 mb-12">
            <Link to="/" className="inline-block">
              <BrandLogo variant="light" height={32} />
            </Link>
          </div>

          <header className="mb-10">
            <div className="flex items-center gap-2 mb-2">
              {mode === 'admin' ? (
                <Shield className="w-5 h-5 text-primary" />
              ) : mode === 'client' ? (
                <Briefcase className="w-5 h-5 text-primary" />
              ) : (
                <LogIn className="w-5 h-5 text-primary" />
              )}
              <h2 className="text-3xl md:text-4xl font-semibold font-heading tracking-tight">{formHeading.title}</h2>
            </div>
            <p className="text-muted-foreground">{formHeading.sub}</p>
          </header>

          {mode === 'client' && <ClientSignInForm />}
          {mode === 'admin' && <AdminSignInForm />}

          {mode === 'talent' && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@talent.gh"
                  {...register('email')}
                  className={`w-full bg-transparent border-b-2 px-0 py-3 focus:outline-none focus:border-primary transition-colors placeholder:text-foreground/20 font-body ${
                    errors.email ? 'border-destructive' : 'border-foreground'
                  }`}
                />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-primary hover:underline underline-offset-4"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...register('password')}
                    className={`w-full bg-transparent border-b-2 px-0 py-3 focus:outline-none focus:border-primary transition-colors placeholder:text-foreground/20 font-body pr-10 ${
                      errors.password ? 'border-destructive' : 'border-foreground'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-foreground text-background py-4 px-6 mt-4 rounded-full font-bold tracking-wide hover:bg-primary transition-all duration-300 cursor-pointer active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  'LOG IN TO PORTAL'
                )}
              </button>

              <div className="pt-4 text-center">
                <ResendVerificationEmail />
              </div>
            </form>
          )}

          <div className="mt-16 pt-8 border-t border-border flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">New to Prime Haven?</span>
              <Link
                to="/register"
                className="text-sm font-bold border-b-2 border-primary pb-0.5 hover:text-primary transition-colors"
              >
                Register
              </Link>
            </div>

            <nav className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
              {mode !== 'talent' && (
                <button
                  type="button"
                  onClick={() => setMode('talent')}
                  className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest"
                >
                  Talent Sign-in
                </button>
              )}
              {mode !== 'client' && (
                <button
                  type="button"
                  onClick={() => setMode('client')}
                  className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest"
                >
                  Client Sign-in
                </button>
              )}
              {mode !== 'admin' && (
                <button
                  type="button"
                  onClick={() => setMode('admin')}
                  className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest"
                >
                  Admin Portal
                </button>
              )}
            </nav>
          </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-background font-body text-foreground selection:bg-primary selection:text-primary-foreground md:relative md:overflow-hidden flex flex-col md:block">
      {swapped ? (
        <>
          {formPanel}
          {brandPanel}
        </>
      ) : (
        <>
          {brandPanel}
          {formPanel}
        </>
      )}
    </div>
  );
};

export default Login;

