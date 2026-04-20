import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, CreditCard, ExternalLink, ArrowRight, Wallet, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { MagneticEffect } from '@/components/ui/MagneticEffect';
import DashboardLayout from '@/components/DashboardLayout';
import ClientActivityStreak from '@/components/dashboard/ClientActivityStreak';
import ClientLiveFeed from '@/components/dashboard/ClientLiveFeed';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ClientOrder {
    id: string;
    service_type: string;
    tier: string;
    price: number;
    project_status: string;
    payment_status: string;
    created_at: string;
}

const ClientDashboard = () => {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<ClientOrder[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [clientProfile, setClientProfile] = useState<any>(null);
    const [stats, setStats] = useState({ totalSpent: 0, activeProjects: 0, completedProjects: 0, pendingPayments: 0 });

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
            return;
        }

        if (user?.email) {
            loadClientData();
        }
    }, [user, authLoading, navigate]);

    const loadClientData = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('client_orders')
                .select('*')
                .eq('client_email', user?.email)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const fetchedOrders = ((data || []) as any) as ClientOrder[];
            setOrders(fetchedOrders);

            // Fetch submissions loosely linked to this client's active orders
            // We'll rely on an RPC or direct access if RLS allows (user instructed SQL generation if needed)
            const { data: submissionsData } = await supabase
                .from('submissions')
                .select('*')
                .order('created_at', { ascending: false });

            // Filter submissions down to those whose project_name matches active orders or client string identifiers
            const fetchedSubmissions = (submissionsData || []).filter(sub =>
                fetchedOrders.some(o => o.id === sub.client_ref || (sub.project_name && o.service_type && sub.project_name.toLowerCase() === o.service_type.toLowerCase()))
            );

            setSubmissions(fetchedSubmissions);

            // Fetch client profile for personalization
            const { data: profileData } = await supabase
                .from('clients')
                .select('*')
                .eq('email', user?.email)
                .maybeSingle();

            if (profileData) setClientProfile(profileData);

            const totalSpent = fetchedOrders.filter(o => o.payment_status === 'paid' || o.payment_status === 'completed').reduce((sum, o) => sum + Number(o.price || 0), 0);
            const activeProjects = fetchedOrders.filter(o => o.project_status && o.project_status !== 'delivered' && o.project_status !== 'cancelled').length;
            const completedProjects = fetchedOrders.filter(o => o.project_status === 'delivered').length;
            const pendingPayments = fetchedOrders.filter(o => o.payment_status === 'pending').length;

            setStats({ totalSpent, activeProjects, completedProjects, pendingPayments });

        } catch (err: any) {
            console.error('Error loading client data:', err);
            toast({ title: 'Error', description: 'Could not load your orders.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        if (!status) return 'bg-muted-foreground';
        if (status.includes('pending')) return 'text-amber-500 border-amber-500/20 bg-amber-500/10';
        if (status.includes('completed') || status.includes('paid') || status.includes('delivered')) return 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10';
        if (status.includes('active') || status.includes('progress')) return 'text-primary border-primary/20 bg-primary/10';
        return 'text-muted-foreground border-border bg-muted/20';
    };

    if (loading || authLoading) {
        return (
            <DashboardLayout>
                <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
                    <Skeleton className="h-10 w-64 mb-6" />
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <Skeleton className="h-[140px] rounded-2xl" />
                        <Skeleton className="h-[140px] rounded-2xl" />
                        <Skeleton className="h-[140px] rounded-2xl" />
                        <Skeleton className="h-[140px] rounded-2xl" />
                    </div>
                    <Skeleton className="h-[400px] rounded-2xl w-full" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                            {clientProfile?.company ? `${clientProfile.company} Portal` : 'Client Portal'}
                        </p>
                        <h1 className="text-2xl sm:text-3xl font-heading font-bold">
                            Welcome Back, {clientProfile?.name?.split(' ')[0] || user?.email?.split('@')[0]} <span className="text-gradient">✦</span>
                        </h1>
                    </div>
                    <MagneticEffect intensity={0.1}>
                        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-xs" onClick={() => navigate('/start-project')}>
                            <CreditCard className="w-4 h-4" /> Start New Project
                        </Button>
                    </MagneticEffect>
                </motion.div>

                {/* Business Overview & Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="lg:col-span-1">
                        <SpotlightCard className="h-full rounded-2xl border border-primary/20 bg-primary/5 p-6 flex flex-col justify-between">
                            <div>
                                <div className="p-2 bg-primary/20 rounded-xl w-fit mb-4">
                                    <Badge variant="outline" className="border-primary/30 text-primary text-[10px] uppercase font-bold tracking-widest">Business Account</Badge>
                                </div>
                                <h2 className="text-xl font-heading font-bold mb-1">{clientProfile?.company || 'Your Project Hub'}</h2>
                                <p className="text-xs text-muted-foreground">{user?.email}</p>
                            </div>
                            <div className="mt-8 pt-4 border-t border-primary/10">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-muted-foreground">Projects Handled</span>
                                    <span className="font-bold text-primary">{stats.completedProjects + stats.activeProjects}</span>
                                </div>
                            </div>
                        </SpotlightCard>
                    </motion.div>

                    <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="h-full">
                            <SpotlightCard className="h-full rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5 hover:border-primary/20 transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                                        <Wallet className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <Badge variant="outline" className="text-[9px] uppercase border-emerald-500/20 text-emerald-500">Paid Out</Badge>
                                </div>
                                <p className="text-2xl sm:text-3xl font-heading font-bold">GH₵{stats.totalSpent.toLocaleString()}</p>
                                <p className="text-[11px] text-muted-foreground mt-1 tracking-wider uppercase opacity-70">Investment in Growth</p>
                            </SpotlightCard>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="h-full">
                            <SpotlightCard className="h-full rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5 hover:border-primary/20 transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="p-2 bg-amber-500/10 rounded-lg">
                                        <Clock className="w-5 h-5 text-amber-500" />
                                    </div>
                                    <Badge variant="outline" className="text-[9px] uppercase border-amber-500/20 text-amber-500">In Progress</Badge>
                                </div>
                                <p className="text-2xl sm:text-3xl font-heading font-bold">{stats.activeProjects}</p>
                                <p className="text-[11px] text-muted-foreground mt-1 tracking-wider uppercase opacity-70">Active Project Flows</p>
                            </SpotlightCard>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="h-full">
                            <SpotlightCard className="h-full rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5 hover:border-primary/20 transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="p-2 bg-blue-500/10 rounded-lg">
                                        <CheckCircle className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <Badge variant="outline" className="text-[9px] uppercase border-blue-500/20 text-blue-500">Success Rate</Badge>
                                </div>
                                <p className="text-2xl sm:text-3xl font-heading font-bold">{stats.completedProjects > 0 ? "100%" : "0%"}</p>
                                <p className="text-[11px] text-muted-foreground mt-1 tracking-wider uppercase opacity-70">Deliverables Handled</p>
                            </SpotlightCard>
                        </motion.div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <div className="lg:col-span-2 space-y-6">
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                            <ClientActivityStreak orders={orders} submissions={submissions} />
                        </motion.div>
                    </div>
                    <div className="lg:col-span-1">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 }} className="h-full">
                            <ClientLiveFeed orders={orders} submissions={submissions} />
                        </motion.div>
                    </div>
                </div>

                {/* Orders Table */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden">
                    <div className="p-5 border-b border-border/50">
                        <h2 className="text-sm font-heading font-bold flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4 text-primary" /> Recent Orders
                        </h2>
                    </div>

                    {orders.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-border/50">
                                        <TableHead className="text-xs font-semibold">Service</TableHead>
                                        <TableHead className="text-xs font-semibold">Tier</TableHead>
                                        <TableHead className="text-xs font-semibold">Status</TableHead>
                                        <TableHead className="text-xs font-semibold">Payment</TableHead>
                                        <TableHead className="text-xs font-semibold">Date ordered</TableHead>
                                        <TableHead className="text-xs font-semibold text-right">Workspace</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orders.map((order) => (
                                        <TableRow key={order.id} className="border-border/30">
                                            <TableCell>
                                                <span className="text-sm font-medium capitalize">{order.service_type?.replace(/-/g, ' ')}</span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs text-muted-foreground capitalize">{order.tier}</span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider ${getStatusColor(order.project_status)}`}>
                                                    {(order.project_status || 'Pending').replace(/_/g, ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider ${getStatusColor(order.payment_status)}`}>
                                                    {order.payment_status || 'Pending'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {format(new Date(order.created_at), 'MMM d, yyyy')}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" className="h-8 text-xs text-primary" onClick={() => navigate(`/workspace/${order.id}`)}>
                                                    Open <ArrowRight className="w-3 h-3 ml-1" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="p-12 text-center">
                            <ShoppingBag className="w-12 h-12 text-muted mx-auto mb-4" />
                            <h3 className="text-lg font-heading font-bold mb-1">No orders yet</h3>
                            <p className="text-sm text-muted-foreground mb-4">Start your first project to see it here.</p>
                            <Button onClick={() => navigate('/start-project')}>Start a Project</Button>
                        </div>
                    )}
                </motion.div>
            </div>
        </DashboardLayout>
    );
};

export default ClientDashboard;
