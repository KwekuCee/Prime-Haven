import { useMemo } from 'react';
import { TrendingDown } from 'lucide-react';

interface FunnelApplicant {
  id: string;
  track: string;
  status: string;
  invited_at?: string | null;
  video_watched_at?: string | null;
  paid_at?: string | null;
}
interface FunnelAssessment {
  applicant_id: string;
  submitted_at?: string | null;
  passed?: boolean | null;
}

/**
 * Screening funnel built from the timestamps the screening flow already records,
 * so every applicant (past and future) is counted without extra tracking.
 */
const ApplicantFunnel = ({ applicants, assessments, track }: {
  applicants: FunnelApplicant[];
  assessments: FunnelAssessment[];
  track: string;
}) => {
  const steps = useMemo(() => {
    const list = track === 'all' ? applicants : applicants.filter((a) => a.track === track);
    const byApplicant = new Map<string, FunnelAssessment>();
    assessments.forEach((a) => { if (!byApplicant.has(a.applicant_id)) byApplicant.set(a.applicant_id, a); });
    const count = (fn: (a: FunnelApplicant) => boolean) => list.filter(fn).length;
    return [
      { label: 'Applied', value: list.length },
      { label: 'Invited', value: count((a) => !!a.invited_at) },
      { label: 'Watched video', value: count((a) => !!a.video_watched_at) },
      { label: 'Started quiz', value: count((a) => byApplicant.has(a.id)) },
      { label: 'Finished quiz', value: count((a) => !!byApplicant.get(a.id)?.submitted_at) },
      { label: 'Passed', value: count((a) => !!byApplicant.get(a.id)?.passed) },
      { label: 'Paid', value: count((a) => !!a.paid_at) },
      { label: 'Active', value: count((a) => a.status === 'active') },
    ];
  }, [applicants, assessments, track]);

  const top = steps[0].value || 1;
  // Biggest loss between two consecutive steps, ignoring the admin-controlled invite step.
  let worst = { from: '', to: '', lost: 0 };
  for (let i = 2; i < steps.length; i++) {
    const lost = steps[i - 1].value - steps[i].value;
    if (lost > worst.lost) worst = { from: steps[i - 1].label, to: steps[i].label, lost };
  }

  return (
    <section className="rounded-xl border border-border/50 bg-card/80 p-4 sm:p-5" aria-labelledby="funnel-heading">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="funnel-heading" className="text-base font-bold">Screening funnel{track !== 'all' ? ` · ${track}` : ''}</h2>
        {worst.lost > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingDown className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
            Biggest drop: {worst.lost} between “{worst.from}” and “{worst.to}”
          </p>
        )}
      </div>
      <ol className="space-y-2">
        {steps.map((s, i) => {
          const pct = Math.round((s.value / top) * 100);
          const prev = i > 0 ? steps[i - 1].value : s.value;
          const stepPct = prev ? Math.round((s.value / prev) * 100) : 0;
          return (
            <li key={s.label} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[8rem_1fr_auto]">
              <span className="truncate text-muted-foreground">{s.label}</span>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted" role="presentation">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-20 text-right tabular-nums">
                <span className="font-semibold">{s.value}</span>
                {i > 0 && <span className="ml-1 text-xs text-muted-foreground">{stepPct}%</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

export default ApplicantFunnel;
