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

    // Revision Dialog state
    const [isRevisionOpen, setIsRevisionOpen] = useState(false);
    const [revisionFeedback, setRevisionFeedback] = useState('');
    const [processingRevision, setProcessingRevision] = useState(false);

    useEffect(() => {
        if (!authLoading && user?.email) {
            loadSubmissions();
        }
    }, [user, authLoading, filter]);

    const loadSubmissions = async () => {
        try {
            setLoading(true);

            // Everything the client owns: paid projects and legacy orders.
            const [{ data: projectsData }, { data: ordersData }] = await Promise.all([
                supabase.from('client_projects').select('id, title').eq('client_email', user?.email ?? ''),
                supabase.from('client_orders').select('id, service_type').eq('client_email', user?.email ?? ''),
            ]);

            const projectIds = (projectsData || []).map(p => p.id);
            const orderIds = (ordersData || []).map(o => o.id);
            const refs = Array.from(new Set([...projectIds, ...orderIds]));

            if (refs.length === 0) {
                setSubmissions([]);
                setLoading(false);
                return;
            }

            // Submissions attached to those projects. Prime Haven no longer
            // pre-approves work — the client's decision is the only gate.
            const { data: subData, error } = await supabase
                .from('submissions')
                .select('*')
                .or(`client_project_id.in.(${projectIds.length ? projectIds.join(',') : '00000000-0000-0000-0000-000000000000'}),client_ref.in.(${refs.join(',')})`)
                .order('created_at', { ascending: false });

            if (error) {
                console.warn('Submissions fetch error:', error);
                toast({ title: "Error", description: error.message || "Failed to load submissions.", variant: 'destructive' });
                setLoading(false);
                return;
            }

            const clientSubs = (subData || []).filter(s =>
                filter === 'pending_review' ? !s.client_accepted : !!s.client_accepted
            );

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
            // Server-side: verifies ownership, awards points and the 70% earning,
            // completes the project and notifies the professional.
            const { data, error } = await (supabase.rpc as any)('approve_project_submission', {
                p_submission_id: selectedId,
            });
            if (error) throw error;
            if (data && data.success === false) throw new Error(data.error || data.message || 'Approval failed');

            toast({ title: 'Approved', description: 'The work is approved and the project is now marked complete.' });
            setIsAcceptOpen(false);
            loadSubmissions();
        } catch (error: any) {
            toast({ title: 'Failed to approve', description: error.message, variant: 'destructive' });
        } finally {
            setProcessing(false);
        }
    };

    const handleRevisionClick = (id: string) => {
        setSelectedId(id);
        setRevisionFeedback('');
        setIsRevisionOpen(true);
    };

    const executeRevision = async () => {
        if (!selectedId || !revisionFeedback.trim()) return;
        setProcessingRevision(true);
        try {
            const { data, error } = await (supabase.rpc as any)('request_project_revision', {
                p_submission_id: selectedId,
                p_feedback: revisionFeedback.trim(),
            });
            if (error) throw error;
            if (data && data.success === false) throw new Error(data.error || data.message || 'Could not send feedback');

            toast({ title: 'Marked for correction', description: 'Your feedback has been sent to the professional.' });
            setIsRevisionOpen(false);
            loadSubmissions();
        } catch (error: any) {
            toast({ title: 'Failed to request correction', description: error.message, variant: 'destructive' });
        } finally {
            setProcessingRevision(false);
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
                                            <div className="flex gap-2 flex-1">
                                                <Button variant="destructive" size="sm" className="flex-1 text-xs" onClick={() => handleRevisionClick(sub.id)}>
                                                    <XCircle className="w-3 h-3 mr-1" /> Revision
                                                </Button>
                                                <Button size="sm" className="flex-1 text-xs" onClick={() => handleAcceptClick(sub.id)}>
                                                    <CheckCircle className="w-3 h-3 mr-1" /> Accept
                                                </Button>
                                            </div>
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

            <Dialog open={isRevisionOpen} onOpenChange={setIsRevisionOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Request a Revision</DialogTitle>
                        <DialogDescription>
                            Please describe exactly what needs to be changed. The designer will receive this feedback and resume work.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4">
                        <textarea
                            className="w-full min-h-[120px] p-3 text-sm rounded-md border border-border/50 bg-background focus:ring-1 focus:ring-primary outline-none"
                            placeholder="E.g. The logo font needs to be slightly bolder, and the blue color is too dark..."
                            value={revisionFeedback}
                            onChange={(e) => setRevisionFeedback(e.target.value)}
                        />
                    </div>
                    <DialogFooter className="mt-4">
                        <Button variant="ghost" onClick={() => setIsRevisionOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={executeRevision} disabled={processingRevision || !revisionFeedback.trim()}>
                            {processingRevision ? "Sending..." : "Submit Revision Request"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </DashboardLayout>
    );
};

export default ClientProjectsReview;
