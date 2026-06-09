import { motion } from 'framer-motion';
import { Activity, Star, Briefcase, FileCheck, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ClientLiveFeedProps {
    orders: any[];
    submissions: any[];
}

const ClientLiveFeed = ({ orders, submissions }: ClientLiveFeedProps) => {
    const feedItems: any[] = [];

    submissions.forEach(sub => {
        if (sub.client_accepted) {
            feedItems.push({
                id: `sub-acc-${sub.id}`,
                type: 'accepted',
                title: sub.project_name || 'Project File',
                date: new Date(sub.client_accepted_at || sub.created_at),
            });
        } else if (sub.ph_approved) {
            feedItems.push({
                id: `sub-ph-${sub.id}`,
                type: 'ph_approved',
                title: sub.project_name || 'Project File',
                date: new Date(sub.ph_approved_at || sub.created_at),
            });
        }
    });

    orders.forEach(order => {
        feedItems.push({
            id: `order-${order.id}`,
            type: 'order',
            title: order.service_type ? order.service_type.replace(/-/g, ' ') : 'New Contract',
            date: new Date(order.created_at),
        });
    });

    feedItems.sort((a, b) => b.date.getTime() - a.date.getTime());
    const displayItems = feedItems.slice(0, 8);

    const getIcon = (type: string) => {
        switch (type) {
            case 'accepted': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
            case 'ph_approved': return <Star className="w-4 h-4 text-amber-400 fill-amber-400" />;
            case 'order': return <Briefcase className="w-4 h-4 text-primary" />;
            default: return <Activity className="w-4 h-4 text-muted-foreground" />;
        }
    };

    const getMessage = (item: any) => {
        switch (item.type) {
            case 'accepted': return <span className="text-emerald-500 font-bold">You accepted this project</span>;
            case 'ph_approved': return <span>Ready for your review</span>;
            case 'order': return <span className="text-primary font-bold">Order Placed</span>;
            default: return <span>Activity recorded</span>;
        }
    };

    return (
        <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5 h-full max-h-[500px] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h2 className="text-sm font-heading font-bold">Project Feed</h2>
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
                                <p className="text-xs font-semibold text-foreground truncate capitalize">{item.title}</p>
                                <div className="flex items-center justify-between mt-0.5">
                                    <p className="text-[10px] text-muted-foreground truncate mr-2">{getMessage(item)}</p>
                                    <p className="text-[9px] text-muted-foreground whitespace-nowrap opacity-60">
                                        {formatDistanceToNow(item.date, { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ClientLiveFeed;
