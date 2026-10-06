import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { calculateDeadlineTimer, TimerStatus } from '@/lib/deadlineTimer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  contractId: string;
  projectTitle: string;
  claimedAt?: string | null;
  deadlineAt?: string | null;
  designerId?: string | null;
  designerEmail?: string | null;
  onExpired?: () => void;
  compact?: boolean;
}

export const ProjectDeadlineCountdown = ({
  contractId,
  projectTitle,
  claimedAt,
  deadlineAt,
  designerId,
  designerEmail,
  onExpired,
  compact = false,
}: Props) => {
  const { toast } = useToast();
  const [timer, setTimer] = useState<TimerStatus>(() =>
    calculateDeadlineTimer(claimedAt, deadlineAt)
  );

  useEffect(() => {
    const update = () => {
      const current = calculateDeadlineTimer(claimedAt, deadlineAt);
      setTimer(current);

      // Check for milestone warnings to notify designer
      if (designerId && contractId) {
        checkAndSendMilestoneWarning(current);
      }

      if (current.isExpired && onExpired) {
        onExpired();
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [claimedAt, deadlineAt, contractId, designerId]);

  const checkAndSendMilestoneWarning = async (current: TimerStatus) => {
    const milestones = [
      { key: '50', threshold: 50, label: '50% Deadline Milestone' },
      { key: '70', threshold: 70, label: '70% Deadline Warning' },
      { key: '90', threshold: 90, label: '90% Critical Deadline Warning' },
    ];

    for (const m of milestones) {
      if (current.percentElapsed >= m.threshold) {
        const storageKey = `warned_${contractId}_${m.key}`;
        if (!localStorage.getItem(storageKey)) {
          localStorage.setItem(storageKey, 'true');

          // Notify designer in UI
          toast({
            title: `⚠️ ${m.label}`,
            description: `You have reached ${m.threshold}% of the deadline for "${projectTitle}". Please complete and submit your work for approval.`,
            variant: m.threshold >= 90 ? 'destructive' : 'default',
          });

          // Call Supabase edge function to send warning email to designer
          try {
            await supabase.functions.invoke('notify-designer', {
              body: {
                designerId,
                designerEmail,
                projectName: projectTitle,
                notificationType: 'deadline_warning',
                milestone: m.threshold,
                remainingHours: current.remainingHours,
                remainingMinutes: current.remainingMinutes,
              },
            });
          } catch (e) {
            // Non-blocking log
            console.warn('Milestone notification dispatch:', e);
          }
        }
      }
    }
  };

  const getMilestoneColor = () => {
    if (timer.isExpired) return 'text-destructive border-destructive/30 bg-destructive/10';
    if (timer.milestone === '90_percent') return 'text-red-500 border-red-500/30 bg-red-500/10 animate-pulse';
    if (timer.milestone === '70_percent') return 'text-amber-500 border-amber-500/30 bg-amber-500/10';
    if (timer.milestone === '50_percent') return 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10';
    return 'text-primary border-primary/30 bg-primary/10';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={`font-mono text-xs gap-1.5 ${getMilestoneColor()}`}>
          <Clock className="w-3 h-3" />
          {timer.formattedCountdown}
        </Badge>
      </div>
    );
  }

  return (
    <div className="p-3.5 rounded-xl border border-border/50 bg-background/50 space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-medium">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span>Project Countdown:</span>
        </div>
        <span className={`font-mono font-bold text-xs ${timer.isExpired ? 'text-destructive' : 'text-primary'}`}>
          {timer.formattedCountdown}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Started: 0%</span>
          <span>50%</span>
          <span>70%</span>
          <span>90%</span>
          <span>Due</span>
        </div>
        <Progress
          value={timer.percentElapsed}
          className={`h-2 ${timer.isExpired ? '[&>div]:bg-destructive' : timer.milestone === '90_percent' ? '[&>div]:bg-red-500' : timer.milestone === '70_percent' ? '[&>div]:bg-amber-500' : ''}`}
        />
      </div>

      {timer.milestone !== 'normal' && (
        <div className={`flex items-start gap-1.5 text-[11px] p-2 rounded-lg border ${getMilestoneColor()}`}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <p>
            {timer.isExpired ? (
              <span><strong>Deadline Expired.</strong> This contract is subject to revocation and a 48-hour activity cooldown.</span>
            ) : timer.milestone === '90_percent' ? (
              <span><strong>Final Warning (90% elapsed):</strong> Submit your deliverable immediately to avoid missing the deadline and triggering a 48-hour cooldown.</span>
            ) : timer.milestone === '70_percent' ? (
              <span><strong>Urgent Reminder (70% elapsed):</strong> Less than 30% of the allowed deadline remains. Finalize your design and upload for approval.</span>
            ) : (
              <span><strong>Midpoint Reminder (50% elapsed):</strong> 50% of the contract time has elapsed. Please ensure work is well underway.</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
};
