import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
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

  // Sign out any existing user when visiting login page
  useEffect(() => {
    const handleExistingSession = async () => {
      if (!authLoading && user) {
        // If user is already logged in and visits login page, sign them out first
        // This ensures they can enter new credentials
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

      toast({
        variant: 'destructive',
        title: 'Sign In Failed',
        description: errorMessage,
      });
      return;
    }

    // Check if email is verified in profiles table
    if (authData?.user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('email_verified')
        .eq('id', authData.user.id)
        .single();

      if (profileData && !profileData.email_verified) {
        // Sign out the user since email is not verified
        await signOut();
        toast({
          variant: 'destructive',
          title: 'Email Not Verified',
          description: 'Please verify your email address before signing in. Check your inbox for the verification link.',
        });
        return;
      }

      toast({
        title: 'Welcome back!',
        description: 'You have been signed in successfully.',
      });

      // Check user role and navigate accordingly
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .single();

      if (roleData && (roleData.role === 'superadmin' || roleData.role === 'masteradmin')) {
        navigate('/superadmin');
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

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Visual */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-primary/20 via-background to-background items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center relative z-10"
        >
          <Link to="/" className="text-4xl font-heading font-bold inline-block mb-8">
            <span className="text-foreground">PRIME</span>
            <span className="text-gradient">HAVEN</span>
          </Link>
          <h2 className="text-3xl font-heading font-bold mb-4">
            Welcome <span className="text-gradient">Back</span>
          </h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Continue your creative journey and manage your projects from your personal dashboard.
          </p>
        </motion.div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        {/* Form Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-8">
              <Link to="/" className="text-3xl font-heading font-bold inline-block">
                <span className="text-foreground">PRIME</span>
                <span className="text-gradient">HAVEN</span>
              </Link>
            </div>

            <div className="text-center mb-8">
              <h1 className="text-3xl font-heading font-bold mb-2">Sign In</h1>
              <p className="text-muted-foreground">
                Access your designer dashboard
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...register('email')}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    {...register('password')}
                    className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <ResendVerificationEmail />
            </div>

            <div className="mt-4 text-center">
              <p className="text-muted-foreground">
                Not a member yet?{' '}
                <Link to="/register" className="text-primary hover:underline font-medium">
                  Join Prime Haven
                </Link>
              </p>
            </div>

            <div className="mt-4 text-center">
              <p className="text-muted-foreground text-sm">
                Admin access?{' '}
                <Link to="/superadmin-login" className="text-primary hover:underline font-medium">
                  Admin Portal
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Login;
