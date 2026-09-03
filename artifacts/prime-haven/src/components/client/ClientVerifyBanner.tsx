import { useEffect, useState } from 'react';
import { MailWarning, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

/**
 * Clients sign in right after paying, before their inbox is proven.
 * This nudges them to confirm their email address.
 */
const ClientVerifyBanner = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [needsVerify, setNeedsVerify] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('email_verified')
        .eq('id', user.id)
        .maybeSingle();
      if (!cancelled) setNeedsVerify(data ? !data.email_verified : false);
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

  const resend = async () => {
    if (!user?.email) return;
    setSending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: { emailRedirectTo: `${window.location.origin}/client/login` },
      });
      if (error) throw error;
      toast({ title: 'Verification email sent', description: `Check ${user.email} for the confirmation link.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could not send email', description: e.message });
    } finally {
      setSending(false);
    }
  };

  if (!needsVerify) return null;

  return (
    <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <MailWarning className="w-5 h-5 text-amber-600 shrink-0" />
      <p className="text-sm text-amber-800 flex-1">
        Please verify your email address so we can send you project updates and delivery notices.
      </p>
      <Button size="sm" variant="outline" onClick={resend} disabled={sending} className="rounded-full">
        {sending ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Sending</> : 'Resend link'}
      </Button>
    </div>
  );
};

export default ClientVerifyBanner;
