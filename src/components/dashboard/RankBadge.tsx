import { motion } from 'framer-motion';

export interface DesignerRank {
  name: string;
  minPoints: number;
  maxPoints: number;
  color: string;
  bgColor: string;
  borderColor: string;
  emoji: string;
  description: string;
}

export const DESIGNER_RANKS: DesignerRank[] = [
  { name: 'Rookie', minPoints: 0, maxPoints: 99, color: 'text-zinc-400', bgColor: 'bg-zinc-400/10', borderColor: 'border-zinc-400/30', emoji: '🌱', description: 'Just getting started' },
  { name: 'Bronze', minPoints: 100, maxPoints: 299, color: 'text-amber-600', bgColor: 'bg-amber-600/10', borderColor: 'border-amber-600/30', emoji: '🥉', description: 'Building momentum' },
  { name: 'Silver', minPoints: 300, maxPoints: 699, color: 'text-slate-400', bgColor: 'bg-slate-400/10', borderColor: 'border-slate-400/30', emoji: '🥈', description: 'Steady performer' },
  { name: 'Gold', minPoints: 700, maxPoints: 1499, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30', emoji: '🥇', description: 'Rising star' },
  { name: 'Platinum', minPoints: 1500, maxPoints: 2999, color: 'text-cyan-400', bgColor: 'bg-cyan-400/10', borderColor: 'border-cyan-400/30', emoji: '💎', description: 'Elite designer' },
  { name: 'Diamond', minPoints: 3000, maxPoints: Infinity, color: 'text-violet-400', bgColor: 'bg-violet-400/10', borderColor: 'border-violet-400/30', emoji: '👑', description: 'Legendary' },
];

export const getRankForPoints = (points: number): DesignerRank => {
  return DESIGNER_RANKS.slice().reverse().find(r => points >= r.minPoints) || DESIGNER_RANKS[0];
};

export const getProgressToNextRank = (points: number): { current: DesignerRank; next: DesignerRank | null; progress: number; remaining: number } => {
  const current = getRankForPoints(points);
  const currentIndex = DESIGNER_RANKS.findIndex(r => r.name === current.name);
  const next = currentIndex < DESIGNER_RANKS.length - 1 ? DESIGNER_RANKS[currentIndex + 1] : null;
  const progress = next
    ? Math.min(100, ((points - current.minPoints) / (next.minPoints - current.minPoints)) * 100)
    : 100;
  const remaining = next ? Math.max(0, next.minPoints - points) : 0;
  return { current, next, progress, remaining };
};

interface RankBadgeProps {
  points: number;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  showLabel?: boolean;
}

const RankBadge = ({ points, size = 'md', showProgress = false, showLabel = true }: RankBadgeProps) => {
  const { current, next, progress, remaining } = getProgressToNextRank(points);

  const sizeClasses = {
    sm: { container: 'px-2 py-0.5 text-[10px] gap-1', emoji: 'text-xs' },
    md: { container: 'px-3 py-1 text-xs gap-1.5', emoji: 'text-sm' },
    lg: { container: 'px-4 py-2 text-sm gap-2', emoji: 'text-lg' },
  };

  return (
    <div className="space-y-2">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`
          inline-flex items-center rounded-full border font-bold tracking-wide
          ${current.bgColor} ${current.borderColor} ${current.color}
          ${sizeClasses[size].container}
        `}
      >
        <span className={sizeClasses[size].emoji}>{current.emoji}</span>
        {showLabel && <span>{current.name}</span>}
      </motion.div>

      {showProgress && next && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{current.name}</span>
            <span className={next.color}>{next.emoji} {next.name} ({remaining} pts needed)</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full bg-gradient-to-r from-primary to-primary/60`}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default RankBadge;
