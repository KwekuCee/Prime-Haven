import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const ResendVerificationEmail = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleResend = async () => {
    if (!email) {
      toast({
        variant: 'destructive',
        title: 'Email Required',
        description: 'Please enter your email address.',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        variant: 'destructive',
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
      });
      return;
    }

    setIsLoading(true);

    try {
      // First, check if the user exists, is not verified, and has paid
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email_verified, registration_fee_paid')
        .eq('email', email.toLowerCase())
        .single();

      if (profileError || !profile) {
        // Don't reveal if email exists or not for security
        toast({
          title: 'Verification Email Sent',
          description: 'If this email is registered and unverified, you will receive a verification link shortly.',
        });
        setIsOpen(false);
        setEmail('');
        setIsLoading(false);
        return;
      }

      if (profile.email_verified) {
        toast({
          title: 'Already Verified',
          description: 'This email is already verified. You can sign in directly.',
        });
        setIsLoading(false);
        return;
      }

      if (!profile.registration_fee_paid) {
        toast({
          variant: 'destructive',
          title: 'Registration Fee Required',
          description: 'You must complete the registration fee payment before verifying your email. Please register again.',
        });
        setIsLoading(false);
        return;
      }

      // Send verification email
      const { data, error } = await supabase.functions.invoke('send-verification-email', {
        body: {
          email: email.toLowerCase(),
          fullName: profile.full_name || 'Designer',
          userId: profile.id,
          redirectUrl: window.location.origin,
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Verification Email Sent',
        description: 'Please check your inbox (and spam folder) for the verification link.',
      });
      setIsOpen(false);
      setEmail('');
    } catch (error) {
      console.error('Error resending verification email:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Send',
        description: 'Unable to send verification email. Please try again later.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button className="text-sm text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline">
          Didn't receive verification email?
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Resend Verification Email
          </DialogTitle>
          <DialogDescription>
            Enter your email address and we'll send you a new verification link.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="resend-email">Email Address</Label>
            <Input
              id="resend-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  handleResend();
                }
              }}
            />
          </div>
          <Button
            onClick={handleResend}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Resend Verification Email
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Check your spam folder if you don't see the email in your inbox.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ResendVerificationEmail;
