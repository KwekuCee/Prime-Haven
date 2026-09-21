import { Link } from 'react-router-dom';
import {
  Check, Lock, PlayCircle, ClipboardList, Upload, CreditCard, ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import Seo from '@/components/Seo';
import { CORE_SERVICES } from '@/lib/coreServices';
import { trackHasPractical } from '@/lib/talentTracks';

export type PortalStage =
  | 'loading' | 'blocked' | 'video' | 'assessment' | 'result'
  | 'payment' | 'failed' | 'verify' | 'active';

interface StageStep {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Stages considered "at or past" this step. */
  reached: PortalStage[];
  done: PortalStage[];
}

const STEPS: StageStep[] = [
  { key: 'video', label: 'Intro video', icon: PlayCircle, reached: ['video'], done: ['assessment', 'result', 'payment', 'failed', 'verify', 'active'] },
  { key: 'assessment', label: 'Assessment', icon: ClipboardList, reached: ['assessment'], done: ['result', 'payment', 'failed', 'verify', 'active'] },
  { key: 'practical', label: 'Practical task', icon: Upload, reached: ['assessment'], done: ['result', 'payment', 'failed', 'verify', 'active'] },
  { key: 'payment', label: 'Registration', icon: CreditCard, reached: ['result', 'payment'], done: ['verify', 'active'] },
  { key: 'active', label: 'Activation', icon: ShieldCheck, reached: ['verify'], done: ['active'] },
];

export const getTrackService = (track: string | null | undefined) =>
  CORE_SERVICES.find((s) => s.title === track);

/** Section card matching the admin dashboard surfaces. */
export const PortalCard = ({
  children,
  className = '',
}: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-border/60 bg-card p-6 md:p-8 shadow-sm ${className}`}>
    {children}
  </div>
);

export const PortalHeading = ({
  title,
  description,
}: { title: string; description?: string }) => (
  <div className="mb-6 space-y-2">
    <h1 className="text-2xl md:text-3xl font-heading font-bold tracking-tight text-foreground text-balance">{title}</h1>
    {description && <p className="text-muted-foreground leading-relaxed text-pretty">{description}</p>}
  </div>
);

export const StatTile = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
  </div>
);

interface ApplicantShellProps {
  children: React.ReactNode;
  stage: PortalStage;
  fullName?: string;
  email?: string;
  track?: string;
  score?: number | null;
  passMark?: number;
}

const ApplicantShell = ({ children, stage, fullName, email, track, score, passMark = 70 }: ApplicantShellProps) => {
  const service = getTrackService(track);
  const hasPractical = trackHasPractical(track);
  const steps = STEPS.filter((s) => s.key !== 'practical' || hasPractical);

  const statusOf = (step: StageStep): 'done' | 'current' | 'locked' => {
    if (step.done.includes(stage)) return 'done';
    if (step.reached.includes(stage)) return 'current';
    return 'locked';
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Applicant screening | Prime Haven"
        description="Your private Prime Haven applicant screening portal."
        path="/applicant"
        noindex
      />

      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row">
        {/* Side rail */}
        <aside className="border-b border-border/60 bg-card/50 lg:min-h-screen lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="flex flex-col gap-6 p-5 lg:sticky lg:top-0 lg:p-6">
            <Link to="/" className="w-fit">
              <BrandLogo height={40} />
            </Link>

            {fullName && (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">{fullName}</p>
                {email && <p className="truncate text-xs text-muted-foreground">{email}</p>}
                {track && (
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                    {service?.icon && <service.icon className="h-3 w-3" aria-hidden="true" />}
                    {track}
                  </span>
                )}
              </div>
            )}

            {stage !== 'loading' && stage !== 'blocked' && (
              <nav aria-label="Screening progress">
                <ol className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1.5 lg:overflow-visible lg:pb-0">
                  {steps.map((step) => {
                    const status = statusOf(step);
                    return (
                      <li
                        key={step.key}
                        className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm ${
                          status === 'current'
                            ? 'bg-primary/10 font-semibold text-primary'
                            : status === 'done'
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                        }`}
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                            status === 'done'
                              ? 'border-primary bg-primary/15 text-primary'
                              : status === 'current'
                                ? 'border-primary text-primary'
                                : 'border-border/70 text-muted-foreground'
                          }`}
                        >
                          {status === 'done' ? <Check className="h-3.5 w-3.5" /> : status === 'locked' ? <Lock className="h-3 w-3" /> : <step.icon className="h-3.5 w-3.5" />}
                        </span>
                        <span className="whitespace-nowrap">{step.label}</span>
                      </li>
                    );
                  })}
                </ol>
              </nav>
            )}

            {typeof score === 'number' && (
              <div className="hidden rounded-xl border border-border/60 bg-muted/40 px-4 py-3 lg:block">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Your score</p>
                <p className="mt-1 text-lg font-bold text-foreground">{score}%</p>
                <p className="text-[11px] text-muted-foreground">Pass mark {passMark}%</p>
              </div>
            )}
          </div>
        </aside>

        {/* Main area */}
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
          <div className="mx-auto flex max-w-3xl flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  );
};

/** Track-specific context panel shown alongside the screening stages. */
export const TrackPanel = ({ track, questionCount, passMark = 70 }: { track?: string; questionCount?: number | null; passMark?: number }) => {
  const service = getTrackService(track);
  if (!service) return null;
  const hasPractical = trackHasPractical(track);

  return (
    <PortalCard className="bg-muted/30">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <service.icon className="h-5 w-5 text-primary" aria-hidden="true" />
        </span>
        <div className="min-w-0 space-y-3">
          <div>
            <h2 className="font-heading text-lg font-bold text-foreground">Your track: {service.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">{service.longDescription}</p>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-3">
            <StatTile label="Questions" value={questionCount ? String(questionCount) : 'Randomised set'} />
            <StatTile label="Pass mark" value={`${passMark}%`} />
            <StatTile label="Practical task" value={hasPractical ? 'Included' : 'Not required'} />
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">What this track delivers</p>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {service.features.slice(0, 4).map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {!hasPractical && (
            <p className="rounded-xl border border-border/60 bg-card px-4 py-3 text-sm text-muted-foreground">
              Social Media Management is assessed on the quiz alone — there is no practical exercise to upload.
            </p>
          )}
        </div>
      </div>
    </PortalCard>
  );
};

/** Shown once an applicant has passed: where their work will come from. */
export const NextStepsPanel = ({ track }: { track?: string }) => {
  const service = getTrackService(track);
  if (!service) return null;
  return (
    <PortalCard className="text-left">
      <h2 className="font-heading text-lg font-bold text-foreground">What happens next</h2>
      <ol className="mt-3 space-y-2.5 text-sm text-muted-foreground">
        <li className="flex gap-2.5"><span className="font-semibold text-primary">1.</span> Complete your one-time registration and verify your email.</li>
        <li className="flex gap-2.5"><span className="font-semibold text-primary">2.</span> Join our private Discord — your {service.title} channel is where every brief lands.</li>
        <li className="flex gap-2.5"><span className="font-semibold text-primary">3.</span> Claim {service.title.toLowerCase()} jobs from the marketplace, first come first served.</li>
        <li className="flex gap-2.5"><span className="font-semibold text-primary">4.</span> Deliver, get client approval, and earn your share of the job value.</li>
      </ol>
    </PortalCard>
  );
};

export default ApplicantShell;
