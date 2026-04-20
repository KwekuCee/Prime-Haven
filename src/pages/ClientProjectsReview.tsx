import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, CheckCircle, Clock, Search, XCircle, Filter, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const ClientProjectsReview = () => {
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('pending_review'); // pending_review | accepted

    // Accept Dialog state
    const [isAcceptOpen, setIsAcceptOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!authLoading && user?.email) {
            loadSubmissions();
        }
    }, [user, authLoading, filter]);

    const loadSubmissions = async () => {
        try {
            setLoading(true);

            // 1. Fetch user orders to match submissions
            const { data: ordersData } = await supabase
                .from('client_orders')
                .select('id, service_type')
                .eq('client_email', user?.email);

            const orderIds = (ordersData || []).map(o => o.id);
            const serviceTypes = (ordersData || []).map(o => o.service_type?.toLowerCase());

            // 2. Fetch submissions that are ph_approved
            // We use maybe bypass logic if RLS blocks, but we assume RLS allows or RPC
            const { data: subData, error } = await supabase
                .from('submissions')
                .select('*, profiles!designer_id(full_name)')
                .eq('ph_approved', true) // Must be approved by PH first
                .order('ph_approved_at', { ascending: false });

            if (error) {
                console.warn('Submissions fetch error (likely RLS):', error);
                toast({ title: "Authorization Error", description: "You don't have permission to view submissions directly without the updated SQL schema.", variant: 'destructive' });
                setLoading(false);
                return;
            }

            // Filter to ensuring client ownership
            let clientSubs = (subData || []).filter(sub =>
                orderIds.includes(sub.client_ref) ||
                (sub.project_name && serviceTypes.includes(sub.project_name.toLowerCase()))
            );

            // Apply specific UI filter
            if (filter === 'pending_review') {
                clientSubs = clientSubs.filter(s => !s.client_accepted);
            } else {
                clientSubs = clientSubs.filter(s => s.client_accepted);
            }

            setSubmissions(clientSubs);
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptClick = (id: string) => {
        setSelectedId(id);
        setIsAcceptOpen(true);
    };

    const executeAcceptance = async () => {
        if (!selectedId) return;
        setProcessing(true);
        try {
            const submission = submissions.find(s => s.id === selectedId);
            if (!submission) throw new Error('Submission not found in local state');

            // Map points to service
            const servicePointsMap: Record<string, number> = { logo: 45, branding: 50, uiux: 65, web: 65, print: 20, flyer: 40 };
            const clientPoints = servicePointsMap[submission.service_type || 'web'] || 40;

            // Update submission status to approved and flag client_accepted
            const { error: subError } = await supabase.from('submissions').update({
                client_accepted: true,
                client_accepted_at: new Date().toISOString(),
                client_accepted_by: user?.id,
                points_awarded: (submission.points_awarded || 0) + clientPoints,
                status: 'approved',
                final_approval_date: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }).eq('id', selectedId);

            if (subError) throw subError;

            // Distribute points to the designer
            const { data: designerData } = await supabase.from('designer_details')
                .select('total_points, monthly_points')
                .eq('user_id', submission.designer_id)
                .maybeSingle();

            if (designerData) {
                await supabase.from('designer_details').update({
                    total_points: (designerData.total_points || 0) + clientPoints,
                    monthly_points: (designerData.monthly_points || 0) + clientPoints,
                    updated_at: new Date().toISOString()
                }).eq('user_id', submission.designer_id);
            }

            // Log activity
            if (user) {
                await supabase.from('system_logs').insert({
                    action_type: 'client_acceptance',
                    admin_id: user.id,
                    description: `[Client Accept] ${submission.project_name} (+${clientPoints} pts for Designer)`,
                    timestamp: new Date().toISOString()
                });
            }

            toast({ title: 'Success', description: 'Project accepted! The workflow is now officially complete.' });
            setIsAcceptOpen(false);
            loadSubmissions();

        } catch (error: any) {
            toast({ title: 'Failed to accept', description: error.message, variant: 'destructive' });
        } finally {
            setProcessing(false);
        }
    };

    const filteredSubmissions = submissions.filter(sub =>
        !search || (sub.project_name && sub.project_name.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <DashboardLayout>
            <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto min-h-screen">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Preview & Approvals</p>
                        <h1 className="text-3xl font-heading font-bold text-foreground">
                            Projects <span className="text-primary text-gradient">Submitted</span>
                        </h1>
                        <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                            Review deliverables that have passed Prime Haven QA review. Accept them to conclude the project and release final payouts to the designers.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center justify-between">
                    <div className="flex gap-2 p-1 bg-muted/30 rounded-lg">
                        <Button
                            variant={filter === 'pending_review' ? 'default' : 'ghost'}
                            onClick={() => setFilter('pending_review')}
                            className="text-xs h-8"
                        >
                            Pending Your Review
                        </Button>
                        <Button
                            variant={filter === 'accepted' ? 'default' : 'ghost'}
                            onClick={() => setFilter('accepted')}
                            className="text-xs h-8"
                        >
                            Accepted
                        </Button>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search projects..."
                            className="pl-9 h-9 text-xs"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-[250px] w-full rounded-2xl" />)}
                    </div>
                ) : filteredSubmissions.length === 0 ? (
                    <div className="bg-card/30 border border-border/50 rounded-2xl p-12 text-center text-muted-foreground">
                        <CheckCircle className="w-12 h-12 mx-auto mb-4 text-primary/40" />
                        <h3 className="text-lg font-heading font-medium text-foreground mb-2">No projects found.</h3>
                        <p className="text-sm max-w-md mx-auto">
                            {filter === 'pending_review'
                                ? "You have no projects awaiting your final review. They might still be with our QA Team."
                                : "You haven't accepted any projects yet."}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence>
                            {filteredSubmissions.map((sub, idx) => (
                                <motion.div
                                    key={sub.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                                    className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl p-5 hover:border-primary/50 transition-all flex flex-col"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="bg-primary/10 text-primary p-2 rounded-xl">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <Badge className="text-[10px] uppercase tracking-wider bg-emerald-500/20 text-emerald-500 border-none">
                                            {sub.client_accepted ? 'Accepted' : 'Awaiting You'}
                                        </Badge>
                                    </div>

                                    <h3 className="font-heading font-bold text-lg mb-1 truncate capitalize">{sub.project_name?.replace(/-/g, ' ')}</h3>
                                    <p className="text-xs text-muted-foreground mb-4">Service: {sub.service_type}</p>

                                    <div className="space-y-2 mb-6 flex-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Designer</span>
                                            <span className="font-medium">{sub.profiles?.full_name || 'Prime Haven Designer'}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">QA Approved Date</span>
                                            <span className="font-medium">{format(new Date(sub.ph_approved_at || sub.created_at), 'MMM d, yyyy')}</span>
                                        </div>
                                        {sub.client_accepted && (
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">Accepted On</span>
                                                <span className="font-medium text-emerald-500">{format(new Date(sub.client_accepted_at), 'MMM d, yyyy')}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2 mt-auto">
                                        {sub.design_link && (
                                            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => window.open(sub.design_link, '_blank')}>
                                                <ExternalLink className="w-3 h-3 mr-1" /> View Work
                                            </Button>
                                        )}

                                        {!sub.client_accepted && (
                                            <Button size="sm" className="flex-1 text-xs" onClick={() => handleAcceptClick(sub.id)}>
                                                <CheckCircle className="w-3 h-3 mr-1" /> Accept Project
                                            </Button>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            <Dialog open={isAcceptOpen} onOpenChange={setIsAcceptOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Accept Project Deliverable</DialogTitle>
                        <DialogDescription>
                            Are you satisfied with the submitted work? Accepting the project will officially close the workflow and finalize the designer's payout.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button variant="ghost" onClick={() => setIsAcceptOpen(false)}>Cancel</Button>
                        <Button onClick={executeAcceptance} disabled={processing}>
                            {processing ? "Accepting..." : "Yes, Accept Project"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </DashboardLayout>
    );
};

export default ClientProjectsReview;
