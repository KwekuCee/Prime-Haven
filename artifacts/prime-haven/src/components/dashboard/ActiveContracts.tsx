import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, ExternalLink, AlertCircle, CheckCircle2, FileText, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, formatDistanceToNow, isAfter } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface ActiveContract {
    id: string;
    title: string;
    service_type: string;
    tier: string;
    deadline_at: string;
    project_status: string;
    price: number;
    source: 'client_projects' | 'client_orders' | 'job_contracts';
    assignment_status?: 'claimed' | 'in_progress' | 'submitted' | 'active';
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
    const { toast } = useToast();
    const [contracts, setContracts] = useState<ActiveContract[]>([]);
    const [loading, setLoading] = useState(true);
    const [unclaiming, setUnclaiming] = useState<string | null>(null);
    const [starting, setStarting] = useState<string | null>(null);

    const [now, setNow] = useState(new Date());

    useEffect(() => {
        loadContracts();
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, [user]);

    const loadContracts = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data: assignments, error: assignmentError } = await (supabase as any)
                .from('project_assignments')
                .select(`
                    id,
                    project_id,
                    status,
                    client_projects (
                        id,
                        title,
                        category,
                        deadline,
                        status,
                        budget
                    )
                `)
                .eq('designer_id', user.id)
                .in('status', ['claimed', 'in_progress', 'active']);

            if (assignmentError) throw assignmentError;

            const { data: contractClaims, error: contractClaimsError } = await (supabase as any)
                .from('job_contract_claims')
                .select(`
                    id,
                    contract_id,
                    status,
                    job_contracts (
                        id,
                        title,
                        category,
                        deadline,
                        budget,
                        status
                    )
                `)
                .eq('designer_id', user.id)
                .eq('status', 'active');

            if (contractClaimsError) throw contractClaimsError;

            const { data: orders, error: orderError } = await (supabase
                .from('client_orders') as any)
                .select('id, service_type, tier, deadline_at, project_status, price')
                .eq('assigned_designer_id', user.id)
                .neq('project_status', 'completed');

            if (orderError) throw orderError;

            const unified: ActiveContract[] = [
                ...(assignments || [])
                    .filter((a: any) => a.client_projects)
                    .map((a: any) => ({
                        id: a.client_projects.id,
                        title: a.client_projects.title,
                        service_type: a.client_projects.category,
                        tier: 'Standard',
                        deadline_at: a.client_projects.deadline || new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                        project_status: a.client_projects.status,
                        price: 0,
                        source: 'client_projects' as const,
                        assignment_status: a.status,
                    })),
                ...(contractClaims || [])
                    .filter((c: any) => c.job_contracts)
                    .map((c: any) => ({
                        id: c.job_contracts.id,
                        title: c.job_contracts.title,
                        service_type: c.job_contracts.category,
                        tier: 'Standard',
                        deadline_at: c.job_contracts.deadline || new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                        project_status: c.job_contracts.status,
                        price: 0,
                        source: 'job_contracts' as const,
                        assignment_status: c.status || 'claimed',
                    })),
                ...(orders || []).map((o: any) => ({
                    id: o.id,
                    title: o.service_type ? `Legacy Order: ${o.service_type}` : 'Legacy Order',
                    service_type: o.service_type,
                    tier: o.tier,
                    deadline_at: o.deadline_at,
                    project_status: o.project_status,
                    price: o.price,
                    source: 'client_orders' as const,
                }))
            ];

            const seen = new Set();
            const nowTime = new Date();
            const filtered = unified
                .filter(item => {
                    const isDuplicate = seen.has(item.id);
                    seen.add(item.id);
                    const isExpired = isAfter(nowTime, new Date(item.deadline_at));
                    const isSubmitted = item.assignment_status === 'submitted' || item.project_status === 'submitted' || item.project_status === 'completed';
                    return !isDuplicate && !isExpired && !isSubmitted;
                });

            setContracts(filtered.sort((a, b) => new Date(a.deadline_at).getTime() - new Date(b.deadline_at).getTime()));
        } catch (err) {
            console.error('Error loading active contracts:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUnclaim = async (contractId: string, source: 'client_projects' | 'client_orders' | 'job_contracts') => {
        if (!user) return;
        setUnclaiming(contractId);
        try {
            // Try release RPC
            let rpcSuccess = false;
            try {
                const { error } = await (supabase as any).rpc('release_job_contract', { p_contract_id: contractId });
                if (!error) rpcSuccess = true;
            } catch { }

            if (!rpcSuccess) {
                if (source === 'client_projects') {
                    const { error } = await supabase
                        .from('project_assignments')
                        .delete()
                        .eq('project_id', contractId)
                        .eq('designer_id', user.id);
                    if (error) throw error;
                } else if (source === 'job_contracts') {
                    const { error: claimError } = await (supabase as any)
                        .from('job_contract_claims')
                        .update({ status: 'cancelled' })
                        .eq('contract_id', contractId)
                        .eq('designer_id', user.id);
                    if (claimError) throw claimError;

                    const { data: contractData } = await (supabase as any)
                        .from('job_contracts')
                        .select('active_designer_ids, active_designers_count')
                        .eq('id', contractId)
                        .single();

                    const currentIds: string[] = contractData?.active_designer_ids || [];
                    const newIds = currentIds.filter((id: string) => id !== user.id);
                    const newCount = Math.max(0, (contractData?.active_designers_count || 1) - 1);

                    const { error: contractError } = await (supabase as any)
                        .from('job_contracts')
                        .update({
                            active_designer_ids: newIds,
                            active_designers_count: newCount,
                        })
                        .eq('id', contractId);
                    if (contractError) throw contractError;
                } else {
                    const { error } = await (supabase.from('client_orders') as any)
                        .update({ assigned_designer_id: null, project_status: 'unassigned' })
                        .eq('id', contractId)
                        .eq('assigned_designer_id', user.id);
                    if (error) throw error;
                }
            }

            // Clear local storage started state
            localStorage.removeItem(`started_project_${user.id}`);
            toast({ title: 'Job Released 🔄', description: 'The project has been released back to the marketplace pool.' });
            loadContracts();
        } catch (err: any) {
            toast({ title: 'Release Failed', description: err.message, variant: 'destructive' });
        } finally {
            setUnclaiming(null);
        }
    };

    const handleStartWork = async (projectId: string) => {
        if (!user) return;
        setStarting(projectId);
        try {
            let rpcSuccess = false;
            try {
                const { error } = await (supabase as any).rpc('start_job_contract_work', { p_contract_id: projectId });
                if (!error) rpcSuccess = true;
            } catch { }

            if (!rpcSuccess) {
                await (supabase as any)
                    .from('job_contract_claims')
                    .update({ status: 'in_progress' })
                    .eq('contract_id', projectId)
                    .eq('designer_id', user.id);

                await (supabase as any)
                    .from('project_assignments')
                    .update({ status: 'in_progress' })
                    .eq('project_id', projectId)
                    .eq('designer_id', user.id);
            }

            const contract = contracts.find(c => c.id === projectId);
            localStorage.setItem(`started_project_${user.id}`, JSON.stringify({
                jobId: projectId,
                title: contract?.title || 'Active Project',
                startedAt: new Date().toISOString()
            }));

            toast({ title: 'Work Started! 🚀', description: 'You can now submit your work when ready.' });
            loadContracts();
        } catch (err: any) {
            toast({ title: 'Could not start work', description: err.message, variant: 'destructive' });
        } finally {
            setStarting(null);
        }
    };

    const handleChatClick = () => {
        toast({ title: 'Client Messaging Coming Soon', description: 'This feature is currently under development.' });
    };

    const getDeadlineStatus = (deadline: string) => {
        const d = new Date(deadline);
        const isOverdue = isAfter(now, d);
        return {
            isOverdue,
            text: isOverdue ? `Expired` : `Due in ${formatDistanceToNow(d)}`,
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
                                            {contract.title || CATEGORY_LABELS[contract.service_type] || contract.service_type}
                                        </h3>
                                    </div>
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
                                            {contract.assignment_status === 'claimed' ? (
                                                <>
                                                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                                    <span>Claimed — not started</span>
                                                </>
                                            ) : contract.project_status === 'submitted' ? (
                                                <>
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                                    <span className="capitalize">{contract.project_status.replace('_', ' ')}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                                    <span className="capitalize">In progress</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            className="h-8 text-xs font-bold px-3 opacity-90"
                                            disabled={unclaiming === contract.id}
                                            onClick={() => handleUnclaim(contract.id, contract.source)}
                                        >
                                            {unclaiming === contract.id ? 'Releasing...' : 'Release Job'}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 w-8 p-0"
                                            onClick={handleChatClick}
                                            title="Chat with Client"
                                        >
                                            <MessageSquare className="w-3.5 h-3.5 text-primary" />
                                        </Button>
                                        {contract.assignment_status === 'claimed' ? (
                                            <Button
                                                size="sm"
                                                className="h-8 text-xs font-bold px-3 gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white"
                                                disabled={starting === contract.id}
                                                onClick={() => handleStartWork(contract.id)}
                                            >
                                                {starting === contract.id ? 'Starting...' : 'Start Work'}
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                className="h-8 text-xs font-bold px-3 gap-1.5"
                                                onClick={() => navigate(`/submit-work`)}
                                            >
                                                Submit Work <ExternalLink className="w-3 h-3" />
                                            </Button>
                                        )}
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
