import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Calendar, DollarSign, Clock, CheckCircle2, AlertCircle, Loader2, Lock, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { format, addDays, isAfter } from 'date-fns';
import { getRevenueSharePercent, DEFAULT_REVENUE_SHARE_PERCENT, shareOf } from '@/lib/revenue';
import { useToast } from '@/hooks/use-toast';
import { useUsdRate } from '@/hooks/useUsdRate';
import { TalentCooldownBanner } from '@/components/dashboard/TalentCooldownBanner';
import { checkCooldownStatus } from '@/lib/deadlineTimer';

interface OpenOrder {
    id: string;
    source: 'client_projects' | 'client_orders' | 'job_contracts';
    service_type: string;
    title: string;
    tier?: string;
    price?: number;
    budget?: string;
    description: string;
    created_at: string;
    deadline?: string;
    deadline_hours?: number;
    required_professions?: string[];
    max_assignees?: number;
    current_claims?: number;
    is_claimed?: boolean;
    claimed_by_user?: boolean;
    price_ghs?: number;
    your_share?: number;
}

const CATEGORY_LABELS: Record<string, string> = {
    'logo-design': 'Logo Design',
    'brand-identity': 'Brand Identity',
    'app-design': 'UI/UX Design',
    'ui-ux-design': 'UI/UX Design',
    'web-design': 'Web Design',
    'web-development': 'Web Development',
    'mobile-app-development': 'Mobile App Development',
    'motion-graphics': 'Motion Graphics',
    'video-editing': 'Video Editing',
    'social-media-management': 'Social Media Management',
    'it-solutions': 'General IT Solutions',
    'print-design': 'Print Design',
    'flyer-design': 'Flyer / Poster Design',
    'social-media': 'Social Media Design',
    'App/UI/UX Design': 'UI/UX Design',
    'Graphic Design': 'Graphic Design',
    'Web Development': 'Web Development',
    'graphic-design': 'Graphic Design',
    'web-dev': 'Web Development',
};

// Maps job contract category IDs → which profession labels can see them
const PROFESSION_MAPPING: Record<string, string[]> = {
    'logo-design': ['Graphic Designer'],
    'brand-identity': ['Graphic Designer'],
    'print-design': ['Graphic Designer'],
    'flyer-design': ['Graphic Designer'],
    'social-media': ['Graphic Designer', 'Social Media Manager'],
    'graphic-design': ['Graphic Designer'],
    'Graphic Design': ['Graphic Designer'],
    'app-design': ['UI/UX Designer'],
    'ui-ux-design': ['UI/UX Designer'],
    'UI/UX Design': ['UI/UX Designer'],
    'App/UI/UX Design': ['UI/UX Designer'],
    'web-design': ['Web Developer'],
    'web-development': ['Web Developer'],
    'Web Development': ['Web Developer'],
    'web-dev': ['Web Developer'],
    'mobile-app-development': ['Mobile App Developer'],
    'Mobile App Development': ['Mobile App Developer'],
    'motion-graphics': ['Motion Graphics Designer'],
    'Motion Graphics': ['Motion Graphics Designer'],
    'video-editing': ['Video Editor'],
    'Video Editing': ['Video Editor'],
    'social-media-management': ['Social Media Manager'],
    'Social Media Management': ['Social Media Manager'],
    'it-solutions': ['IT Specialist'],
    'General IT Solutions': ['IT Specialist'],
};

// Derives a canonical profession label from designer_details.professional_title
const deriveProfession = (title: string | null | undefined): string => {
    const t = (title || '').toLowerCase();
    if (t.includes('mobile') || t.includes('android') || t.includes('ios') || t.includes('flutter') || t.includes('react native')) return 'Mobile App Developer';
    if (t.includes('motion') || t.includes('animation') || t.includes('after effects')) return 'Motion Graphics Designer';
    if (t.includes('video') || t.includes('editor') || t.includes('premiere') || t.includes('davinci')) return 'Video Editor';
    if (t.includes('social') || t.includes('smm') || t.includes('community')) return 'Social Media Manager';
    if (t.includes('it') || t.includes('sysadmin') || t.includes('network') || t.includes('cloud') || t.includes('infrastructure')) return 'IT Specialist';
    if (t.includes('ui') || t.includes('ux') || t.includes('figma') || t.includes('product design')) return 'UI/UX Designer';
    if (t.includes('web') || t.includes('dev') || t.includes('frontend') || t.includes('fullstack') || t.includes('full-stack') || t.includes('backend')) return 'Web Developer';
    return 'Graphic Designer';
};



interface ProjectMarketplaceProps {
    fullWidth?: boolean;
}

const ProjectMarketplace = ({ fullWidth = false }: ProjectMarketplaceProps) => {
    const money = useUsdRate();
    const { user } = useAuth();
    const { toast } = useToast();
    const [orders, setOrders] = useState<OpenOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState<string | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<OpenOrder | null>(null);
    const [sharePercent, setSharePercent] = useState(DEFAULT_REVENUE_SHARE_PERCENT);
    const [cooldownUntil, setCooldownUntil] = useState<string | null>(null);
    const [cooldownReason, setCooldownReason] = useState<string | null>(null);

    useEffect(() => {
        loadOpenOrders();
    }, [user]);

    // Instant refresh on claim / start / submit / unclaim (Lovable Cloud Realtime websockets)
    useRealtimeSync(
        ['job_contracts', 'job_contract_claims', 'project_assignments', 'client_projects', 'designer_details'],
        () => { void loadOpenOrders(); },
        'marketplace',
    );

    const loadOpenOrders = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Get designer details including cooldown status and professional_title
            const { data: designer } = await (supabase
                .from('designer_details') as any)
                .select('professional_title, professions, cooldown_until, cooldown_reason')
                .eq('user_id', user.id)
                .maybeSingle();

            if (designer?.cooldown_until) {
                setCooldownUntil(designer.cooldown_until);
                setCooldownReason(designer.cooldown_reason || 'Previous project deadline expired before submission.');
            } else {
                setCooldownUntil(null);
                setCooldownReason(null);
            }

            const share = await getRevenueSharePercent();
            setSharePercent(share);

            const derivedProf = deriveProfession(designer?.professional_title);
            // Use the professions array if it has items, otherwise fallback to derived
            const userProfessions = designer?.professions && designer.professions.length > 0
                ? designer.professions
                : [derivedProf];

            // 1. Fetch from client_projects via secure RPC (excludes client PII)
            const { data: projectsRaw, error: projectsError } = await (supabase as any)
                .rpc('get_pending_client_projects');

            if (projectsError) throw projectsError;

            // Fetch assignments for those projects so we can compute claims and who claimed
            const projectIds: string[] = (projectsRaw || []).map((p: any) => p.id);
            const { data: assignmentsData } = projectIds.length
                ? await supabase
                    .from('project_assignments')
                    .select('project_id, designer_id, status')
                    .in('project_id', projectIds)
                    .in('status', ['claimed', 'active', 'in_progress'])
                : { data: [] as any[] };
            const assignmentsByProject: Record<string, any[]> = {};
            (assignmentsData || []).forEach((a: any) => {
                (assignmentsByProject[a.project_id] ||= []).push(a);
            });
            const projects = (projectsRaw || []).map((p: any) => ({
                ...p,
                project_assignments: assignmentsByProject[p.id] || [],
            }));

            // 2. Fetch from client_orders (legacy/direct pool)
            const { data: orders, error: ordersError } = await (supabase
                .from('client_orders') as any)
                .select('*')
                .eq('payment_status', 'paid');

            if (ordersError) throw ordersError;

            // 3. Fetch open job contracts via sanitized RPC (hides client-identifying fields)
            const { data: contracts, error: contractsError } = await (supabase as any)
                .rpc('get_open_job_contracts');

            if (contractsError) throw contractsError;

            // Contracts this user has active claims on
            const { data: myClaims } = await (supabase as any)
                .from('job_contract_claims')
                .select('contract_id, status')
                .eq('designer_id', user.id)
                .in('status', ['claimed', 'active', 'in_progress']);
            const myClaimedContractIds = new Set<string>((myClaims || []).map((c: any) => c.contract_id));

            // 4. Unify and map results - KEEP CLAIMED JOBS VISIBLE AS INSTRUCTED!
            const now = new Date();

            const projectMarket: OpenOrder[] = (projects || [])
                .filter((p: any) => {
                    const reqProfs: string[] = p.required_professions || [];
                    const profMatch = reqProfs.length === 0 || reqProfs.some((rp: string) => userProfessions.includes(rp));
                    return profMatch;
                })
                .map((p: any) => {
                    const isClaimed = (p.project_assignments?.length || 0) >= 1 || p.status === 'in_progress' || !!p.accepted_designer_id;
                    const claimedByUser = p.project_assignments?.some((a: any) => a.designer_id === user.id) || p.accepted_designer_id === user.id;
                    return {
                        id: p.id,
                        source: 'client_projects' as const,
                        service_type: p.category,
                        title: p.title || `Project: ${CATEGORY_LABELS[p.category] || p.category || 'Untitled'}`,
                        description: p.description,
                        created_at: p.created_at,
                        deadline: p.deadline,
                        deadline_hours: p.deadline_hours || 48,
                        budget: p.budget,
                        required_professions: p.required_professions,
                        max_assignees: 1, // Enforced: strictly 1 person per job
                        current_claims: p.project_assignments?.length || 0,
                        is_claimed: isClaimed,
                        claimed_by_user: claimedByUser,
                        price_ghs: Number(p.price_ghs || 0),
                        your_share: shareOf(Number(p.price_ghs || 0), share)
                    };
                });

            const orderMarket: OpenOrder[] = (orders || [])
                .filter((o: any) => {
                    const required = PROFESSION_MAPPING[o.service_type] || ['Graphic Designer'];
                    return required.some(p => userProfessions.includes(p));
                })
                .map((o: any) => {
                    const isClaimed = !!o.assigned_designer_id || o.project_status === 'in_progress';
                    const claimedByUser = o.assigned_designer_id === user.id;
                    return {
                        id: o.id,
                        source: 'client_orders' as const,
                        service_type: o.service_type,
                        title: `${CATEGORY_LABELS[o.service_type] || o.service_type} — ${o.tier || 'Standard'}`,
                        tier: o.tier || 'Standard',
                        price: o.price,
                        description: o.description,
                        created_at: o.created_at,
                        deadline: o.deadline_at,
                        deadline_hours: 48,
                        is_claimed: isClaimed,
                        claimed_by_user: claimedByUser,
                    };
                });

            const jobMarket: OpenOrder[] = (contracts || [])
                .filter((c: any) => {
                    const targetProfs: string[] = c.target_professions || [];
                    if (targetProfs.length > 0) {
                        return targetProfs.some(p => userProfessions.includes(p));
                    }
                    const required = PROFESSION_MAPPING[c.category] || ['Graphic Designer'];
                    return required.some(p => userProfessions.includes(p));
                })
                .map((c: any) => {
                    const isClaimed = (c.active_designers_count || 0) >= 1 || c.status === 'in_progress';
                    const claimedByUser = myClaimedContractIds.has(c.id);
                    return {
                        id: c.id,
                        source: 'job_contracts' as const,
                        service_type: c.category,
                        title: c.title || `Contract: ${CATEGORY_LABELS[c.category] || c.category || 'Untitled'}`,
                        budget: c.budget,
                        description: c.description,
                        created_at: c.created_at,
                        deadline: c.deadline,
                        deadline_hours: c.deadline_hours || 48,
                        is_claimed: isClaimed,
                        claimed_by_user: claimedByUser,
                    };
                });

            const combinedRaw = [...projectMarket, ...orderMarket, ...jobMarket].sort((a, b) => {
                // Available jobs first, then by date
                if (a.is_claimed !== b.is_claimed) return a.is_claimed ? 1 : -1;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });

            // Deduplicate by title to prevent showing the same job from two sources
            const uniqueTitles = new Set();
            const combined = combinedRaw.filter(order => {
                if (!order.title) return true;
                const normalizedTitle = order.title.trim().toLowerCase();
                if (uniqueTitles.has(normalizedTitle)) return false;
                uniqueTitles.add(normalizedTitle);
                return true;
            });

            setOrders(combined);
        } catch (err) {
            console.error('Error loading marketplace:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleClaim = async (order: OpenOrder) => {
        if (!user) return;

        // Check if talent is in cooldown
        const cooldown = checkCooldownStatus(cooldownUntil);
        if (cooldown.isInCooldown) {
            toast({
                title: 'Account in 48-Hour Cooldown ⏳',
                description: `You cannot claim jobs for the next ${cooldown.formattedCooldown} due to an unfulfilled project deadline.`,
                variant: 'destructive',
            });
            return;
        }

        if (order.is_claimed) {
            toast({
                title: 'Job Already Claimed 🔒',
                description: 'This project is already claimed by a professional. Only available jobs can be claimed.',
                variant: 'destructive',
            });
            return;
        }

        setClaiming(order.id);
        try {
            if (order.source === 'client_projects') {
                // Use the new RPC system for client_projects
                const { error } = await supabase.rpc('claim_project', {
                    p_project_id: order.id
                });
                if (error) throw error;
            } else if (order.source === 'job_contracts') {
                // New RPC enforces: active-work lock + category cap (graphic-design = 2, others = 1)
                const { error: claimError } = await (supabase as any).rpc('claim_job_contract', {
                    p_contract_id: order.id,
                });
                if (claimError) throw new Error(claimError.message || 'Could not claim contract.');

                // Notify admin
                await supabase.functions.invoke('notify-designer', {
                    body: {
                        designerId: user.id,
                        projectName: order.title,
                        notificationType: 'contract_application',
                    },
                });
                toast({ title: 'Contract Claimed! 🚀', description: `You've claimed "${order.title}". Admin has been notified.` });
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
            const raw: string = err?.message || 'Failed to claim project. It might have been taken.';
            const isActiveLimit =
                /active job contract/i.test(raw) ||
                /Finish your current project/i.test(raw) ||
                /active project\./i.test(raw);
            const description = isActiveLimit
                ? `${raw}\n\nAdmins: open the user's active contract in Job Contracts and release it, or use the "Force Release" action, before claiming another on their behalf.`
                : raw;
            toast({
                title: isActiveLimit ? 'Active contract limit reached' : 'Claim Failed',
                description,
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
            <TalentCooldownBanner cooldownUntil={cooldownUntil} cooldownReason={cooldownReason} />

            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-heading font-bold uppercase tracking-tight">Project Pool</h2>
                        <p className="text-xs text-muted-foreground font-medium">
                            {orders.filter(o => !o.is_claimed).length} available to claim · {orders.filter(o => o.is_claimed).length} in progress
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orders.map((order) => {
                    const isCooldown = checkCooldownStatus(cooldownUntil).isInCooldown;
                    return (
                        <motion.div key={order.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                            <Card className={`group relative overflow-hidden glass border-border/50 transition-all ${order.is_claimed ? 'opacity-85 border-amber-500/20' : 'hover:border-primary/40'}`}>
                                <div className="absolute top-0 right-0 p-3">
                                    {order.is_claimed ? (
                                        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 gap-1 text-[10px] font-bold">
                                            <Lock className="w-3 h-3" />
                                            {order.claimed_by_user ? 'CLAIMED BY YOU' : 'CLAIMED'}
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20 text-[10px] font-bold">
                                            AVAILABLE
                                        </Badge>
                                    )}
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
                                                <span className="text-[10px] text-muted-foreground uppercase">You earn ({sharePercent}%)</span>
                                                <span className="text-xs font-bold text-primary flex items-center gap-1">
                                                    <DollarSign className="w-3 h-3" />
                                                    {order.source === 'client_projects'
                                                        ? (order.your_share ? money.usd(order.your_share) : (order.budget ? String(order.budget) : '—'))
                                                        : order.source === 'job_contracts'
                                                            ? (order.budget ? String(order.budget) : '—')
                                                            : (order.price ? money.usd(shareOf(order.price, sharePercent)) : '—')}
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-muted-foreground uppercase">Turnaround</span>
                                                <span className="text-[10px] font-medium flex items-center gap-1">
                                                    <Clock className="w-3 h-3 text-primary" />
                                                    {order.deadline_hours ? `${order.deadline_hours}h deadline` : (order.deadline ? format(new Date(order.deadline), 'MMM d, yyyy') : '48h deadline')}
                                                </span>
                                            </div>
                                        </div>

                                        {order.is_claimed ? (
                                            order.claimed_by_user ? (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="h-8 text-xs font-bold px-3 gap-1.5 opacity-90 cursor-default"
                                                    disabled
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Your Active Job
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-xs font-bold px-3 gap-1.5 bg-muted/40 text-muted-foreground border-border/40 cursor-not-allowed opacity-80"
                                                    disabled
                                                >
                                                    <Lock className="w-3 h-3" /> Claimed
                                                </Button>
                                            )
                                        ) : (
                                            <Button
                                                size="sm"
                                                className="h-8 text-xs font-bold px-4"
                                                onClick={() => setSelectedOrder(order)}
                                                disabled={isCooldown}
                                            >
                                                {isCooldown ? 'Cooldown Active' : 'Details & Claim'}
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    );
                })}
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
                            {selectedOrder.is_claimed && (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-500 font-medium">
                                    <Lock className="w-4 h-4 shrink-0" />
                                    <span>This project is already claimed by a professional.</span>
                                </div>
                            )}

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
                                        <Clock className="w-3.5 h-3.5 text-primary" />
                                        <span>Turnaround: {selectedOrder.deadline_hours ? `${selectedOrder.deadline_hours} Hours from claim` : (selectedOrder.deadline ? format(new Date(selectedOrder.deadline), 'MMM d, yyyy') : '48 Hours')}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                                        <span className="text-emerald-500 font-bold">You earn ({sharePercent}%): {selectedOrder.source === 'client_projects' ? (selectedOrder.your_share ? money.usd(selectedOrder.your_share) : (selectedOrder.budget ? String(selectedOrder.budget) : '—')) : selectedOrder.source === 'job_contracts' ? (selectedOrder.budget ? String(selectedOrder.budget) : '—') : (selectedOrder.price ? money.usd(shareOf(selectedOrder.price, sharePercent)) : '—')}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-500">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                Strictly one professional per job. Countdown starts immediately upon claiming.
                                Automated email warnings are sent at 50%, 70%, and 90% of the deadline. Failing to submit by deadline incurs a 48-hour activity cooldown.
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedOrder(null)}>Cancel</Button>
                        <Button
                            disabled={claiming === selectedOrder?.id || selectedOrder?.is_claimed || checkCooldownStatus(cooldownUntil).isInCooldown}
                            onClick={() => selectedOrder && handleClaim(selectedOrder)}
                            className="gap-2"
                        >
                            {claiming === selectedOrder?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {claiming === selectedOrder?.id ? 'Claiming...' : selectedOrder?.is_claimed ? 'Already Claimed' : checkCooldownStatus(cooldownUntil).isInCooldown ? 'In 48h Cooldown' : 'Claim Project'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ProjectMarketplace;
