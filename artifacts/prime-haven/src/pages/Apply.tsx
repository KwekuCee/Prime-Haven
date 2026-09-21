import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Upload, FileText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { checkRateLimit } from '@/lib/rateLimit';
import { TALENT_TRACKS, uploadApplicantFile, type TalentTrack } from '@/lib/applicants';
import BrandLogo from '@/components/BrandLogo';
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
  });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

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
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

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

            <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl text-base">
              {submitting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending your application…</>) : 'Submit application'}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              By applying you agree to our <Link to="/terms" className="underline">terms</Link> and{' '}
              <Link to="/privacy" className="underline">privacy policy</Link>.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Apply;
