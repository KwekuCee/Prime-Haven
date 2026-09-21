import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle, CheckCircle2, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Seo from '@/components/Seo';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getServiceBySlug } from '@/lib/coreServices';
import { TALENT_TRACKS } from '@/lib/talentTracks';
import { fetchServiceRates, TIER_LABELS, type RatePackage } from '@/lib/serviceRates';
import { checkRateLimit } from '@/lib/rateLimit';

const inputClass = 'h-12 rounded-xl bg-background border-border/70 focus:border-primary/50';

const BUDGETS = ['Under $100', '$100 – $500', '$500 – $2,000', '$2,000 – $10,000', 'Over $10,000'];

const ServiceDetail = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const { toast } = useToast();
  const service = getServiceBySlug(serviceId);

  const [packages, setPackages] = useState<RatePackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);

  const [form, setForm] = useState({
    fullName: '', email: '', whatsapp: '', tier: '', budget: '', deadline: '', brief: '', references: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!service) return;
    setLoadingPackages(true);
    fetchServiceRates(service.slug)
      .then(setPackages)
      .catch(() => setPackages([]))
      .finally(() => setLoadingPackages(false));
  }, [service]);

  const tierOptions = useMemo(
    () => packages.flatMap((p) => p.tiers.map((t) => `${p.label} — ${TIER_LABELS[t.tier] || t.tier}`)),
    [packages],
  );

  const isHiringTrack = !!service && TALENT_TRACKS.includes(service.title);

  const update = (key: keyof typeof form) => (value: string) => setForm((p) => ({ ...p, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service) return;
    if (!form.fullName.trim() || !form.email.trim() || form.brief.trim().length < 10) {
      toast({ variant: 'destructive', title: 'Almost there', description: 'Please add your name, email and a short brief.' });
      return;
    }

    setSubmitting(true);
    try {
      const limit = await checkRateLimit('hire_request', form.email.trim().toLowerCase());
      if (!limit.allowed) {
        toast({ variant: 'destructive', title: 'Slow down', description: limit.message });
        return;
      }

      const referenceImages = form.references
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter((s) => /^https?:\/\//i.test(s))
        .slice(0, 6);

      const { data, error } = await supabase.functions.invoke('submit-hire-request', {
        body: {
          fullName: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          whatsapp: form.whatsapp.trim(),
          serviceSlug: service.slug,
          serviceLabel: service.title,
          tier: form.tier,
          budget: form.budget,
          deadline: form.deadline,
          brief: form.brief.trim(),
          referenceImages,
        },
      });
      const payload = data as { success?: boolean; message?: string };
      if (error || !payload?.success) {
        toast({ variant: 'destructive', title: 'Could not send', description: payload?.message || 'Please try again in a moment.' });
        return;
      }
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (!service) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center px-4 text-center">
          <div>
            <h1 className="mb-4 text-2xl font-bold">Service not found</h1>
            <Button asChild><Link to="/#services">View all services</Link></Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const Icon = service.icon;

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={`${service.title} services in Ghana | Prime Haven`}
        description={`${service.description} Prime Haven ${service.title.toLowerCase()} services by a vetted professional team. Request a quote today.`}
        path={`/services/${service.slug}`}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: service.title,
          serviceType: service.title,
          description: service.longDescription,
          provider: { '@type': 'Organization', name: 'Prime Haven', url: 'https://primehaven.tech' },
          areaServed: 'GH',
        }}
      />
      <Navbar />

      {/* Hero */}
      <section className="border-b border-border/60 pt-28 pb-14">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Link to="/#services" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              <ArrowLeft className="h-4 w-4" /> All services
            </Link>

            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="flex flex-col gap-5">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Icon className="h-7 w-7 text-primary" aria-hidden="true" />
                </span>
                <h1 className="font-heading text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground text-balance md:text-5xl">
                  {service.title}
                </h1>
                <p className="text-lg leading-relaxed text-muted-foreground text-pretty">{service.longDescription}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button asChild className="h-12 rounded-xl px-6">
                    <a href="#hire">Request this service <ArrowRight className="ml-2 h-4 w-4" /></a>
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-border/60">
                <img src={service.image} alt={`${service.title} work by Prime Haven`} loading="lazy" className="aspect-[4/3] w-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What's included + process */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">What's included</h2>
              <ul className="mt-5 space-y-3">
                {service.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-muted-foreground">
                    <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">How we work</h2>
              <ol className="mt-5 space-y-3">
                {service.process.map((step, i) => (
                  <li key={step} className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{i + 1}</span>
                    <span className="text-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Hire request */}
      <section id="hire" className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <span className="eyebrow w-fit">Hire us</span>
              <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground text-balance">
                Request {service.title.toLowerCase()} directly
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground text-pretty">
                Tell us what you need and we'll come back with a timeline and the professional who'll handle it.
              </p>

              {isHiringTrack && (
                <div className="mt-8 rounded-2xl border border-border/60 bg-card p-5">
                  <p className="font-semibold text-foreground">Are you a {service.title.toLowerCase()} professional?</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    We hire for this track through a short screening — no interviews.
                  </p>
                  <Link to={`/hiring/${service.slug}`} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-all hover:gap-3">
                    Apply to join this track <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>

            <div className="lg:col-span-7">
              {sent ? (
                <div className="rounded-3xl border border-border/60 bg-card p-8 text-center">
                  <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-primary" />
                  <h3 className="font-heading text-xl font-bold text-foreground">Request received</h3>
                  <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                    Thanks {form.fullName.split(' ')[0]} — we'll reply to {form.email} shortly with a timeline and next steps.
                  </p>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-5 rounded-3xl border border-border/60 bg-card p-6 md:p-8">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="hr-name">Full name</Label>
                      <Input id="hr-name" value={form.fullName} onChange={(e) => update('fullName')(e.target.value)} className={inputClass} placeholder="Your name" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hr-email">Email</Label>
                      <Input id="hr-email" type="email" value={form.email} onChange={(e) => update('email')(e.target.value)} className={inputClass} placeholder="you@company.com" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hr-whatsapp">WhatsApp (optional)</Label>
                      <Input id="hr-whatsapp" value={form.whatsapp} onChange={(e) => update('whatsapp')(e.target.value)} className={inputClass} placeholder="+233…" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hr-deadline">Deadline (optional)</Label>
                      <Input id="hr-deadline" type="date" value={form.deadline} onChange={(e) => update('deadline')(e.target.value)} className={inputClass} />
                    </div>
                    {tierOptions.length > 0 && (
                      <div className="space-y-2">
                        <Label htmlFor="hr-tier">Package</Label>
                        <Select value={form.tier} onValueChange={update('tier')}>
                          <SelectTrigger id="hr-tier" className={inputClass}><SelectValue placeholder="Not sure yet" /></SelectTrigger>
                          <SelectContent>
                            {tierOptions.map((o) => (
                              <SelectItem key={o} value={o}>{o}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="hr-budget">Budget (optional)</Label>
                      <Select value={form.budget} onValueChange={update('budget')}>
                        <SelectTrigger id="hr-budget" className={inputClass}><SelectValue placeholder="Select a range" /></SelectTrigger>
                        <SelectContent>
                          {BUDGETS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hr-brief">Your brief</Label>
                    <Textarea
                      id="hr-brief"
                      rows={5}
                      value={form.brief}
                      onChange={(e) => update('brief')(e.target.value)}
                      className="rounded-xl"
                      placeholder="What are you building, who is it for, and what does success look like?"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hr-refs">Reference links (optional)</Label>
                    <Textarea
                      id="hr-refs"
                      rows={2}
                      value={form.references}
                      onChange={(e) => update('references')(e.target.value)}
                      className="rounded-xl"
                      placeholder="Paste links to references, moodboards or existing files"
                    />
                  </div>

                  <Button type="submit" disabled={submitting} className="h-12 w-full rounded-xl">
                    {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>) : (<><Send className="mr-2 h-4 w-4" /> Send my request</>)}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    No payment now. We reply with a fixed quote first.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ServiceDetail;
