import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, Star, Briefcase, FileCheck, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';

interface LiveFeedProps {
    submissions: any[];
    activeJobs: any[];
}

const LiveFeed = ({ submissions, activeJobs }: LiveFeedProps) => {
    const navigate = useNavigate();

    const correctionLink = (submission: any) =>
        `/submit-work?correction=${submission.submissionId}&project=${encodeURIComponent(submission.project_name)}&client=${encodeURIComponent(submission.client_ref || '')}&service=${encodeURIComponent(submission.service_type || '')}`;

    // Merge and sort
    const feedItems = [];

    submissions.forEach(sub => {
        feedItems.push({
            id: `sub-${sub.id}`,
            type: sub.status === 'correction_requested' ? 'correction' : sub.ph_approved ? 'approval' : (sub.rejection_reason ? 'rejection' : 'submission'),
            title: sub.project_name || 'Project File',
            date: new Date(sub.created_at),
            points: sub.points_awarded || 0,
            status: sub.status,
            client_ref: sub.client_ref,
            service_type: sub.service_type,
            submissionId: sub.id,
        });
    });

    activeJobs.forEach(job => {
        // Faking the job created date slightly for the demo, since we might not have created_at in the activeJobs subset.
        // If activeJobs has created_at, use it. Otherwise use now.
        feedItems.push({
            id: `job-${job.id}`,
            type: 'job',
            title: job.title || 'New Contract',
            date: new Date(job.created_at || Date.now() - 86400000), // fallback 1 day ago
        });
    });

    feedItems.sort((a, b) => b.date.getTime() - a.date.getTime());

    const displayItems = feedItems.slice(0, 8);

    const getIcon = (type: string) => {
        switch (type) {
            case 'approval': return <Star className="w-4 h-4 text-amber-400 fill-amber-400" />;
            case 'rejection': return <XCircle className="w-4 h-4 text-destructive" />;
            case 'submission': return <FileCheck className="w-4 h-4 text-blue-400" />;
            case 'correction': return <XCircle className="w-4 h-4 text-amber-500" />;
            case 'job': return <Briefcase className="w-4 h-4 text-primary" />;
            default: return <Activity className="w-4 h-4 text-muted-foreground" />;
        }
    };

    const getMessage = (item: any) => {
        switch (item.type) {
            case 'approval': return <><span className="text-emerald-500 font-bold">Approved</span> - earned {item.points} pts</>;
            case 'rejection': return <span className="text-destructive font-bold">Rejected</span>;
            case 'correction': return <span className="text-amber-500 font-bold">Correction Requested</span>;
            case 'submission': return <span>Submitted for review</span>;
            case 'job': return <span className="text-primary font-bold">New Open Contract</span>;
            default: return <span>Activity recorded</span>;
        }
    };

    return (
        <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5 h-full max-h-[500px] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h2 className="text-sm font-heading font-bold">Platform Feed</h2>
                <Activity className="w-4 h-4 text-muted-foreground" />
            </div>

            {displayItems.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs italic">
                    No recent activity
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                    {displayItems.map((item, idx) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="flex items-start gap-3"
                        >
                            <div className="mt-0.5 rounded-full p-1.5 bg-background border border-border">
                                {getIcon(item.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                                    {item.type === 'correction' && (
                                        <span className="rounded-full bg-amber-500/10 text-amber-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]">
                                            CR
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center justify-between mt-0.5 gap-2">
                                    <p className="text-[10px] text-muted-foreground truncate mr-2">{getMessage(item)}</p>
                                    <p className="text-[9px] text-muted-foreground whitespace-nowrap opacity-60">
                                        {formatDistanceToNow(item.date, { addSuffix: true })}
                                    </p>
                                </div>
                                {item.type === 'correction' && (
                                    <Button size="xs" variant="outline" className="mt-2" onClick={() => navigate(correctionLink(item))}>
                                        Submit Correction
                                    </Button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LiveFeed;
