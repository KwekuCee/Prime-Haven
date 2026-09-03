import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import BrandLogo from '@/components/BrandLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Seo from '@/components/Seo';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { loginSchema, LoginFormData } from '@/lib/validations';
import { supabase } from '@/integrations/supabase/client';

const ClientLogin = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { signIn, signOut, loading: authLoading } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    // Always require fresh credentials on a sign-in page.
    signOut().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (data: LoginFormData) => {
    const { error, data: authData } = await signIn(data.email, data.password);

    if (error) {
      let message = error.message;
      if (message.includes('Invalid login credentials')) {
        message = 'Invalid email or password. Use the email and password you set when you submitted your project.';
      } else if (message.includes('Email not confirmed')) {
        message = 'Please confirm your email address first — check your inbox for the link we sent you.';
      }
      toast({ variant: 'destructive', title: 'Sign In Failed', description: message });
      return;
    }

    if (!authData?.user) return;

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    const role = roleData?.role as string | undefined;

    if (role === 'superadmin' || role === 'masteradmin') {
      navigate('/superadmin');
      return;
    }

    if (role !== 'client') {
      toast({
        title: 'Talent account detected',
        description: 'This is the client portal. Taking you to your talent dashboard instead.',
      });
      navigate('/dashboard');
      return;
    }

    toast({ title: 'Welcome back!', description: 'Here are your projects.' });
    navigate('/client/dashboard');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      <Seo
        title="Client Sign In | Prime Haven"
        description="Sign in to your Prime Haven client portal to follow your project, message your professional and approve delivered work."
        noindex
      />
      <div className="w-full max-w-[440px]">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="paper-card p-8 rounded-[2rem]">
          <div className="text-center mb-8">
            <Link to="/" className="inline-block mb-5">
              <BrandLogo height={36} />
            </Link>
            <div className="flex items-center justify-center gap-2 mb-2">
              <LogIn className="w-5 h-5 text-primary" />
              <h1 className="text-3xl font-heading font-extrabold tracking-tight">Client Portal</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Track your project, talk to your professional and approve the final work.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                {...register('email')}
                className={`h-12 bg-background border-border/70 rounded-xl ${errors.email ? 'border-destructive' : ''}`}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:text-primary/80">Forgot password?</Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  {...register('password')}
                  className={`h-12 bg-background border-border/70 rounded-xl pr-10 ${errors.password ? 'border-destructive' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-full font-bold text-sm bg-foreground text-background hover:bg-foreground/90"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</>
              ) : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
              Haven't started a project yet?{' '}
              <Link to="/start-project" className="text-primary hover:text-primary/80 font-semibold">Start a project</Link>
            </p>
            <p className="text-xs text-muted-foreground">
              Prime Haven professional?{' '}
              <Link to="/login" className="text-primary/70 hover:text-primary">Talent sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientLogin;
