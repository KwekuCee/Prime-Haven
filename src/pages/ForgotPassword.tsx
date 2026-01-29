import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Mail, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

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
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to send reset email. Please try again.',
      });
      return;
    }

    setEmailSent(true);
    toast({
      title: 'Reset Email Sent',
      description: 'Check your inbox for password reset instructions.',
    });
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Visual */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-primary/20 via-background to-background items-center justify-center p-12 relative overflow-hidden">
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
            Reset Your <span className="text-gradient">Password</span>
          </h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Don't worry, it happens to the best of us. Enter your email and we'll send you reset instructions.
          </p>
        </motion.div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col">
        <div className="p-6 border-b border-border">
          <Link to="/login" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>

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

            {emailSent ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-3xl font-heading font-bold mb-4">Check Your Email</h1>
                <p className="text-muted-foreground mb-6">
                  We've sent password reset instructions to{' '}
                  <span className="text-foreground font-medium">{getValues('email')}</span>
                </p>
                <p className="text-sm text-muted-foreground mb-8">
                  Didn't receive the email? Check your spam folder or try again.
                </p>
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setEmailSent(false)}
                  >
                    Try Different Email
                  </Button>
                  <Link to="/login">
                    <Button variant="primary" className="w-full">
                      Back to Login
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Mail className="w-8 h-8 text-primary" />
                  </div>
                  <h1 className="text-3xl font-heading font-bold mb-2">Forgot Password?</h1>
                  <p className="text-muted-foreground">
                    Enter your email address and we'll send you a link to reset your password.
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

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </Button>
                </form>

                <div className="mt-8 text-center">
                  <p className="text-muted-foreground">
                    Remember your password?{' '}
                    <Link to="/login" className="text-primary hover:underline font-medium">
                      Sign In
                    </Link>
                  </p>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
