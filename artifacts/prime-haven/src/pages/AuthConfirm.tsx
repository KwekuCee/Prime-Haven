import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

type VerificationState = 'loading' | 'success' | 'error' | 'expired';

const AuthConfirm = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<VerificationState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setState('error');
        setErrorMessage('No verification token provided');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('verify-email', {
          body: { token },
        });

        if (error || !data?.success) {
          if (data?.error === 'expired') {
            setState('expired');
          } else {
            setState('error');
            setErrorMessage(data?.message || 'Verification failed');
          }
          return;
        }

        setState('success');
        
        // Auto-redirect after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (err) {
        console.error('Verification error:', err);
        setState('error');
        setErrorMessage('An unexpected error occurred');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[6px] spectrum-bar" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="paper-card p-8 rounded-[2rem] text-center">
          {/* Loading State */}
          {state === 'loading' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Loader2 className="w-16 h-16 text-primary mx-auto animate-spin mb-6" />
              <h1 className="text-2xl font-heading font-extrabold tracking-tight mb-2">Verifying Your Email</h1>
              <p className="text-muted-foreground">Please wait while we verify your email address...</p>
            </motion.div>
          )}

          {/* Success State */}
          {state === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 15 }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', damping: 10 }}
              >
                <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
              </motion.div>
              <h1 className="text-2xl font-heading font-extrabold tracking-tight mb-2">Email Verified!</h1>
              <p className="text-muted-foreground mb-6">
                Your email has been successfully verified. You can now access your dashboard.
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Redirecting to login in 3 seconds...
              </p>
              <Button onClick={() => navigate('/login')} variant="primary" className="group">
                Go to Login
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
          )}

          {/* Expired State */}
          {state === 'expired' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
              <h1 className="text-2xl font-heading font-extrabold tracking-tight mb-2">Link Expired</h1>
              <p className="text-muted-foreground mb-6">
                This verification link has expired. Verification links are valid for 24 hours.
              </p>
              <Button onClick={() => navigate('/login')} variant="outline">
                Go to Login
              </Button>
            </motion.div>
          )}

          {/* Error State */}
          {state === 'error' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <XCircle className="w-16 h-16 text-destructive mx-auto mb-6" />
              <h1 className="text-2xl font-heading font-extrabold tracking-tight mb-2">Verification Failed</h1>
              <p className="text-muted-foreground mb-6">
                {errorMessage || 'We could not verify your email. The link may be invalid or already used.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => navigate('/login')} variant="outline">
                  Go to Login
                </Button>
                <Button onClick={() => navigate('/register')} variant="primary">
                  Register Again
                </Button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-muted-foreground text-sm mt-6">
          Need help? Contact us at{' '}
          <a href="mailto:info@primehaven.tech" className="text-primary hover:underline">
            info@primehaven.tech
          </a>
        </p>
      </motion.div>
    </div>
  );
};

export default AuthConfirm;
