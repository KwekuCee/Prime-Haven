import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logAuthEvent } from '@/lib/authLogger';

const adminLoginSchema = z.object({
  username: z.string().min(1, 'Username is required').max(50, 'Username too long'),
  password: z.string().min(1, 'Password is required'),
});

type AdminLoginForm = z.infer<typeof adminLoginSchema>;

const inputClass = (hasError?: boolean) =>
  `w-full bg-transparent border-b-2 px-0 py-3 focus:outline-none focus:border-primary transition-colors placeholder:text-foreground/20 font-body ${
    hasError ? 'border-destructive' : 'border-foreground'
  }`;

const AdminSignInForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginForm>({ resolver: zodResolver(adminLoginSchema) });

  const onSubmit = async (data: AdminLoginForm) => {
    setIsLoading(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('admin-login', {
        body: { username: data.username, password: data.password },
      });

      if (error) throw new Error('Authentication failed');

      if (!response?.success) {
        const errorMessage =
          response?.error === 'access_denied' ? 'You do not have admin access.' : 'Invalid username or password.';
        logAuthEvent('admin_login_failed', {
          description: `Admin login failed for "${data.username}": ${errorMessage}`,
        });
        toast({ variant: 'destructive', title: 'Access Denied', description: errorMessage });
        return;
      }

      logAuthEvent('admin_login_success', {
        user_id: response.user?.id,
        description: `Admin login: ${data.username}`,
      });

      if (response.session) {
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session) {
            subscription.unsubscribe();
            toast({ title: 'Access Granted', description: `Welcome back, ${response.user?.name || 'Admin'}!` });
            navigate('/superadmin', { replace: true });
          }
        });

        await supabase.auth.setSession({
          access_token: response.session.access_token,
          refresh_token: response.session.refresh_token,
        });
      }
    } catch (err) {
      console.error('Login error:', err);
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="admin-username" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Username
        </label>
        <input
          id="admin-username"
          type="text"
          autoComplete="username"
          placeholder="admin"
          {...register('username')}
          className={inputClass(!!errors.username)}
        />
        {errors.username && <p className="text-xs text-destructive mt-1">{errors.username.message}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="admin-password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Password
        </label>
        <div className="relative">
          <input
            id="admin-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            {...register('password')}
            className={`${inputClass(!!errors.password)} pr-10`}
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
        disabled={isLoading}
        className="w-full bg-foreground text-background py-4 px-6 mt-4 font-bold tracking-wide hover:bg-primary transition-all duration-300 cursor-pointer active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Verifying...
          </span>
        ) : (
          'ACCESS ADMIN PORTAL'
        )}
      </button>
    </form>
  );
};

export default AdminSignInForm;
