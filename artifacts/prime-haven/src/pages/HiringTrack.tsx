import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  DollarSign,
  FileText,
  LockKeyhole,
  PlayCircle,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Seo from '@/components/Seo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getServiceBySlug } from '@/lib/coreServices';
import { JOIN_FEE_USD, formatGhs, formatUsd, usdToGhs } from '@/lib/currency';
import { trackHasPractical } from '@/lib/talentTracks';

const USD_TO_GHS_RATE = 15.5;

const trackProfiles: Record<string, { fit: string; proof: string[]; outcomes: string[] }> = {
  'graphic-design': {
    fit: 'Visual designers who can turn briefs into clean, campaign-ready assets with strong typography, hierarchy, and brand consistency.',
    proof: ['Logo and identity samples', 'Social media or print layouts', 'Before-and-after brand improvements'],
    outcomes: ['Brand identity work', 'Campaign graphics', 'Print-ready and digital design jobs'],
  },
  'ui-ux-design': {
    fit: 'Product-minded designers who can structure flows, design polished interfaces, and explain decisions from a user-first point of view.',
    proof: ['Figma or prototype links', 'Wireframes and final screens', 'Case studies with decisions and outcomes'],
    outcomes: ['Mobile and web interface design', 'UX audits', 'Design systems and prototypes'],
  },
  'web-development': {
    fit: 'Developers who can build reliable, responsive websites and web apps from real client requirements.',
    proof: ['Live project links', 'GitHub or technical portfolio', 'Examples of deployed business websites'],
    outcomes: ['Business websites', 'Web apps', 'Integrations and performance improvements'],
  },
  'mobile-app-development': {
    fit: 'App developers who can build smooth mobile experiences, connect APIs, and prepare products for real users.',
    proof: ['Published or demo apps', 'Mobile UI implementation samples', 'Code or case-study links'],
    outcomes: ['iOS and Android apps', 'Cross-platform builds', 'App launch support'],
  },
  'motion-graphics': {
    fit: 'Motion designers who can communicate ideas through timing, animation, transitions, and visual storytelling.',
    proof: ['Motion reels', 'Animated logos or explainers', 'Social motion assets'],
    outcomes: ['Explainers', 'Brand motion', 'Animated content for campaigns'],
  },
  'video-editing': {
    fit: 'Editors who can shape raw footage into clear stories with clean cuts, colour, sound, pacing, and captions.',
    proof: ['Short-form and long-form edits', 'Before-and-after edits', 'YouTube, event, or campaign samples'],
    outcomes: ['Reels and short-form videos', 'YouTube edits', 'Corporate and event videos'],
  },
  'social-media-management': {
    fit: 'Social media managers who can plan content, write captions, schedule posts, manage communities, and report what is working.',
    proof: ['Content calendars', 'Campaign results', 'Examples of copy, reports, or managed pages'],
    outcomes: ['Content planning', 'Publishing and engagement', 'Monthly performance reporting'],
  },
  'it-solutions': {
    fit: 'IT specialists who can solve practical business technology problems with clear setup, support, and documentation.',
    proof: ['Support or infrastructure examples', 'Certifications or technical notes', 'Client problem-solution summaries'],
    outcomes: ['Infrastructure setup', 'Technical support', 'Security and systems improvements'],
  },
};

const baseSteps = [
  { title: 'Apply', description: 'Send your CV, portfolio and contact details for this track.', icon: FileText },
  { title: 'Review', description: 'Our team checks fit before sending the private screening link.', icon: UserCheck },
  { title: 'Intro video', description: 'Watch the short Prime Haven onboarding video before the assessment opens.', icon: PlayCircle },
  { title: 'Assessment', description: 'Take a randomized track quiz. Copying is monitored and repeated copying ends the attempt.', icon: ClipboardCheck },
  { title: 'Result', description: 'Applicants who meet the pass mark continue to onboarding. Others receive a respectful result message.', icon: BadgeCheck },
  { title: 'Joining fee', description: 'Pay the one-time registration fee only after passing screening.', icon: DollarSign },
  { title: 'Activation', description: 'Verify your email, enter your dashboard, and receive your professional community invite.', icon: ShieldCheck },
];

const HiringTrack = () => {
  const { trackSlug } = useParams<{ trackSlug: string }>();
  const service = getServiceBySlug(trackSlug);

  if (!service) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="flex min-h-[70vh] items-center justify-center px-4 text-center">
          <div className="max-w-md">
            <h1 className="mb-3 text-2xl font-bold text-foreground">Hiring track not found</h1>
            <p className="mb-6 text-muted-foreground">Choose one of the current Prime Haven hiring tracks.</p>
            <Button asChild className="rounded-xl">
              <Link to="/#services">View tracks</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const Icon = service.icon;
  const profile = trackProfiles[service.slug] || {
    fit: `Professionals who can deliver dependable ${service.title.toLowerCase()} work for real client briefs.`,
    proof: service.features,
    outcomes: service.process,
  };
  const hasPractical = trackHasPractical(service.title);
  const applyHref = `/apply?track=${encodeURIComponent(service.title)}`;
  const ghsFee = usdToGhs(JOIN_FEE_USD, USD_TO_GHS_RATE);
  const screeningSteps = hasPractical
    ? [
        ...baseSteps.slice(0, 4),
        { title: 'Practical task', description: 'Complete one track-specific practical brief for manual review.', icon: CheckCircle2 },
        ...baseSteps.slice(4),
      ]
    : baseSteps;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${service.title} hiring track at Prime Haven`,
    description: `Apply to join Prime Haven as a ${service.title} professional. Screening includes an application, video stage, assessment and a one-time ${formatUsd(JOIN_FEE_USD)} joining fee after passing.`,
    url: `https://primehaven.tech/hiring/${service.slug}`,
    about: { '@type': 'Service', name: service.title, description: service.description },
    provider: { '@type': 'Organization', name: 'Prime Haven', url: 'https://primehaven.tech' },
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={`${service.title} hiring track | Join Prime Haven`}
        description={`Apply for the Prime Haven ${service.title} hiring track. Learn the screening steps, required portfolio proof and one-time ${formatUsd(JOIN_FEE_USD)} joining fee after passing.`}
        path={`/hiring/${service.slug}`}
        image={service.image}
        jsonLd={jsonLd}
      />
      <Navbar />

      <main>
        <section className="relative overflow-hidden border-b border-border/60 pt-28 pb-16">
          <div className="absolute inset-x-0 top-0 h-1 spectrum-bar" />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              <Link to="/#services" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                <ArrowLeft className="h-4 w-4" /> All hiring tracks
              </Link>

              <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
                <div className="lg:col-span-7">
                  <Badge variant="secondary" className="mb-5 rounded-full px-3 py-1">
                    Talent screening track
                  </Badge>
                  <div className="mb-6 flex items-center gap-4">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                      <Icon className="h-7 w-7 text-primary" aria-hidden="true" />
                    </span>
                    <h1 className="font-heading text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground text-balance md:text-6xl">
                      Join Prime Haven as a {service.title} professional
                    </h1>
                  </div>
                  <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty">
                    {profile.fit}
                  </p>
                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <Button asChild size="lg" className="rounded-xl">
                      <Link to={applyHref}>Apply for this track <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="rounded-xl">
                      <a href="#screening">See screening process</a>
                    </Button>
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
                    <img src={service.image} alt={`${service.title} applicant screening`} className="aspect-[4/3] w-full object-cover" />
                    <div className="grid grid-cols-2 gap-3 p-5">
                      <div className="rounded-2xl bg-muted/60 p-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Fee after passing</p>
                        <p className="mt-2 text-2xl font-extrabold text-foreground">{formatUsd(JOIN_FEE_USD)}</p>
                        <p className="text-xs text-muted-foreground">About {formatGhs(ghsFee)}</p>
                      </div>
                      <div className="rounded-2xl bg-muted/60 p-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Practical task</p>
                        <p className="mt-2 text-lg font-extrabold text-foreground">{hasPractical ? 'Included' : 'Skipped'}</p>
                        <p className="text-xs text-muted-foreground">Track-specific rules</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-3">
              <Card className="rounded-3xl border-border/60 bg-card/80 lg:col-span-2">
                <CardContent className="p-6 md:p-8">
                  <span className="eyebrow w-fit">Track services</span>
                  <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground">What this track delivers</h2>
                  <p className="mt-4 leading-relaxed text-muted-foreground">{service.longDescription}</p>
                  <div className="mt-7 grid gap-3 sm:grid-cols-2">
                    {service.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/60 p-4">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                        <span className="text-sm font-medium text-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-border/60 bg-card/80">
                <CardContent className="p-6 md:p-8">
                  <span className="eyebrow w-fit">Portfolio proof</span>
                  <h2 className="mt-3 font-heading text-2xl font-bold tracking-tight text-foreground">What to prepare</h2>
                  <ul className="mt-5 space-y-3">
                    {profile.proof.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="screening" className="border-y border-border/60 bg-card/35 py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              <div className="max-w-2xl">
                <span className="eyebrow w-fit">Screening process</span>
                <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground">No manual interview loop</h2>
                <p className="mt-4 text-muted-foreground">
                  The funnel checks your work, attention to detail and readiness before payment. You only pay after passing.
                </p>
              </div>

              <div className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {screeningSteps.map((step, index) => (
                  <div key={step.title} className="rounded-3xl border border-border/60 bg-background p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                        <step.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                      </span>
                      <span className="text-xs font-bold text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
                    </div>
                    <h3 className="font-heading text-lg font-bold text-foreground">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <span className="eyebrow w-fit">Work you can receive</span>
                <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground">Track-specific client opportunities</h2>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {profile.outcomes.map((outcome) => (
                    <div key={outcome} className="rounded-2xl border border-border/60 bg-card p-4 text-sm font-semibold text-foreground">
                      {outcome}
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="rounded-3xl border border-primary/25 bg-primary/5 p-6 md:p-8">
                  <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                      <LockKeyhole className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-bold uppercase tracking-widest text-primary">One-time joining fee</p>
                      <h2 className="mt-2 font-heading text-4xl font-extrabold text-foreground">{formatUsd(JOIN_FEE_USD)}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">Approx. {formatGhs(ghsFee)} at 1 USD = {USD_TO_GHS_RATE} GHS.</p>
                    </div>
                  </div>
                  <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                    This is the registration fee after you pass screening. It is not a project cost, service package price, or quote.
                  </p>
                  <Button asChild className="mt-6 h-12 w-full rounded-xl">
                    <Link to={applyHref}>Start {service.title} application</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HiringTrack;