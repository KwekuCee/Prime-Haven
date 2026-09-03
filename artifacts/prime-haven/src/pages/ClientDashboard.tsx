import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShoppingCart, Search, Download, Wallet, Clock, CheckCircle, CreditCard,
    Pencil, Loader2, Building2, Phone, Mail, Star, UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DashboardLayout from '@/components/DashboardLayout';
import ClientVerifyBanner from '@/components/client/ClientVerifyBanner';
import ClientProjectReview from '@/components/client/ClientProjectReview';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUsdRate } from '@/hooks/useUsdRate';
import { format } from 'date-fns';

interface ClientOrder {
    id: string;
    client_name: string;
    client_email: string;
    client_whatsapp: string | null;
    service_type: string;
    tier: string;
    price: number;
    payment_status: string;
    payment_reference: string | null;
    project_status: string | null;
    assigned_designer_id: string | null;
    deadline_at: string | null;
    created_at: string;
}

interface ClientRecord {
    id: string;
    name: string;
    email: string | null;
    whatsapp: string | null;
    company: string | null;
    notes: string | null;
    is_primary: boolean | null;
    created_at: string;
}

interface ClientProjectRow {
    id: string;
    title: string;
    status: string;
    claimed_by: string | null;
    accepted_designer_id: string | null;
    created_at: string;
}

const statusTone = (s: string | null) => {
    const v = (s || '').toLowerCase();
    if (v === 'completed' || v === 'paid' || v === 'delivered' || v === 'approved') return 'text-emerald-600 border-emerald-500/30 bg-emerald-500/10';
    if (v === 'pending' || v === 'correction' || v === 'revision') return 'text-amber-600 border-amber-500/30 bg-amber-500/10';
    if (v === 'in_progress' || v === 'active' || v === 'claimed') return 'text-primary border-primary/30 bg-primary/10';
    return 'text-muted-foreground border-border bg-muted/20';
};

const ClientDashboard = () => {
    const money = useUsdRate();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<ClientOrder[]>([]);
    const [projects, setProjects] = useState<ClientProjectRow[]>([]);
    const [professionals, setProfessionals] = useState<Record<string, string>>({});
    const [record, setRecord] = useState<ClientRecord | null>(null);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const [editOpen, setEditOpen] = useState(false);
    const [form, setForm] = useState({ name: '', whatsapp: '', company: '', notes: '' });
    const [saving, setSaving] = useState(false);

    const email = user?.email ?? '';

    const load = useCallback(async () => {
        if (!email) return;
        setLoading(true);
        try {
            const [{ data: orderRows }, { data: clientRow }, { data: projectRows }] = await Promise.all([
                supabase.from('client_orders').select('*').eq('client_email', email).order('created_at', { ascending: false }),
                supabase.from('clients').select('*').eq('email', email).maybeSingle(),
                supabase
                    .from('client_projects')
                    .select('id, title, status, claimed_by, accepted_designer_id, created_at')
                    .eq('client_email', email)
                    .order('created_at', { ascending: false }),
            ]);

            const fetchedOrders = ((orderRows || []) as unknown) as ClientOrder[];
            setOrders(fetchedOrders);
            setRecord((clientRow as unknown as ClientRecord) || null);
            const fetchedProjects = ((projectRows || []) as unknown) as ClientProjectRow[];
            setProjects(fetchedProjects);

            const ids = Array.from(new Set([
                ...fetchedOrders.map(o => o.assigned_designer_id),
                ...fetchedProjects.map(p => p.accepted_designer_id || p.claimed_by),
            ].filter(Boolean) as string[]));

            if (ids.length) {
                const names: Record<string, string> = {};
                for (const id of ids) {
                    const { data } = await (supabase as any).rpc('get_designer_public_profile', { p_designer_id: id });
                    const row = Array.isArray(data) ? data[0] : null;
                    if (row) names[id] = (row as any).full_name || (row as any).username || 'Professional';
                }
                setProfessionals(names);
            }
        } catch (err) {
            console.error('Error loading client data:', err);
            toast({ title: 'Error', description: 'Could not load your account information.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [email, toast]);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/client/login');
            return;
        }
        if (email) void load();
    }, [authLoading, user, email, load, navigate]);

    const stats = useMemo(() => {
        const paid = orders.filter(o => o.payment_status === 'paid' || o.payment_status === 'completed');
        return {
            totalSpent: paid.reduce((sum, o) => sum + Number(o.price || 0), 0),
            active: orders.filter(o => o.project_status && !['delivered', 'completed', 'cancelled'].includes(o.project_status)).length,
            completed: orders.filter(o => ['delivered', 'completed'].includes(o.project_status || '')).length,
            pendingPayments: orders.filter(o => o.payment_status === 'pending').length,
        };
    }, [orders]);

    const filtered = useMemo(() => orders.filter(o => {
        const q = search.trim().toLowerCase();
        const matchSearch = !q
            || o.service_type?.toLowerCase().includes(q)
            || o.tier?.toLowerCase().includes(q)
            || (o.payment_reference || '').toLowerCase().includes(q);
        const matchStatus = statusFilter === 'all' || o.payment_status === statusFilter;
        return matchSearch && matchStatus;
    }), [orders, search, statusFilter]);

    const designerFor = (order: ClientOrder) => {
        if (order.assigned_designer_id && professionals[order.assigned_designer_id]) return professionals[order.assigned_designer_id];
        const match = projects.find(p => p.title?.toLowerCase() === order.service_type?.toLowerCase());
        const id = match?.accepted_designer_id || match?.claimed_by;
        return id ? professionals[id] || 'Assigned professional' : null;
    };

    const openEdit = () => {
        setForm({
            name: record?.name || user?.user_metadata?.full_name || '',
            whatsapp: record?.whatsapp || '',
            company: record?.company || '',
            notes: record?.notes || '',
        });
        setEditOpen(true);
    };

    const saveDetails = async () => {
        if (!form.name.trim()) {
            toast({ title: 'Name required', description: 'Please enter the name we should use for you.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            if (record) {
                const { error } = await supabase
                    .from('clients')
                    .update({
                        name: form.name.trim(),
                        whatsapp: form.whatsapp.trim() || null,
                        company: form.company.trim() || null,
                        notes: form.notes.trim() || null,
                    })
                    .eq('id', record.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('clients').insert({
                    name: form.name.trim(),
                    email,
                    whatsapp: form.whatsapp.trim() || null,
                    company: form.company.trim() || null,
                    notes: form.notes.trim() || null,
                });
                if (error) throw error;
            }
            toast({ title: 'Details saved', description: 'Your information is up to date.' });
            setEditOpen(false);
            await load();
        } catch (err: any) {
            toast({ title: 'Could not save', description: err?.message || 'Please try again.', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const exportOrders = () => {
        const rows = filtered.map(o => ({
            Service: o.service_type,
            Tier: o.tier,
            Amount: money.usd(o.price),
            'Payment status': o.payment_status,
            'Project status': o.project_status || '',
            Reference: o.payment_reference || '',
            Professional: designerFor(o) || '',
            Date: format(new Date(o.created_at), 'yyyy-MM-dd HH:mm'),
        }));
        if (!rows.length) return;
        const headers = Object.keys(rows[0]);
        const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify((r as any)[h] ?? '')).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `my-orders-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
    };

    if (loading || authLoading) {
        return (
            <DashboardLayout>
                <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-[180px] rounded-2xl" />
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-[120px] rounded-2xl" />)}
                    </div>
                    <Skeleton className="h-[320px] rounded-2xl" />
                </div>
            </DashboardLayout>
        );
    }

    const statCards = [
        { label: 'Total spent', value: money.usd(stats.totalSpent), sub: money.ghs(stats.totalSpent), icon: Wallet },
        { label: 'Active projects', value: String(stats.active), sub: 'In production', icon: Clock },
        { label: 'Completed', value: String(stats.completed), sub: 'Delivered to you', icon: CheckCircle },
        { label: 'Pending payments', value: String(stats.pendingPayments), sub: 'Awaiting settlement', icon: CreditCard },
    ];

    return (
        <DashboardLayout>
            <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
                <ClientVerifyBanner />

                <div>
                    <h1 className="text-2xl font-heading font-black">Your account</h1>
                    <p className="text-sm text-muted-foreground mt-1">Everything our team sees about your work with Prime Haven.</p>
                </div>

                {/* Client record */}
                <div className="rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-heading font-bold">{record?.name || user?.user_metadata?.full_name || 'Your details'}</h2>
                                {record?.is_primary && (
                                    <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-500/30 bg-amber-500/10">
                                        <Star className="w-3 h-3" /> Primary client
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {record ? `Client since ${format(new Date(record.created_at), 'MMM d, yyyy')}` : 'Complete your details so our team can reach you.'}
                            </p>
                        </div>
                        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs rounded-full" onClick={openEdit}>
                            <Pencil className="w-3.5 h-3.5" /> {record ? 'Edit details' : 'Add details'}
                        </Button>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
                        <div>
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Email</p>
                            <p className="text-sm font-medium flex items-center gap-1.5 mt-1"><Mail className="w-3.5 h-3.5 text-primary" />{email}</p>
                        </div>
                        <div>
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">WhatsApp</p>
                            <p className="text-sm font-medium flex items-center gap-1.5 mt-1"><Phone className="w-3.5 h-3.5 text-primary" />{record?.whatsapp || '—'}</p>
                        </div>
                        <div>
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Company</p>
                            <p className="text-sm font-medium flex items-center gap-1.5 mt-1"><Building2 className="w-3.5 h-3.5 text-primary" />{record?.company || '—'}</p>
                        </div>
                        <div>
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Notes</p>
                            <p className="text-sm font-medium mt-1 line-clamp-2">{record?.notes || '—'}</p>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {statCards.map(card => (
                        <div key={card.label} className="rounded-2xl border border-border/60 bg-card/40 p-5">
                            <div className="flex items-center justify-between">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{card.label}</p>
                                <card.icon className="w-4 h-4 text-primary" />
                            </div>
                            <p className="text-2xl font-heading font-black mt-2">{card.value}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{card.sub}</p>
                        </div>
                    ))}
                </div>

                {/* Orders table */}
                <div className="rounded-2xl border border-border/60 bg-card/40">
                    <div className="p-4 sm:p-5 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-heading font-bold flex items-center gap-2"><ShoppingCart className="w-4 h-4" />Your orders ({orders.length})</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">Every project you have commissioned</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                                <Input placeholder="Search..." className="pl-8 h-8 text-sm w-full sm:w-48 rounded-full" value={search} onChange={e => setSearch(e.target.value)} />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="h-8 text-sm w-32 rounded-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="outline" size="sm" className="h-8 text-xs rounded-full" onClick={exportOrders}>
                                <Download className="w-3.5 h-3.5 mr-1" />Export
                            </Button>
                        </div>
                    </div>

                    {filtered.length > 0 ? (
                        <>
                            <div className="hidden md:block overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="text-xs font-semibold">Service</TableHead>
                                            <TableHead className="text-xs font-semibold">Tier</TableHead>
                                            <TableHead className="text-xs font-semibold">Amount</TableHead>
                                            <TableHead className="text-xs font-semibold">Payment</TableHead>
                                            <TableHead className="text-xs font-semibold">Project</TableHead>
                                            <TableHead className="text-xs font-semibold">Professional</TableHead>
                                            <TableHead className="text-xs font-semibold">Reference</TableHead>
                                            <TableHead className="text-xs font-semibold">Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filtered.map(order => (
                                            <TableRow key={order.id}>
                                                <TableCell><Badge variant="outline" className="text-[10px]">{order.service_type}</Badge></TableCell>
                                                <TableCell className="text-xs">{order.tier}</TableCell>
                                                <TableCell className="text-sm font-bold">
                                                    {money.usd(order.price)}
                                                    <span className="block text-[10px] font-normal text-muted-foreground">{money.ghs(order.price)}</span>
                                                </TableCell>
                                                <TableCell><Badge variant="outline" className={`text-[10px] ${statusTone(order.payment_status)}`}>{order.payment_status}</Badge></TableCell>
                                                <TableCell><Badge variant="outline" className={`text-[10px] ${statusTone(order.project_status)}`}>{(order.project_status || 'unassigned').replace(/_/g, ' ')}</Badge></TableCell>
                                                <TableCell className="text-xs">
                                                    {designerFor(order)
                                                        ? <span className="inline-flex items-center gap-1"><UserCheck className="w-3 h-3 text-primary" />{designerFor(order)}</span>
                                                        : <span className="text-muted-foreground">Unclaimed</span>}
                                                </TableCell>
                                                <TableCell className="text-[11px] text-muted-foreground">{order.payment_reference || '—'}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{format(new Date(order.created_at), 'MMM d, yy')}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="md:hidden divide-y divide-border/30">
                                {filtered.map(order => (
                                    <div key={order.id} className="p-4 space-y-2">
                                        <div className="flex justify-between items-start gap-2">
                                            <div>
                                                <p className="text-sm font-semibold capitalize">{order.service_type?.replace(/-/g, ' ')}</p>
                                                <p className="text-[11px] text-muted-foreground">{order.tier}</p>
                                            </div>
                                            <Badge variant="outline" className={`text-[10px] ${statusTone(order.payment_status)}`}>{order.payment_status}</Badge>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-bold">{money.usd(order.price)}</span>
                                            <Badge variant="outline" className={`text-[10px] ${statusTone(order.project_status)}`}>{(order.project_status || 'unassigned').replace(/_/g, ' ')}</Badge>
                                            <span className="text-[10px] text-muted-foreground ml-auto">{format(new Date(order.created_at), 'MMM d')}</span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">
                                            {designerFor(order) ? `Professional: ${designerFor(order)}` : 'Not claimed yet'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-16 text-muted-foreground">
                            <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="font-medium text-sm">No orders found</p>
                            <Button size="sm" className="mt-4 rounded-full" onClick={() => navigate('/client/start-project')}>Start a project</Button>
                        </div>
                    )}
                </div>

                {/* Reviews / approvals */}
                <div className="space-y-3">
                    <h2 className="text-base font-heading font-bold">Deliveries awaiting you</h2>
                    <ClientProjectReview />
                </div>
            </div>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Your details</DialogTitle>
                        <DialogDescription>Keep your contact information current so your professional can reach you.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <Label className="text-xs">Name</Label>
                            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} maxLength={200} />
                        </div>
                        <div>
                            <Label className="text-xs">Email</Label>
                            <Input value={email} disabled />
                        </div>
                        <div>
                            <Label className="text-xs">WhatsApp</Label>
                            <Input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} maxLength={32} />
                        </div>
                        <div>
                            <Label className="text-xs">Company</Label>
                            <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} maxLength={200} />
                        </div>
                        <div>
                            <Label className="text-xs">Notes</Label>
                            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} maxLength={2000} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                        <Button onClick={saveDetails} disabled={saving}>
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save details'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
};

export default ClientDashboard;
