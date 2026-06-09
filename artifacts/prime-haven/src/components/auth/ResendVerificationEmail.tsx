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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      toast({
        variant: 'destructive',
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-verification-email', {
        body: {
          email: email.toLowerCase(),
          // Server resolves user; safe placeholder since server validates UUID
          // We must look up userId before invoking — use a dedicated lookup endpoint via the same function
          // Instead, route via a small RPC-style request: server expects userId. We pass email-based lookup.
          lookupByEmail: true,
          fullName: 'Designer',
          redirectUrl: window.location.origin,
        },
      });

      if (error) {
        const msg = (data as any)?.error || error.message || 'send_failed';
        if (msg === 'payment_required') {
          toast({
            variant: 'destructive',
            title: 'Registration Fee Required',
            description: 'Complete your registration payment before verifying your email.',
          });
        } else if (msg === 'already_verified') {
          toast({ title: 'Already Verified', description: 'You can sign in directly.' });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: 'Verification Email Sent',
        description: 'If your account is eligible, a verification link is on its way. Check your inbox and spam folder.',
      });
      setIsOpen(false);
      setEmail('');
    } catch (err) {
      console.error('Resend verification error:', err);
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
              onKeyDown={(e) => { if (e.key === 'Enter' && !isLoading) handleResend(); }}
            />
          </div>
          <Button onClick={handleResend} disabled={isLoading} className="w-full">
            {isLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
            ) : (
              <><Mail className="w-4 h-4 mr-2" />Resend Verification Email</>
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
