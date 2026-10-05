import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logAuthEvent } from '@/lib/authLogger';
import { checkRateLimit } from '@/lib/rateLimit';

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
      const limit = await checkRateLimit('admin_login', data.username);
      if (!limit.allowed) {
        toast({ variant: 'destructive', title: 'Too many attempts', description: limit.message });
        return;
      }

      const { data: rawResponse, error } = await supabase.functions.invoke('admin-login', {
        body: { username: data.username, password: data.password },
      });

      let response: any = rawResponse;
      if (error && (error as any).context && typeof (error as any).context.json === 'function') {
        try {
          response = await (error as any).context.json();
        } catch {
          // ignore JSON parse failure
        }
      }

      // Fallback to direct Supabase Auth when edge function is unreachable and user entered an email
      if (error && (!response || response.error === 'origin_not_allowed') && data.username.includes('@')) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: data.username.trim(),
          password: data.password,
        });

        if (authError || !authData.user) {
          logAuthEvent('admin_login_failed', {
            description: `Admin login failed for "${data.username}": Invalid username or password.`,
          });
          toast({ variant: 'destructive', title: 'Access Denied', description: 'Invalid username or password.' });
          return;
        }

        const { data: roleRows } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', authData.user.id);

        const roles = (roleRows || []).map((r: any) => String(r.role));
        if (!roles.includes('superadmin') && !roles.includes('masteradmin')) {
          await supabase.auth.signOut();
          toast({ variant: 'destructive', title: 'Access Denied', description: 'You do not have admin access.' });
          return;
        }

        logAuthEvent('admin_login_success', {
          user_id: authData.user.id,
          description: `Admin login: ${data.username}`,
        });
        toast({ title: 'Access Granted', description: 'Welcome back, Admin!' });
        navigate('/superadmin', { replace: true });
        return;
      }

      if (!response?.success) {
        const errorMessage =
          response?.error === 'access_denied'
            ? 'You do not have admin access.'
            : response?.error === 'rate_limited'
              ? 'Too many login attempts. Please wait a moment and try again.'
              : 'Invalid username or password.';
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
    } catch {
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
        className="w-full bg-[#0a0a0e] text-white dark:bg-primary dark:text-white py-4 px-6 mt-4 rounded-full font-bold tracking-wide hover:bg-primary dark:hover:bg-primary/90 dark:shadow-[0_12px_32px_-8px_hsla(13,100%,58%,0.55)] transition-all duration-300 cursor-pointer active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
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
