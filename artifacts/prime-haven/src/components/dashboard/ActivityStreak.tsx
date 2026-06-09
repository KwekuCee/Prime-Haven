import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, Calendar, Info } from 'lucide-react';
import { differenceInDays, startOfDay, subDays, format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ActivityStreakProps {
    submissions: any[];
}

const ActivityStreak = ({ submissions }: ActivityStreakProps) => {
    const { currentStreak, activeDaysBox } = useMemo(() => {
        if (!submissions || submissions.length === 0) return { currentStreak: 0, activeDaysBox: [] };

        // Get all unique dates of submissions
        const today = startOfDay(new Date());
        const uniqueDates = new Set(
            submissions.map(s => startOfDay(new Date(s.created_at)).getTime())
        );

        let streak = 0;
        while (uniqueDates.has(subDays(today, streak).getTime())) {
            streak++;
        }
        // Also check if they missed today but did yesterday
        if (streak === 0) {
            let altStreak = 0;
            while (uniqueDates.has(subDays(today, altStreak + 1).getTime())) {
                altStreak++;
            }
            streak = altStreak;
        }

        // Build the 30 day boxes
        const boxes = [];
        for (let i = 29; i >= 0; i--) {
            const date = subDays(today, i);
            const isActivelyWorking = uniqueDates.has(date.getTime());

            const daySubmissions = submissions.filter(
                s => startOfDay(new Date(s.created_at)).getTime() === date.getTime()
            );

            const approvedSubmissions = daySubmissions.filter(s => s.ph_approved).length;

            boxes.push({
                date,
                active: isActivelyWorking,
                count: daySubmissions.length,
                approved: approvedSubmissions
            });
        }

        return { currentStreak: streak, activeDaysBox: boxes };
    }, [submissions]);

    return (
        <div className="mb-6 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5 sm:p-6 flex flex-col md:flex-row gap-6 md:items-center">

            <div className="flex items-start gap-4 md:w-1/3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${currentStreak > 2 ? 'bg-orange-500/20 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)] border border-orange-500/30' : 'bg-muted text-muted-foreground'}`}>
                    <Flame className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-sm font-heading font-bold text-foreground">Activity Streak</h2>
                    <div className="flex items-end gap-1 mt-1">
                        <span className="text-3xl font-black font-heading leading-none">{currentStreak}</span>
                        <span className="text-xs text-muted-foreground mb-1 font-medium">Days</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                        {currentStreak > 2 ? 'You are on fire! Keep going!' : 'Submit work daily to build your streak.'}
                    </p>
                </div>
            </div>

            <div className="hidden sm:flex flex-col gap-2 border-l border-border/50 pl-6 flex-1">
                <div className="flex justify-between items-center text-[10px] text-muted-foreground font-medium w-full">
                    <span>Last 30 Days</span>
                    <span className="flex items-center gap-1"><Info className="w-3 h-3" /> Hover for details</span>
                </div>

                <TooltipProvider delayDuration={100}>
                    <div className="flex items-center gap-1.5 w-full">
                        {activeDaysBox.map((box, idx) => (
                            <Tooltip key={idx}>
                                <TooltipTrigger asChild>
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.02 }}
                                        className={`flex-1 aspect-square rounded-[3px] sm:rounded-sm transition-all duration-300 hover:scale-125 ${box.active
                                                ? (box.approved > 0 ? 'bg-primary shadow-[0_0_5px_hsl(var(--primary))]' : 'bg-primary/40')
                                                : 'bg-muted hover:bg-muted-foreground/30'
                                            }`}
                                    />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                    <p className="font-bold mb-1">{format(box.date, 'MMM do, yyyy')}</p>
                                    {box.active ? (
                                        <div className="text-muted-foreground">
                                            <p>{box.count} total submissions</p>
                                            {box.approved > 0 && <p className="text-emerald-500">{box.approved} approved</p>}
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground">No activity</p>
                                    )}
                                </TooltipContent>
                            </Tooltip>
                        ))}
                    </div>
                </TooltipProvider>
            </div>

        </div>
    );
};

export default ActivityStreak;
