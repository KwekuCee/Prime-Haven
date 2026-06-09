import { motion } from 'framer-motion';
import { Medal, Star, Flame, Target, Trophy, Crown, CheckCircle2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AchievementBadgesProps {
    designer: any;
    submissions: any[];
}

const AchievementBadges = ({ designer, submissions }: AchievementBadgesProps) => {
    if (!designer) return null;

    const approvedCount = submissions.filter(s => s.ph_approved).length;
    const totalPoints = designer.total_points || 0;
    const talentScore = designer.talent_score || 0;

    const badges = [
        {
            id: 'first_blood',
            title: 'First Blood',
            description: 'First approved submission',
            icon: Target,
            unlocked: approvedCount >= 1,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10'
        },
        {
            id: 'rising_star',
            title: 'Rising Star',
            description: 'Reached 200 total points',
            icon: Star,
            unlocked: totalPoints >= 200,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10'
        },
        {
            id: 'elite_earner',
            title: 'Elite Earner',
            description: 'Reached 750 total points',
            icon: Crown,
            unlocked: totalPoints >= 750,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10'
        },
        {
            id: 'quality_master',
            title: 'Quality Master',
            description: 'Talent Score overhead 90',
            icon: Medal,
            unlocked: talentScore >= 90,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10'
        },
        {
            id: 'grind_machine',
            title: 'Grind Machine',
            description: '30+ approved designs',
            icon: Flame,
            unlocked: approvedCount >= 30,
            color: 'text-orange-500',
            bg: 'bg-orange-500/10'
        }
    ];

    return (
        <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-heading font-bold">Achievements & Badges</h2>
            </div>

            <div className="flex flex-wrap items-center gap-4">
                <TooltipProvider delayDuration={100}>
                    {badges.map((badge, idx) => (
                        <Tooltip key={badge.id}>
                            <TooltipTrigger asChild>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.06 }}
                                    className={`relative flex items-center justify-center transition-all duration-300 cursor-help ${badge.unlocked ? 'opacity-100 hover:scale-110' : 'opacity-40 grayscale hover:grayscale-0 hover:opacity-80'}`}
                                >
                                    {badge.unlocked && (
                                        <div className="absolute -top-1 -right-1 flex items-center justify-center bg-background rounded-full p-0.5 border border-primary/20 shadow-sm z-10">
                                            <CheckCircle2 className="w-2.5 h-2.5 text-primary" />
                                        </div>
                                    )}
                                    <div className={`p-2 rounded-full transition-colors ${badge.unlocked ? badge.bg : 'bg-muted/5'}`}>
                                        <badge.icon className={`w-5 h-5 ${badge.unlocked ? badge.color : 'text-muted-foreground'}`} />
                                    </div>
                                </motion.div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="flex flex-col gap-1 p-3 max-w-[220px] bg-card/95 border-primary/20 backdrop-blur-xl shadow-xl">
                                <p className={`text-xs font-bold ${badge.unlocked ? 'text-primary' : 'text-foreground'}`}>{badge.title}</p>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">{badge.description}</p>
                                {!badge.unlocked && (
                                    <div className="mt-2 pt-2 border-t border-border/50">
                                        <p className="text-[9px] text-orange-500/80 font-medium">Locked</p>
                                        <p className="text-[9px] text-muted-foreground italic">Complete requirements to unlock</p>
                                    </div>
                                )}
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </TooltipProvider>
            </div>
        </div>
    );
};

export default AchievementBadges;
