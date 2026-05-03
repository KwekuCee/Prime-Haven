import { useState, useEffect } from 'react';
import BrandLogo from '@/components/BrandLogo';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Lock, CheckCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

const ResetPassword = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  const {
    register, handleSubmit, formState: { errors, isSubmitting }, watch,
  } = useForm<ResetPasswordData>({ resolver: zodResolver(resetPasswordSchema) });

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setIsValidSession(true);
      else toast({ variant: 'destructive', title: 'Invalid or Expired Link', description: 'This password reset link is invalid or has expired.' });
      setIsCheckingSession(false);
    };
    checkSession();
  }, [toast]);

  const onSubmit = async (data: ResetPasswordData) => {
    const { error } = await supabase.auth.updateUser({ password: data.password });
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to reset password.' });
      return;
    }
    setResetComplete(true);
    toast({ title: 'Password Updated', description: 'Your password has been changed successfully.' });
    setTimeout(() => { navigate('/dashboard'); }, 2000);
  };

  const getPasswordStrength = (password: string): number => {
    let s = 0;
    if (password.length >= 8) s++;
    if (password.length >= 12) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    return s;
  };

  const passwordStrength = getPasswordStrength(watch('password') || '');
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['', 'bg-destructive', 'bg-yellow-500', 'bg-green-500', 'bg-green-500'];

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-transparent relative z-0 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent relative z-0 overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>

      <div className="w-full max-w-[440px] relative z-10">
        <Link to="/login" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>

        <div className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-xl p-8 shadow-2xl shadow-black/20">
          <div className="text-center mb-8">
            <Link to="/" className="inline-block mb-5">
              <BrandLogo height={36} />
            </Link>

            {!isValidSession ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-7 h-7 text-destructive" />
                </div>
                <h1 className="text-2xl font-heading font-bold mb-2">Invalid Link</h1>
                <p className="text-sm text-muted-foreground mb-6">This password reset link is invalid or has expired.</p>
                <Link to="/forgot-password">
                  <Button className="w-full h-11 rounded-xl">Request New Reset Link</Button>
                </Link>
              </>
            ) : resetComplete ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-7 h-7 text-primary" />
                </div>
                <h1 className="text-2xl font-heading font-bold mb-2">Password Updated!</h1>
                <p className="text-sm text-muted-foreground mb-6">You'll be redirected to login shortly.</p>
                <Link to="/login">
                  <Button className="w-full h-11 rounded-xl">Go to Login</Button>
                </Link>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-7 h-7 text-primary" />
                </div>
                <h1 className="text-2xl font-heading font-bold mb-2">Reset Password</h1>
                <p className="text-sm text-muted-foreground">Choose a strong new password.</p>
              </>
            )}
          </div>

          {isValidSession && !resetComplete && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    {...register('password')}
                    className={`h-11 bg-background/60 border-border/60 focus:border-primary/50 focus:ring-primary/20 rounded-xl pr-10 ${errors.password ? 'border-destructive' : ''}`}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4].map((level) => (
                    <div key={level} className={`h-1 flex-1 rounded-full transition-colors ${passwordStrength >= level ? strengthColors[Math.min(level, passwordStrength)] : 'bg-muted'}`} />
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">{strengthLabels[passwordStrength] || 'Enter a password'}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    {...register('confirmPassword')}
                    className={`h-11 bg-background/60 border-border/60 focus:border-primary/50 focus:ring-primary/20 rounded-xl pr-10 ${errors.confirmPassword ? 'border-destructive' : ''}`}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
              </div>

              <Button type="submit" className="w-full h-11 rounded-xl font-semibold text-sm shadow-lg shadow-primary/20" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating...</> : 'Reset Password'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
