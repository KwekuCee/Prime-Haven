import { AlertTriangle, Clock, User, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { checkCooldownStatus } from '@/lib/deadlineTimer';

interface Props {
  cooldownUntil: string | null | undefined;
  cooldownReason?: string | null;
}

export const TalentCooldownBanner = ({ cooldownUntil, cooldownReason }: Props) => {
  const status = checkCooldownStatus(cooldownUntil);

  if (!status.isInCooldown) return null;

  return (
    <div className="rounded-2xl border-2 border-red-500/40 bg-gradient-to-r from-red-500/10 via-amber-500/10 to-transparent p-5 sm:p-6 mb-8 backdrop-blur-sm shadow-lg">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-500 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="destructive" className="font-mono text-xs uppercase tracking-wider">
                48-Hour Cooldown Active
              </Badge>
              <span className="text-xs font-semibold text-red-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Remaining: {status.formattedCooldown}
              </span>
            </div>
            <h3 className="font-heading font-bold text-base text-foreground">
              Dashboard Work Inactivity Applied
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
              {cooldownReason || 'A claimed project deadline passed without completion. Under Prime Haven platform policies, a 48-hour cooldown is applied to ensure client reliability.'}{' '}
              During this period, claiming jobs and starting new work are paused. Your account will automatically reactivate once the countdown concludes. You may still update your profile and review past portfolio items.
            </p>
          </div>
        </div>

        <Link to="/edit-profile" className="shrink-0">
          <Button variant="outline" size="sm" className="gap-2 border-border/80">
            <User className="w-3.5 h-3.5 text-primary" />
            Edit Profile
          </Button>
        </Link>
      </div>
    </div>
  );
};
