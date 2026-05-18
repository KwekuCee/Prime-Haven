import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface Claim {
    id: string;
    status: string;
    claimed_at: string;
    contract: {
        id: string;
        title: string;
        category: string;
        budget: string | null;
        deadline: string | null;
        status: string;
    };
}

const CATEGORY_LABELS: Record<string, string> = {
    'graphic-design': 'Graphic Design',
    'app-design': 'UI/UX Design',
    'web-dev': 'Web Development',
};

const ClaimedContracts = () => {
    const { user } = useAuth();
    const [claims, setClaims] = useState<Claim[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const loadClaims = async () => {
            setLoading(true);
            try {
                const { data, error } = await (supabase as any)
                    .from('job_contract_claims')
                    .select(`
            id, status, claimed_at,
            contract:job_contracts(id, title, category, budget, deadline, status)
          `)
                    .eq('designer_id', user.id)
                    .eq('status', 'active')
                    .order('claimed_at', { ascending: false })
                    .limit(10);

                if (error) throw error;
                setClaims(data || []);
            } catch (err) {
                console.error('Error loading claimed contracts:', err);
            } finally {
                setLoading(false);
            }
        };
        loadClaims();
    }, [user]);

    if (loading) {
        return (
            <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5 flex items-center justify-center h-32">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
        );
    }

    if (claims.length === 0) return null;

    const getStatusBadge = (contractStatus: string) => {
        if (contractStatus === 'completed') return { label: 'Completed', className: 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' };
        if (contractStatus === 'in_progress') return { label: 'In Progress', className: 'text-primary border-primary/20 bg-primary/10' };
        if (contractStatus === 'cancelled') return { label: 'Cancelled', className: 'text-red-500 border-red-500/20 bg-red-500/10' };
        return { label: 'Active', className: 'text-amber-500 border-amber-500/20 bg-amber-500/10' };
    };

    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border/50">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Briefcase className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-sm font-heading font-bold">My Active Contracts</h2>
                        <p className="text-[10px] text-muted-foreground">{claims.length} contract{claims.length !== 1 ? 's' : ''} claimed</p>
                    </div>
                </div>
            </div>

            <div className="divide-y divide-border/40">
                {claims.map((claim) => {
                    const contract = claim.contract;
                    const badge = getStatusBadge(contract?.status || 'active');
                    return (
                        <div key={claim.id} className="p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                {contract?.status === 'completed'
                                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    : contract?.status === 'cancelled'
                                        ? <XCircle className="w-4 h-4 text-red-500" />
                                        : <Briefcase className="w-4 h-4 text-primary" />
                                }
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">{contract?.title || 'Untitled Contract'}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-muted-foreground">
                                        {CATEGORY_LABELS[contract?.category || ''] || contract?.category}
                                    </span>
                                    {contract?.deadline && (
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <Clock className="w-2.5 h-2.5" />
                                            Due {format(new Date(contract.deadline), 'MMM d')}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                                {contract?.budget && (
                                    <span className="text-xs font-bold text-primary hidden sm:block">{contract.budget}</span>
                                )}
                                <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider ${badge.className}`}>
                                    {badge.label}
                                </Badge>
                            </div>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
};

export default ClaimedContracts;
