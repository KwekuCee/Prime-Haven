import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { loginSchema, LoginFormData } from '@/lib/validations';
import { supabase } from '@/integrations/supabase/client';

const inputClass = (hasError?: boolean) =>
  `w-full bg-transparent border-b-2 px-0 py-3 focus:outline-none focus:border-primary transition-colors placeholder:text-foreground/20 font-body ${
    hasError ? 'border-destructive' : 'border-foreground'
  }`;

const ClientSignInForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="client-email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Email Address
        </label>
        <input
          id="client-email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          {...register('email')}
          className={inputClass(!!errors.email)}
        />
        {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="client-password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Password
        </label>
        <div className="relative">
          <input
            id="client-password"
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
        disabled={isSubmitting}
        className="w-full bg-foreground text-background py-4 px-6 mt-4 font-bold tracking-wide hover:bg-primary transition-all duration-300 cursor-pointer active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Signing in...
          </span>
        ) : (
          'ENTER CLIENT PORTAL'
        )}
      </button>
    </form>
  );
};

export default ClientSignInForm;
