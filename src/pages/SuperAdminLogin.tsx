import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Shield, Crown, Lock, Building } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

const SUPER_ADMIN_CREDENTIALS = {
  admins: [
    { username: 'primehaven-admin', password: 'MasterAccess@2024', name: 'Master Administrator' },
    { username: 'ceo', password: 'CEOPrime@2024', name: 'CEO Access' },
    { username: 'admin', password: 'AdminSecure@2024', name: 'System Administrator' }
  ]
};

const superAdminLoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

type SuperAdminLoginForm = z.infer<typeof superAdminLoginSchema>;

const SuperAdminLogin = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Debug and auto-redirect if already authenticated
  useEffect(() => {
    console.log('🔍 SuperAdminLogin mounted');
    
    const authData = localStorage.getItem('superAdminAuth');
    if (authData) {
      try {
        const auth = JSON.parse(authData);
        const now = new Date().getTime();
        const oneHour = 60 * 60 * 1000;
        
        if (now - auth.timestamp < oneHour) {
          console.log('✅ Already authenticated, redirecting to /superadmin');
          navigate('/superadmin', { replace: true });
        } else {
          console.log('⚠️ Session expired, clearing auth');
          localStorage.removeItem('superAdminAuth');
        }
      } catch (error) {
        console.error('Auth parse error:', error);
        localStorage.removeItem('superAdminAuth');
      }
    }
  }, [navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SuperAdminLoginForm>({
    resolver: zodResolver(superAdminLoginSchema),
  });

  const onSubmit = async (data: SuperAdminLoginForm) => {
    setIsLoading(true);
    
    console.log('🔐 Login attempt for:', data.username);
    
    try {
      const validAdmin = SUPER_ADMIN_CREDENTIALS.admins.find(
        admin => admin.username === data.username && admin.password === data.password
      );

      if (validAdmin) {
        console.log('✅ Credentials valid, storing auth');
        
        // Clear any existing auth
        localStorage.removeItem('superAdminAuth');
        
        // Store new auth
        localStorage.setItem('superAdminAuth', JSON.stringify({
          isAuthenticated: true,
          username: validAdmin.username,
          name: validAdmin.name,
          timestamp: new Date().getTime()
        }));

        toast({
          title: 'Access Granted',
          description: `Welcome back, ${validAdmin.name}!`,
        });

        console.log('🔄 Navigating to /superadmin');
        
        // Small delay to ensure toast is visible
        setTimeout(() => {
          navigate('/superadmin', { replace: true });
        }, 100);
        
        return;
      } else {
        console.log('❌ Invalid credentials');
        toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: 'Invalid username or password.',
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        variant: 'destructive',
        title: 'Login Error',
        description: 'An error occurred during login.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
            onClick={(e) => {
              e.preventDefault();
              navigate(-1); // Go back in history
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Crown className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold">Prime Haven</h1>
              <p className="text-sm text-muted-foreground">Super Admin Portal</p>
            </div>
          </div>
        </div>

        <Card className="glass border-2 border-primary/20">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Secure Admin Access</CardTitle>
            <CardDescription>
              Enter administrator credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Admin Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="primehaven-admin"
                  {...register('username')}
                  className={errors.username ? 'border-destructive' : ''}
                  disabled={isLoading}
                />
                {errors.username && (
                  <p className="text-sm text-destructive">{errors.username.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Master Password</Label>
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
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
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
              <p className="text-sm text-muted-foreground">
                Test credentials: <span className="font-mono text-xs">primehaven-admin / MasterAccess@2024</span>
              </p>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Regular designer?{' '}
                <Link to="/login" className="text-primary hover:underline">
                  Login here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default SuperAdminLogin;