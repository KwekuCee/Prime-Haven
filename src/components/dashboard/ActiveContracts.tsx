import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, ExternalLink, AlertCircle, CheckCircle2, MoreVertical, FileText, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, formatDistanceToNow, isAfter } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface ActiveContract {
    id: string;
    service_type: string;
    tier: string;
    deadline_at: string;
    project_status: string;
    price: number;
}

const CATEGORY_LABELS: Record<string, string> = {
    'logo-design': 'Logo Design',
    'brand-identity': 'Brand Identity',
    'app-design': 'UI/UX Design',
    'web-design': 'Web Design',
    'web-development': 'Web Development',
    'print-design': 'Print Design',
    'flyer-design': 'Flyer / Poster Design',
    'social-media': 'Social Media Design',
};

const ActiveContracts = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [contracts, setContracts] = useState<ActiveContract[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadContracts();
    }, [user]);

    const loadContracts = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await (supabase
                .from('client_orders') as any)
                .select('id, service_type, tier, deadline_at, project_status, price')
                .eq('assigned_designer_id', user.id)
                .neq('project_status', 'completed')
                .order('deadline_at', { ascending: true });

            if (error) throw error;
            setContracts(data || []);
        } catch (err) {
            console.error('Error loading active contracts:', err);
        } finally {
            setLoading(false);
        }
    };

    const getDeadlineStatus = (deadline: string) => {
        const d = new Date(deadline);
        const now = new Date();
        const isOverdue = isAfter(now, d);
        return {
            isOverdue,
            text: isOverdue ? `Overdue by ${formatDistanceToNow(d)}` : `Due in ${formatDistanceToNow(d)}`,
            color: isOverdue ? 'text-destructive' : 'text-primary'
        };
    };

    if (loading) return null;
    if (contracts.length === 0) return null;

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h2 className="text-lg font-heading font-bold uppercase tracking-tight">Active Contracts</h2>
                    <p className="text-xs text-muted-foreground font-medium">{contracts.length} project{contracts.length !== 1 ? 's' : ''} in progress</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contracts.map((contract) => {
                    const deadline = getDeadlineStatus(contract.deadline_at);
                    return (
                        <Card key={contract.id} className="glass border-border/50 hover:border-primary/30 transition-all group">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <Badge variant="outline" className="text-[9px] uppercase tracking-tighter">
                                            {contract.tier} package
                                        </Badge>
                                        <h3 className="font-heading font-bold text-sm">
                                            {CATEGORY_LABELS[contract.service_type] || contract.service_type}
                                        </h3>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <MoreVertical className="w-4 h-4" />
                                    </Button>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-[11px] mb-1">
                                        <span className="text-muted-foreground">Deadline Progress</span>
                                        <span className={`font-medium ${deadline.color}`}>{deadline.text}</span>
                                    </div>
                                    <Progress value={deadline.isOverdue ? 100 : 45} className={`h-1.5 ${deadline.isOverdue ? '[&>div]:bg-destructive' : ''}`} />
                                </div>

                                <div className="flex items-center gap-4 pt-2 border-t border-border/30">
                                    <div className="flex-1">
                                        <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Status</p>
                                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                                            {contract.project_status === 'submitted' ? (
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                            ) : (
                                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                            )}
                                            <span className="capitalize">{contract.project_status.replace('_', ' ')}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 w-8 p-0"
                                            onClick={() => navigate(`/workspace/${contract.id}`)}
                                            title="Project Workspace"
                                        >
                                            <MessageSquare className="w-3.5 h-3.5 text-primary" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="h-8 text-xs font-bold px-3 gap-1.5"
                                            onClick={() => navigate(`/workspace/${contract.id}`)}
                                        >
                                            Workspace <ExternalLink className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </motion.div>
    );
};

export default ActiveContracts;
