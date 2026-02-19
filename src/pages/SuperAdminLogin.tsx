import { useState } from 'react';
import BrandLogo from '@/components/BrandLogo';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Shield, Crown, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const superAdminLoginSchema = z.object({
  username: z.string().min(1, 'Username is required').max(50, 'Username too long'),
  password: z.string().min(1, 'Password is required')
});

type SuperAdminLoginForm = z.infer<typeof superAdminLoginSchema>;

const SuperAdminLogin = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SuperAdminLoginForm>({
    resolver: zodResolver(superAdminLoginSchema),
  });

  const onSubmit = async (data: SuperAdminLoginForm) => {
    setIsLoading(true);
    
    try {
      // Use the admin-login edge function for secure authentication
      const { data: response, error } = await supabase.functions.invoke('admin-login', {
        body: {
          username: data.username,
          password: data.password,
        },
      });

      if (error) {
        throw new Error('Authentication failed');
      }

      if (!response?.success) {
        const errorMessage = response?.error === 'access_denied' 
          ? 'You do not have admin access.'
          : 'Invalid username or password.';
        
        toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: errorMessage,
        });
        return;
      }

      // Set the session from the response and wait for auth state to update
      if (response.session) {
        // Set up a one-time listener for the auth state change
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session) {
            // Unsubscribe immediately after receiving the event
            subscription.unsubscribe();
            
            toast({
              title: 'Access Granted',
              description: `Welcome back, ${response.user?.name || 'Admin'}!`,
            });

            // Navigate after auth state is confirmed
            navigate('/superadmin', { replace: true });
          }
        });

        // Now set the session - this will trigger the auth state change
        await supabase.auth.setSession({
          access_token: response.session.access_token,
          refresh_token: response.session.refresh_token,
        });
      }

    } catch (error) {
      console.error('Login error:', error);
      toast({
        variant: 'destructive',
        title: 'Login Error',
        description: 'An error occurred during login. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
            onClick={(e) => {
              e.preventDefault();
              navigate(-1);
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          
          <div className="flex flex-col items-center gap-2 mb-4">
            <BrandLogo className="h-10 w-auto" />
            <p className="text-sm text-muted-foreground font-medium">Admin Portal</p>
          </div>
        </div>

        <Card className="glass border-2 border-primary/20">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Secure Admin Access</CardTitle>
            <CardDescription className="font-medium">
              Sign in with your admin credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="font-semibold">Username</Label>
                <div className="relative">
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter username"
                    {...register('username')}
                    className={`pl-10 ${errors.username ? 'border-destructive' : ''}`}
                    disabled={isLoading}
                    autoComplete="username"
                  />
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
                {errors.username && (
                  <p className="text-sm text-destructive font-medium">{errors.username.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="font-semibold">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    {...register('password')}
                    className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive font-medium">{errors.password.message}</p>
                )}
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Access Admin Dashboard
                    </>
                  )}
                </Button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground font-medium">
                Regular designer?{' '}
                <Link to="/login" className="text-primary hover:underline font-semibold">
                  Login here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
