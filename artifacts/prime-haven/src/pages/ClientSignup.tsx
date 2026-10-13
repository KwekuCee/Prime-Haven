import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, MailCheck, UserPlus } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Seo from '@/components/Seo';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { checkRateLimit } from '@/lib/rateLimit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ClientSignup = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', whatsapp: '', company: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = form.email.trim().toLowerCase();
    const name = form.name.trim();
    if (!name || name.length > 200) return toast({ variant: 'destructive', title: 'Enter your name' });
    if (!EMAIL_RE.test(email)) return toast({ variant: 'destructive', title: 'Enter a valid email' });
    if (form.password.length < 8) return toast({ variant: 'destructive', title: 'Password must be at least 8 characters' });

    setSubmitting(true);
    try {
      const limit = await checkRateLimit('registration', email);
      if (!limit.allowed) {
        toast({ variant: 'destructive', title: 'Too many attempts', description: limit.message });
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/client/login`,
          data: {
            full_name: name,
            account_type: 'client',
            role: 'client',
            whatsapp: form.whatsapp.trim().slice(0, 40) || null,
            business_name: form.company.trim().slice(0, 200) || null,
          },
        },
      });
      if (error) throw error;

      // Add to the client list (no payment needed). Non-blocking.
      supabase.functions
        .invoke('capture-client-lead', {
          body: {
            clientEmail: email,
            clientName: name,
            clientWhatsapp: form.whatsapp.trim() || null,
            businessName: form.company.trim() || null,
          },
        })
        .catch(() => {});

      setSentTo(email);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Sign up failed', description: err?.message || 'Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      <Seo
        title="Create a Client Account | Prime Haven"
        description="Create your free Prime Haven client account. Explore services, estimate costs and pay only when you're ready to start a project."
        path="/client/signup"
      />
      <div className="w-full max-w-[460px]">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <div className="paper-card p-8 rounded-[2rem]">
          <div className="text-center mb-7">
            <Link to="/" className="inline-block mb-5"><BrandLogo height={56} /></Link>
            <div className="flex items-center justify-center gap-2 mb-2">
              <UserPlus className="w-5 h-5 text-primary" />
              <h1 className="text-3xl font-heading font-extrabold tracking-tight">Create a free account</h1>
            </div>
            <p className="text-sm text-muted-foreground">No payment needed. Sign up now, then pay for a service from your dashboard whenever you're ready.</p>
          </div>

          {sentTo ? (
            <div className="text-center space-y-4">
              <MailCheck className="w-10 h-10 text-primary mx-auto" />
              <p className="text-sm">We sent a confirmation link to <strong>{sentTo}</strong>. Click it, then sign in to your client dashboard.</p>
              <Button asChild className="w-full h-12 rounded-full"><Link to="/client/login">Go to sign in</Link></Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cs-name">Full name *</Label>
                <Input id="cs-name" value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={200} className="h-12 rounded-xl" autoComplete="name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cs-email">Email *</Label>
                <Input id="cs-email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} maxLength={255} className="h-12 rounded-xl" autoComplete="email" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cs-wa">WhatsApp</Label>
                  <Input id="cs-wa" type="tel" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} maxLength={40} placeholder="+233…" className="h-12 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cs-co">Business (optional)</Label>
                  <Input id="cs-co" value={form.company} onChange={(e) => set('company', e.target.value)} maxLength={200} className="h-12 rounded-xl" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cs-pw">Password *</Label>
                <Input id="cs-pw" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} minLength={8} className="h-12 rounded-xl" autoComplete="new-password" />
              </div>
              <Button type="submit" disabled={submitting} className="w-full h-12 rounded-full font-bold bg-foreground text-background hover:bg-foreground/90">
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating account…</> : 'Create free account'}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/client/login" className="text-primary font-semibold">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClientSignup;
