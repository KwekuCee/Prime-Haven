import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Calendar, DollarSign, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, addDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface OpenOrder {
    id: string;
    source: 'client_projects' | 'client_orders';
    service_type: string;
    title: string;
    tier?: string;
    price?: number;
    budget?: string;
    description: string;
    created_at: string;
    required_professions?: string[];
    max_assignees?: number;
    current_claims?: number;
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

const ProjectMarketplace = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [orders, setOrders] = useState<OpenOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState<string | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<OpenOrder | null>(null);

    useEffect(() => {
        loadOpenOrders();
    }, [user]);

    const loadOpenOrders = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Get designer professions to filter pools
            const { data: designer } = await supabase
                .from('designer_details')
                .select('professions, professional_title')
                .eq('user_id', user.id)
                .maybeSingle();

            const userProfessions = designer?.professions && designer.professions.length > 0
                ? designer.professions
                : [designer?.professional_title ? 'Graphic Designer' : 'Graphic Designer']; // Default fallback

            // 1. Fetch from client_projects (new pooling system)
            const { data: projects, error: projectsError } = await supabase
                .from('client_projects')
                .select(`
                    id,
                    title,
                    category,
                    description,
                    created_at,
                    budget,
                    required_professions,
                    max_assignees,
                    project_assignments(count)
                `)
                .eq('status', 'pending')
                .overlaps('required_professions', userProfessions);

            if (projectsError) throw projectsError;

            // 2. Fetch from client_orders (legacy/direct pool)
            const { data: orders, error: ordersError } = await supabase
                .from('client_orders')
                .select('*')
                .eq('payment_status', 'paid')
                .eq('project_status', 'unassigned');

            if (ordersError) throw ordersError;

            // 3. Unify the results
            const projectMarket: OpenOrder[] = (projects || []).map((p: any) => ({
                id: p.id,
                source: 'client_projects',
                service_type: p.category,
                title: p.title,
                description: p.description,
                created_at: p.created_at,
                budget: p.budget,
                required_professions: p.required_professions,
                max_assignees: p.max_assignees,
                current_claims: p.project_assignments?.[0]?.count || 0
            })).filter(p => p.current_claims! < p.max_assignees!);

            const orderMarket: OpenOrder[] = (orders || []).map((o: any) => ({
                id: o.id,
                source: 'client_orders',
                service_type: o.service_type,
                title: `${CATEGORY_LABELS[o.service_type] || o.service_type} — ${o.tier}`,
                tier: o.tier,
                price: o.price,
                description: o.description,
                created_at: o.created_at
            }));

            setOrders([...projectMarket, ...orderMarket].sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ));
        } catch (err) {
            console.error('Error loading marketplace:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleClaim = async (order: OpenOrder) => {
        if (!user) return;
        setClaiming(order.id);
        try {
            if (order.source === 'client_projects') {
                // Use the new RPC system for client_projects
                const { error } = await supabase.rpc('claim_project', {
                    p_project_id: order.id
                });
                if (error) throw error;
            } else {
                // Legacy logic for client_orders
                const deadline = addDays(new Date(), 2).toISOString();
                const { error } = await (supabase
                    .from('client_orders') as any)
                    .update({
                        assigned_designer_id: user.id,
                        project_status: 'in_progress',
                        claimed_at: new Date().toISOString(),
                        deadline_at: deadline
                    })
                    .eq('id', order.id)
                    .eq('project_status', 'unassigned');
                if (error) throw error;
            }

            toast({
                title: 'Project Claimed! 🚀',
                description: `You have successfully started working on "${order.title}".`,
            });

            // Refresh list
            loadOpenOrders();
            setSelectedOrder(null);
        } catch (err: any) {
            toast({
                title: 'Claim Failed',
                description: err.message || 'Failed to claim project. It might have been taken.',
                variant: 'destructive',
            });
        } finally {
            setClaiming(null);
        }
    };


    if (loading) return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map(i => (
                <Card key={i} className="animate-pulse bg-card/50 h-40" />
            ))}
        </div>
    );

    if (orders.length === 0) return (
        <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center">
            <Briefcase className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-muted-foreground">Marketplace is Quiet</h3>
            <p className="text-xs text-muted-foreground/60 mt-1">New paid orders will appear here for you to claim.</p>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-heading font-bold uppercase tracking-tight">Project Pool</h2>
                        <p className="text-xs text-muted-foreground font-medium">{orders.length} paid job{orders.length !== 1 ? 's' : ''} available</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orders.map((order) => (
                    <motion.div key={order.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                        <Card className="group relative overflow-hidden glass border-border/50 hover:border-primary/40 transition-all">
                            <div className="absolute top-0 right-0 p-3">
                                <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20">
                                    PAID
                                </Badge>
                            </div>

                            <CardHeader className="pb-3">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-[10px] text-primary font-bold uppercase tracking-widest">
                                            {order.source === 'client_projects' ? 'CLIENT POOL' : `${order.tier} PACKAGE`}
                                        </p>
                                        {order.required_professions && (
                                            <div className="flex gap-1 overflow-hidden">
                                                {order.required_professions.map(p => (
                                                    <span key={p} className="text-[8px] bg-muted px-1.5 py-0.5 rounded-full whitespace-nowrap opacity-70">
                                                        {p.charAt(0)}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <CardTitle className="text-sm font-heading line-clamp-1">
                                        {order.title}
                                    </CardTitle>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                    {order.description || "No specific details provided. Contact client in workspace after claiming."}
                                </p>

                                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-muted-foreground uppercase">Reward</span>
                                            <span className="text-xs font-bold text-primary flex items-center gap-1">
                                                <DollarSign className="w-3 h-3" />
                                                {order.source === 'client_projects' ? (order.budget || '—') : order.price?.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-muted-foreground uppercase">Posted</span>
                                            <span className="text-[10px] font-medium flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {format(new Date(order.created_at), 'MMM d')}
                                            </span>
                                        </div>
                                    </div>

                                    <Button
                                        size="sm"
                                        className="h-8 text-xs font-bold px-4"
                                        onClick={() => setSelectedOrder(order)}
                                    >
                                        Details
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
                <DialogContent className="sm:max-w-[500px] glass">
                    <DialogHeader>
                        <DialogTitle>Project Brief</DialogTitle>
                        <DialogDescription>
                            Review the details before claiming this project.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedOrder && (
                        <div className="space-y-4 py-4">
                            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3">
                                <div>
                                    <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Project Name</h4>
                                    <p className="text-sm font-medium">{selectedOrder.title}</p>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Category</h4>
                                    <p className="text-xs">{CATEGORY_LABELS[selectedOrder.service_type] || selectedOrder.service_type}</p>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Client Brief</h4>
                                    <p className="text-xs leading-relaxed text-muted-foreground italic">
                                        "{selectedOrder.description || "No details provided."}"
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 text-xs font-medium">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-primary" />
                                        <span>Standard Deadline: 2 Days</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-500">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                Once claimed, you are responsible for delivering this project on time.
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedOrder(null)}>Cancel</Button>
                        <Button
                            disabled={claiming === selectedOrder?.id}
                            onClick={() => selectedOrder && handleClaim(selectedOrder)}
                            className="gap-2"
                        >
                            {claiming === selectedOrder?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {claiming === selectedOrder?.id ? 'Claiming...' : 'Claim Project'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ProjectMarketplace;
