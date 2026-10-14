import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Upload, FileText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { checkRateLimit } from '@/lib/rateLimit';
import { TALENT_TRACKS, uploadApplicantFile, type TalentTrack } from '@/lib/applicants';
import BrandLogo from '@/components/BrandLogo';
import ThemeToggle from '@/components/ThemeToggle';
import Seo from '@/components/Seo';

const inputClass = 'h-12 bg-background border-border/70 focus:border-primary/50 rounded-xl';
const labelClass = 'text-xs font-medium text-muted-foreground uppercase tracking-wider';

const MAX_FILE_MB = 25;

const Apply = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const requestedTrack = searchParams.get('track') || '';
  const initialTrack = TALENT_TRACKS.includes(requestedTrack) ? requestedTrack : '';
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    track: initialTrack as TalentTrack | '',
    portfolioLink: '',
    promoCode: '',
  });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [promoChecking, setPromoChecking] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState<number | null>(null);
  const [continuing, setContinuing] = useState(false);
  const [continueSent, setContinueSent] = useState(false);
  const [applicationMode, setApplicationMode] = useState<'new' | 'continue'>('new');
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const applyPromoCode = async () => {
    const code = form.promoCode.trim().toUpperCase();
    if (!code) {
      setPromoDiscount(null);
      return;
    }
    setPromoChecking(true);
    try {
      const { data, error } = await supabase.rpc('validate_promo_code', { p_code: code });
      if (error) throw error;
      const promo = Array.isArray(data) ? data[0] : data;
      if (!promo || !Number.isInteger(promo.discount_percent) || promo.discount_percent < 0 || promo.discount_percent > 100) {
        setPromoDiscount(null);
        toast({ variant: 'destructive', title: 'Invalid promo code', description: 'This code is invalid or has an unsupported discount.' });
        return;
      }
      set('promoCode', code);
      setPromoDiscount(promo.discount_percent);
      toast({ title: 'Promo code applied', description: `${promo.discount_percent}% off your registration fee if you pass screening.` });
    } catch {
      setPromoDiscount(null);
      toast({ variant: 'destructive', title: 'Could not validate code', description: 'Please try again in a moment.' });
    } finally {
      setPromoChecking(false);
    }
  };

  const continueOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = form.fullName.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    if (fullName.length < 2) {
      toast({ variant: 'destructive', title: 'Full name required', description: 'Enter the full name used on your application.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ variant: 'destructive', title: 'Email required', description: 'Enter the email address you used to apply.' });
      return;
    }
    if (phone.replace(/\D/g, '').length < 7) {
      toast({ variant: 'destructive', title: 'Contact required', description: 'Enter the phone or WhatsApp number used on your application.' });
      return;
    }

    setContinuing(true);
    try {
      const { data, error } = await supabase.functions.invoke('continue-applicant-onboarding', {
        body: { fullName, email, phone },
      });
      if (error || !(data as { success?: boolean } | null)?.success) {
        let message = (data as { message?: string } | null)?.message || 'Please wait a moment and try again.';
        const context = (error as { context?: { json?: () => Promise<{ message?: string }> } } | null)?.context;
        if (context?.json) {
          try {
            message = (await context.json()).message || message;
          } catch {
            // Keep the fallback message when the response is not JSON.
          }
        }
        toast({ variant: 'destructive', title: 'Could not continue onboarding', description: message });
        return;
      }
      const result = data as { portalPath?: string; status?: string; message?: string };
      if (result.portalPath && result.portalPath.startsWith('/applicant/')) {
        window.location.assign(result.portalPath);
        return;
      }
      if (result.status === 'submitted') {
        toast({ title: 'Application under review', description: result.message || 'We will email you once you are invited to the next stage.' });
        return;
      }
      setContinueSent(true);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not continue onboarding',
        description: err instanceof Error ? err.message : 'Please wait a moment and try again.',
      });
    } finally {
      setContinuing(false);
    }
  };

  const pickFile = (which: 'cv' | 'portfolio') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.size > MAX_FILE_MB * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: `Please keep files under ${MAX_FILE_MB}MB.` });
      e.target.value = '';
      return;
    }
    if (which === 'cv') setCvFile(file);
    else setPortfolioFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.fullName.trim().length < 2) {
      toast({ variant: 'destructive', title: 'Name required', description: 'Please enter your full name.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast({ variant: 'destructive', title: 'Email required', description: 'Please enter a valid email address.' });
      return;
    }
    if (!form.track) {
      toast({ variant: 'destructive', title: 'Choose a track', description: 'Tell us which role you are applying for.' });
      return;
    }
    if (!cvFile) {
      toast({ variant: 'destructive', title: 'CV required', description: 'Please attach your CV.' });
      return;
    }
    if (!portfolioFile && !form.portfolioLink.trim()) {
      toast({ variant: 'destructive', title: 'Portfolio required', description: 'Attach a portfolio file or paste a link.' });
      return;
    }

    const limit = await checkRateLimit('talent_application', form.email.trim().toLowerCase());
    if (!limit.allowed) {
      toast({ variant: 'destructive', title: 'Too many attempts', description: limit.message });
      return;
    }

    setSubmitting(true);
    try {
      const cvUrl = await uploadApplicantFile('cv', cvFile);
      const portfolioUrl = portfolioFile ? await uploadApplicantFile('portfolio', portfolioFile) : null;

      const { data, error } = await supabase.functions.invoke('submit-application', {
        body: {
          fullName: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || null,
          track: form.track,
          cvUrl,
          portfolioUrl,
          portfolioLink: form.portfolioLink.trim() || null,
          promoCode: form.promoCode.trim().toUpperCase() || null,
        },
      });

      const payload = (data as { success?: boolean; message?: string }) || {};
      if (error || !payload.success) {
        let message = payload.message || 'We could not submit your application. Please try again.';
        const ctx = (error as { context?: { json?: () => Promise<any> } } | null)?.context;
        if (ctx?.json) {
          try {
            const body = await ctx.json();
            if (body?.message) message = body.message;
          } catch {
            /* ignore */
          }
        }
        toast({ variant: 'destructive', title: 'Application not sent', description: message });
        return;
      }

      setDone(true);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Something went wrong',
        description: err instanceof Error ? err.message : 'Please try again in a moment.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Seo title="Application received | Prime Haven" description="Your Prime Haven talent application has been received." path="/apply" noindex />
        <div className="w-full max-w-lg text-center rounded-3xl border border-border/60 bg-card p-10 shadow-sm">
          <CheckCircle2 className="w-14 h-14 text-primary mx-auto mb-5" />
          <h1 className="text-2xl font-bold mb-3">Application received</h1>
          <p className="text-muted-foreground mb-6">
            Thanks, {form.fullName.split(' ')[0]}. We review every application by hand. If your work fits what we
            deliver, we'll email you a private link to the next stage — a short intro video and a skills assessment.
          </p>
          <Button asChild className="rounded-xl">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4">
      <Seo
        title="Apply to join Prime Haven | Graphic Design, Web Development & UI/UX"
        description="Apply to work with Prime Haven as a graphic designer, web developer or UI/UX designer. Submit your CV and portfolio, take a short skills assessment and join our professional team."
        path="/apply"
      />

      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <ThemeToggle showLabel />
        </div>

        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <BrandLogo height={56} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Apply to join Prime Haven</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            We hire across every service we deliver — graphic design, UI/UX, web and app development, motion graphics,
            video editing, social media management and IT solutions. No interviews: send your work, then take a short
            assessment for your track. Strong results move straight to onboarding.
          </p>
        </div>

        <Tabs
          value={applicationMode}
          onValueChange={(value) => setApplicationMode(value === 'continue' ? 'continue' : 'new')}
          className="space-y-3"
        >
          <TabsList className="grid h-12 w-full grid-cols-2 rounded-xl bg-muted/70 p-1">
            <TabsTrigger value="new" className="h-10 rounded-lg">New Applicant</TabsTrigger>
            <TabsTrigger value="continue" className="h-10 rounded-lg">Continue Application</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="mt-0">
            <div className="rounded-3xl border border-border/60 bg-card p-6 md:p-8 shadow-sm">
              <div className="flex items-start gap-3 rounded-2xl bg-muted/50 p-4 mb-7">
                <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  How it works: apply here → we review → you get a private link → watch a short intro video → take a
                  randomised assessment (most tracks also include one small practical task) → pass and complete a one-time
                  $15 registration to activate your professional account.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className={labelClass} htmlFor="apply-name">Full name</Label>
              <Input id="apply-name" className={inputClass} value={form.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="Ama Mensah" />
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className={labelClass} htmlFor="apply-email">Email</Label>
                <Input id="apply-email" type="email" className={inputClass} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@email.com" />
              </div>
              <div className="space-y-2">
                <Label className={labelClass} htmlFor="apply-phone">Phone / WhatsApp</Label>
                <Input id="apply-phone" className={inputClass} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+233 ..." />
              </div>
            </div>

            <div className="space-y-2">
              <Label className={labelClass} htmlFor="apply-track">Role you're applying for</Label>
              <Select value={form.track} onValueChange={(v) => set('track', v)}>
                <SelectTrigger id="apply-track" className={inputClass}>
                  <SelectValue placeholder="Choose a track" />
                </SelectTrigger>
                <SelectContent>
                  {TALENT_TRACKS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className={labelClass} htmlFor="apply-cv">CV / résumé</Label>
              <label htmlFor="apply-cv" className="flex items-center gap-3 h-12 px-4 rounded-xl border border-dashed border-border/70 cursor-pointer hover:border-primary/50 transition-colors">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm truncate">{cvFile ? cvFile.name : 'Attach a PDF or Word document'}</span>
              </label>
              <input id="apply-cv" type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={pickFile('cv')} />
            </div>

            <div className="space-y-2">
              <Label className={labelClass} htmlFor="apply-portfolio">Portfolio file</Label>
              <label htmlFor="apply-portfolio" className="flex items-center gap-3 h-12 px-4 rounded-xl border border-dashed border-border/70 cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm truncate">{portfolioFile ? portfolioFile.name : 'Attach a PDF, image or zip (optional if you share a link)'}</span>
              </label>
              <input id="apply-portfolio" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.zip" className="sr-only" onChange={pickFile('portfolio')} />
            </div>

            <div className="space-y-2">
              <Label className={labelClass} htmlFor="apply-link">Portfolio link</Label>
              <Input id="apply-link" className={inputClass} value={form.portfolioLink} onChange={(e) => set('portfolioLink', e.target.value)} placeholder="https://behance.net/... or a Figma / GitHub link" />
              <p className="text-xs text-muted-foreground">Attach a file, share a link, or both.</p>
            </div>

            <div className="space-y-2">
              <Label className={labelClass} htmlFor="apply-promo">Promo code (optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="apply-promo"
                  className={inputClass}
                  value={form.promoCode}
                  onChange={(e) => {
                    set('promoCode', e.target.value.toUpperCase());
                    setPromoDiscount(null);
                  }}
                  placeholder="Enter your code"
                  autoCapitalize="characters"
                />
                <Button type="button" variant="outline" className="h-12 rounded-xl shrink-0" onClick={applyPromoCode} disabled={promoChecking || !form.promoCode.trim()}>
                  {promoChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                </Button>
              </div>
              {promoDiscount !== null && <p className="text-xs text-primary">{promoDiscount}% off your registration fee if you pass screening.</p>}
            </div>

            <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl text-base">
              {submitting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending your application…</>) : 'Submit application'}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              By applying you agree to our <Link to="/terms" className="underline">terms</Link> and{' '}
              <Link to="/privacy" className="underline">privacy policy</Link>.
            </p>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="continue" className="mt-0">
            <div className="rounded-3xl border border-border/60 bg-card p-6 md:p-8 shadow-sm">
              {continueSent ? (
                <div className="py-5 text-center">
                  <CheckCircle2 className="mx-auto mb-5 h-12 w-12 text-primary" />
                  <h2 className="mb-2 text-xl font-bold">Check your email</h2>
                  <p className="mb-6 text-sm text-muted-foreground">
                    If those details match an application that can continue, we sent a private onboarding link to {form.email.trim()}.
                  </p>
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => setContinueSent(false)}>
                    Back to continue application
                  </Button>
                </div>
              ) : (
                <form onSubmit={continueOnboarding} className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold">Continue your application</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Enter the same details you used to apply. We’ll email you a private link to pick up where you left off.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass} htmlFor="continue-name">Full name</Label>
                    <Input id="continue-name" autoComplete="name" className={inputClass} value={form.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="Ama Mensah" required />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass} htmlFor="continue-email">Email</Label>
                    <Input id="continue-email" type="email" autoComplete="email" className={inputClass} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@email.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass} htmlFor="continue-phone">Contact number</Label>
                    <Input id="continue-phone" type="tel" autoComplete="tel" className={inputClass} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+233 ..." required />
                  </div>
                  <Button type="submit" disabled={continuing} className="h-12 w-full rounded-xl text-base">
                    {continuing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending secure link…</> : 'Continue onboarding'}
                  </Button>
                </form>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Apply;
