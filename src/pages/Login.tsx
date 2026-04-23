import { useState, useEffect } from 'react';
import BrandLogo from '@/components/BrandLogo';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Loader2, LogIn, Sparkles } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { loginSchema, LoginFormData } from '@/lib/validations';
import { supabase } from '@/integrations/supabase/client';
import ResendVerificationEmail from '@/components/auth/ResendVerificationEmail';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { signIn, signOut, user, loading: authLoading } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    const handleExistingSession = async () => {
      if (!authLoading && user) {
        await signOut();
      }
    };
    handleExistingSession();
  }, [authLoading]);

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
      toast({ variant: 'destructive', title: 'Sign In Failed', description: errorMessage });
      return;
    }

    if (authData?.user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('email_verified')
        .eq('id', authData.user.id)
        .single();

      if (profileData && !profileData.email_verified) {
        await signOut();
        toast({
          variant: 'destructive',
          title: 'Email Not Verified',
          description: 'Please verify your email address before signing in. Check your inbox for the verification link.',
        });
        return;
      }

      toast({ title: 'Welcome back!', description: 'You have been signed in successfully.' });

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .single();

      if (roleData && (roleData.role === 'superadmin' || roleData.role === 'masteradmin')) {
        navigate('/superadmin');
      } else {
        // Check if user is a client
        const { data: clientOrder } = await supabase
          .from('client_orders')
          .select('id')
          .eq('client_email', data.email)
          .limit(1)
          .maybeSingle();

        if (clientOrder) {
          navigate('/client/dashboard');
        } else {
          // Check manual clients table
          const { data: clientRecord } = await supabase
            .from('clients')
            .select('id')
            .eq('email', data.email)
            .limit(1)
            .maybeSingle();

          if (clientRecord) {
            navigate('/client/dashboard');
          } else {
            navigate('/dashboard');
          }
        }
      }
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center relative z-0">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent relative overflow-hidden flex items-center justify-center p-4 z-0">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>

      <div className="w-full max-w-[440px] relative z-10">
        {/* Back link */}
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Card */}
        <div className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-xl p-8 shadow-2xl shadow-black/20">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-block mb-5">
              <BrandLogo height={36} />
            </Link>
            <div className="flex items-center justify-center gap-2 mb-2">
              <LogIn className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-heading font-bold">Welcome Back</h1>
            </div>
            <p className="text-sm text-muted-foreground">Sign in to your designer dashboard</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register('email')}
                className={`h-11 bg-background/60 border-border/60 focus:border-primary/50 focus:ring-primary/20 rounded-xl ${errors.email ? 'border-destructive' : ''}`}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:text-primary/80 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  {...register('password')}
                  className={`h-11 bg-background/60 border-border/60 focus:border-primary/50 focus:ring-primary/20 rounded-xl pr-10 ${errors.password ? 'border-destructive' : ''}`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-xl font-semibold text-sm shadow-lg shadow-primary/20"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          <div className="mt-5 text-center">
            <ResendVerificationEmail />
          </div>



          <div className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
              Not a member yet?{' '}
              <Link to="/register" className="text-primary hover:text-primary/80 font-semibold transition-colors">
                Join Prime Haven
              </Link>
            </p>
            <p className="text-xs text-muted-foreground">
              Admin?{' '}
              <Link to="/superadmin-login" className="text-primary/70 hover:text-primary transition-colors">
                Admin Portal
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
