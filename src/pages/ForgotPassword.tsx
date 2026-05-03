import { useState } from 'react';
import BrandLogo from '@/components/BrandLogo';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Mail, CheckCircle, Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { logAuthEvent } from '@/lib/authLogger';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword = () => {
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();
  const { resetPassword } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordData) => {
    const { error } = await resetPassword(data.email);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to send reset email.' });
      return;
    }
    setEmailSent(true);
    toast({ title: 'Reset Email Sent', description: 'Check your inbox for password reset instructions.' });
  };

  return (
    <div className="min-h-screen bg-transparent relative overflow-hidden flex items-center justify-center p-4 z-0">
      {/* Background effects */}
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

            {emailSent ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-7 h-7 text-primary" />
                </div>
                <h1 className="text-2xl font-heading font-bold mb-2">Check Your Email</h1>
                <p className="text-sm text-muted-foreground">
                  We've sent reset instructions to{' '}
                  <span className="text-foreground font-medium">{getValues('email')}</span>
                </p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-7 h-7 text-primary" />
                </div>
                <h1 className="text-2xl font-heading font-bold mb-2">Forgot Password?</h1>
                <p className="text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>
              </>
            )}
          </div>

          {emailSent ? (
            <div className="space-y-3">
              <p className="text-xs text-center text-muted-foreground mb-4">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <Button variant="outline" className="w-full h-11 rounded-xl" onClick={() => setEmailSent(false)}>
                Try Different Email
              </Button>
              <Link to="/login" className="block">
                <Button className="w-full h-11 rounded-xl">Back to Login</Button>
              </Link>
            </div>
          ) : (
            <>
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

                <Button type="submit" className="w-full h-11 rounded-xl font-semibold text-sm shadow-lg shadow-primary/20" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" />Send Reset Link</>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Remember your password?{' '}
                  <Link to="/login" className="text-primary hover:text-primary/80 font-semibold transition-colors">Sign In</Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
