import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Building, CreditCard, DollarSign, Wallet, ArrowUpRight, ArrowDownRight,
    Activity, ArrowRightLeft, FileText, CheckCircle, Clock, Mail, Search,
    Users, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import SuperAdminLayout from '@/components/admin/SuperAdminLayout';
import { format } from 'date-fns';

const FinanceDashboard = () => {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [initialAuthCheck, setInitialAuthCheck] = useState(true);

    // Real Data States
    const [transactions, setTransactions] = useState<any[]>([]);
    const [designers, setDesigners] = useState<any[]>([]);
    const [clientDebts, setClientDebts] = useState<any[]>([]);
    const [systemClients, setSystemClients] = useState<any[]>([]);
    const [acceptedProjects, setAcceptedProjects] = useState<any[]>([]);
    const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);
    const [approvingWithdrawal, setApprovingWithdrawal] = useState<string | null>(null);

    // Modals & Inputs
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
    const [newDebt, setNewDebt] = useState({ client_name: '', project_name: '', amount_owed: 0 });

    const [stats, setStats] = useState({
        totalRevenue: 0,
        escrow: 0,
        profit: 0,
        pendingPayouts: 0
    });

    const loadFinancialData = useCallback(async () => {
        try {
            setLoading(true);
            const [
                { data: ordersData },
                { data: paymentsData },
                { data: designerDetailsData },
                { data: profilesData },
                { data: settingsData },
                { data: debtsData },
                { data: clientsData },
                { data: submissionsData }
            ] = await Promise.all([
                (supabase.from('client_orders') as any).select('*').order('created_at', { ascending: false }),
                (supabase.from('payments') as any).select('*, profiles(full_name)').order('created_at', { ascending: false }),
                supabase.from('designer_details').select('*'),
                supabase.from('profiles').select('id, full_name, email'),
                supabase.from('system_settings').select('key, value').eq('key', 'monthly_revenue'),
                supabase.from('client_debts').select('*').order('created_at', { ascending: false }),
                supabase.from('clients').select('id, name'),
                supabase.from('submissions').select('id, project_name, client_ref').eq('client_accepted', true)
            ]);

            setSystemClients(clientsData || []);
            setAcceptedProjects(submissionsData || []);

            // System Settings (SuperAdmin dashboard defined revenue config)
            let customMonthlyRevenue = 0;
            if (settingsData && settingsData.length > 0) {
                const revSettings = settingsData[0].value as any;
                customMonthlyRevenue = Number(revSettings.amount) || 0;
            }

            // Revenue from completed payments (exactly mimicking SuperAdminDashboard)
            const completedPayments = (paymentsData || []).filter((p: any) => p.status === 'completed');
            const calculatedRevenue = completedPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

            // Replicate the exact logic from AdminDashboard (use manual revenue if set, else use calculated)
            const totalCombinedRevenue = customMonthlyRevenue || calculatedRevenue;

            // Escrow calculations from Client Debts
            //   pending debts  -> shown as "funds in escrow"
            //   paid debts     -> counted as realised revenue (adds to Prime Haven profit)
            let escrow = 0;
            let paidEscrowRevenue = 0;
            (debtsData || []).forEach((debt: any) => {
                if (debt.status === 'pending') escrow += Number(debt.amount_owed);
                else if (debt.status === 'paid') paidEscrowRevenue += Number(debt.amount_owed);
            });
            setClientDebts(debtsData || []);

            // Users and Salaries
            let pendingPayouts = 0;
            const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

            const mappedDesigners = (designerDetailsData || []).map(detail => {
                const profile = (profilesMap.get(detail.user_id) || {}) as any;
                const activeSalary = (detail.salary_estimated ?? 0) > 0 ? Number(detail.salary_estimated) : (detail.monthly_points || 0) * 10;
                pendingPayouts += activeSalary;
                return {
                    ...detail,
                    full_name: profile.full_name || 'Unknown User',
                    email: profile.email || '',
                    activeSalary
                };
            }).filter(d => d.activeSalary > 0 || (d.total_points ?? 0) > 0);

            // Total revenue = configured/payment revenue + realised escrow (paid debts)
            const grossRevenue = totalCombinedRevenue + paidEscrowRevenue;
            // Profit = Revenue (incl. released escrow) - Pending Payouts
            const platformProfit = grossRevenue - pendingPayouts;

            setStats({
                totalRevenue: grossRevenue,
                escrow: escrow,
                profit: platformProfit,
                pendingPayouts: pendingPayouts
            });
            setDesigners(mappedDesigners);

            const { data: pendingWithdrawalsData, error: pendingWithdrawalsError } = await supabase
                .from('withdrawals')
                .select('id, user_id, amount, currency, status, created_at, payout_method_id')
                .in('status', ['pending', 'processing', 'failed'])
                .order('created_at', { ascending: false });

            if (pendingWithdrawalsError) throw pendingWithdrawalsError;

            const userIds = [...new Set((pendingWithdrawalsData || []).map((w: any) => w.user_id))];
            const payoutMethodIds = [...new Set((pendingWithdrawalsData || []).map((w: any) => w.payout_method_id))];

            const { data: payoutMethodsData } = payoutMethodIds.length
                ? await supabase.from('user_payout_methods').select('id, provider, phone_number, account_name').in('id', payoutMethodIds)
                : { data: [] as any[] };
            const { data: withdrawalProfiles } = userIds.length
                ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
                : { data: [] as any[] };

            const payoutMap = new Map(((payoutMethodsData || []) as any[]).map((pm: any) => [pm.id, pm]));
            const profileMap = new Map(((withdrawalProfiles || []) as any[]).map((p: any) => [p.id, p]));

            setPendingWithdrawals((pendingWithdrawalsData || []).map((w: any) => ({
                ...w,
                client_name: profileMap.get(w.user_id)?.full_name || 'Unknown Designer',
                payout_method: payoutMap.get(w.payout_method_id) || null,
            })));

            // Build Ledger
            const ledger: any[] = [];
            (ordersData || []).forEach((order: any) => {
                ledger.push({
                    id: order.id.substring(0, 8).toUpperCase(),
                    type: 'incoming',
                    category: order.service_type,
                    amount: Number(order.price),
                    user: order.client_name,
                    status: order.payment_status === 'success' ? 'completed' : order.payment_status,
                    date: order.created_at,
                    gateway: order.payment_reference ? 'Korapay' : 'Manual'
                });
            });

            (paymentsData || []).forEach((payment: any) => {
                ledger.push({
                    id: payment.id.substring(0, 8).toUpperCase(),
                    type: 'outgoing',
                    category: payment.type,
                    amount: Number(payment.amount),
                    user: payment.profiles?.full_name || 'Unknown',
                    status: payment.status,
                    date: payment.created_at,
                    gateway: payment.payment_gateway || '-'
                });
            });

            ledger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setTransactions(ledger);

        } catch (error: any) {
            toast({ title: 'Data Load Error', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (authLoading) return;
        const checkAccess = async () => {
            if (!user) { navigate('/superadmin-login', { replace: true }); return; }
            try {
                const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
                if (!roleData || !['superadmin', 'masteradmin'].includes(roleData.role)) {
                    navigate('/dashboard', { replace: true }); return;
                }
                setInitialAuthCheck(false);
                await loadFinancialData();
            } catch { navigate('/superadmin-login', { replace: true }); }
        };
        checkAccess();
    }, [user, authLoading, navigate, loadFinancialData]);

    const handleCreateDebt = async () => {
        if (!newDebt.client_name || !newDebt.amount_owed) return;
        try {
            await supabase.from('client_debts').insert(newDebt);
            toast({ title: 'Debt Recorded', description: 'Escrow amount successfully logged.' });
            setNewDebt({ client_name: '', project_name: '', amount_owed: 0 });
            setIsDebtModalOpen(false);
            await loadFinancialData();
        } catch (error: any) {
            toast({ title: 'Failed to record debt', description: error.message, variant: 'destructive' });
        }
    };

    const handleMarkDebtPaid = async (debtId: string) => {
        try {
            await supabase.from('client_debts').update({ status: 'paid' }).eq('id', debtId);
            toast({ title: 'Debt Paid', description: 'Client owes nothing on this record now.' });
            await loadFinancialData();
        } catch (error: any) {
            toast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
        }
    };

    const handleSendSalaryNotification = async (designer: any) => {
        try {
            await supabase.from('system_logs').insert({
                action_type: 'salary_notification_sent',
                admin_id: user?.id,
                description: `Sent salary paid notification to ${designer.full_name} for GH₵ ${designer.activeSalary}`,
                timestamp: new Date().toISOString()
            });

            await supabase.from('payments').insert({
                user_id: designer.user_id,
                amount: designer.activeSalary,
                type: 'salary',
                status: 'completed',
                payment_gateway: 'Manual Transfer',
                processed_by_admin_id: user?.id
            });

            // Payment confirmed → zero out ALL accumulated points for this designer
            // (their profession's pooled points effectively drop by their contribution).
            await supabase.from('designer_details').update({
                salary_estimated: 0,
                monthly_points: 0,
                total_points: 0
            }).eq('user_id', designer.user_id);

            // In-app notification so the designer sees "You have been paid"
            await supabase.from('notifications').insert({
                user_id: designer.user_id,
                title: 'Salary Paid',
                message: `Your salary of GH₵ ${Number(designer.activeSalary).toLocaleString()} has been sent to your Mobile Money account. Your accumulated points have been reset for the new cycle.`,
                type: 'payment',
                link: '/dashboard'
            });

            toast({ title: 'Notification Sent', description: `Salary email dispatched to ${designer.full_name}` });
            await loadFinancialData();
        } catch (error: any) {
            toast({ title: 'Action Failed', description: error.message, variant: 'destructive' });
        }
    };

    const approveWithdrawal = async (withdrawalId: string, mode: 'korapay' | 'manual' = 'korapay') => {
        if (!user) return;
        setApprovingWithdrawal(withdrawalId);
        try {
            const { data, error } = await supabase.functions.invoke('approve-withdrawal', {
                body: { withdrawal_id: withdrawalId, mode }
            });
            if (error || (data as any)?.error) {
                const message = (data as any)?.message || error?.message || 'Approval failed';
                throw new Error(message);
            }

            // The edge function records the transaction, resets the talent's points
            // and notifies them — no client-side money handling here.
            toast({
                title: mode === 'manual' ? 'Marked Paid Manually' : 'Withdrawal Approved',
                description: (data as any)?.message || 'Talent notified and points reset.'
            });
            await loadFinancialData();
        } catch (err: any) {
            toast({ title: 'Approval Failed', description: err.message, variant: 'destructive' });
        } finally {
            setApprovingWithdrawal(null);
        }
    };

    const exportLedgerCSV = () => {
        if (filteredTransactions.length === 0) {
            toast({ title: 'Nothing to export', description: 'No ledger records match the current filter.' });
            return;
        }
        const header = ['Ref ID', 'Direction', 'User / Entity', 'Method', 'Category', 'Amount (GHS)', 'Status', 'Date'];
        const rows = filteredTransactions.map((t: any) => [
            t.id, t.type, t.user, t.gateway, t.category, Number(t.amount).toFixed(2), t.status,
            format(new Date(t.date), 'yyyy-MM-dd HH:mm'),
        ]);
        const csv = [header, ...rows]
            .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prime-haven-ledger-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: 'Ledger Exported', description: `${filteredTransactions.length} transaction(s) saved to CSV.` });
    };


    const handleExportAndClearPaidEscrow = async () => {
        const paid = clientDebts.filter((d: any) => d.status === 'paid');
        if (paid.length === 0) {
            toast({ title: 'Nothing to export', description: 'No paid escrow records to clear.' });
            return;
        }
        // Build CSV (opens directly in Excel / Google Sheets)
        const header = ['Client Name', 'Project', 'Amount (GHS)', 'Date Recorded', 'Status'];
        const rows = paid.map((d: any) => [
            d.client_name || '',
            d.project_name || '',
            Number(d.amount_owed).toFixed(2),
            format(new Date(d.created_at), 'yyyy-MM-dd HH:mm'),
            d.status,
        ]);
        const csv = [header, ...rows]
            .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `paid-escrow-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        // Delete paid rows after export
        const ids = paid.map((d: any) => d.id);
        const { error } = await supabase.from('client_debts').delete().in('id', ids);
        if (error) {
            toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
            return;
        }
        toast({ title: 'Exported & Cleared', description: `${paid.length} paid escrow record${paid.length === 1 ? '' : 's'} saved to CSV and removed.` });
        await loadFinancialData();
    };

    const filteredTransactions = useMemo(() => {
        if (filter === 'all') return transactions;
        return transactions.filter(t => t.type === filter);
    }, [transactions, filter]);

    const filteredDesigners = useMemo(() => {
        if (!searchQuery) return designers;
        return designers.filter(d => d.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || d.email.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [designers, searchQuery]);

    if (initialAuthCheck || loading) return <SuperAdminLayout><div className="flex items-center justify-center py-32"><div className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" /></div></SuperAdminLayout>;

    return (
        <SuperAdminLayout onRefresh={loadFinancialData} loading={loading}>
            <div className="p-4 sm:p-6 lg:p-8">
                <div className="mb-6">
                    <h1 className="text-xl sm:text-2xl font-heading font-bold text-indigo-500 flex items-center gap-2">
                        <Building className="w-6 h-6" /> Financial Control Center
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Real-time revenue tracking, platform profit tracking, and talent payouts.</p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="rounded-xl border border-border/50 bg-card/80 p-5 hover:border-indigo-500/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Total System Revenue</span>
                            <DollarSign className="w-4 h-4 text-indigo-500" />
                        </div>
                        <div className="text-3xl font-bold tracking-tight">GH₵ {stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div className="mt-2 text-[10px] text-emerald-500 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" />Orders + System Config</div>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-card/80 p-5 hover:border-amber-500/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Funds in Escrow & Debts</span>
                            <Wallet className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="text-3xl font-bold tracking-tight">GH₵ {stats.escrow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div className="mt-2 text-[10px] text-amber-500 flex items-center gap-1">Clients still owing</div>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-card/80 p-5 hover:border-emerald-500/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Prime Haven Profit</span>
                            <Activity className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="text-3xl font-bold tracking-tight">GH₵ {stats.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div className="mt-2 text-[10px] text-emerald-500 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" />Revenue minus payouts</div>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-card/80 p-5 hover:border-red-500/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Pending Talent Payouts</span>
                            <CreditCard className="w-4 h-4 text-red-500" />
                        </div>
                        <div className="text-3xl font-bold tracking-tight">GH₵ {stats.pendingPayouts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div className="mt-2 text-[10px] text-red-500 flex items-center gap-1"><Clock className="w-3 h-3" />Total salaries waiting</div>
                    </div>
                </div>

                {/* Client Debts / Escrow */}
                <div className="rounded-xl border border-border/50 bg-card/50 shadow-sm overflow-hidden mb-8">
                    <div className="p-4 sm:p-5 border-b border-border/50 bg-card/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div><h2 className="text-base font-bold flex items-center gap-2"><Wallet className="w-4 h-4 text-amber-500" /> Amounts Owed (Escrow)</h2></div>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={handleExportAndClearPaidEscrow}>
                                <FileText className="w-4 h-4 mr-1" /> Export & Clear Paid
                            </Button>
                            <Button size="sm" onClick={() => setIsDebtModalOpen(true)} className="bg-amber-600 hover:bg-amber-700">
                                <Plus className="w-4 h-4 mr-1" /> Add Client Debt
                            </Button>
                        </div>
                    </div>
                    <div className="p-0 overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-card/40 border-b border-border/30">
                                    <TableHead>Client Name</TableHead>
                                    <TableHead>Project</TableHead>
                                    <TableHead>Date Recorded</TableHead>
                                    <TableHead>Amount Owed</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {clientDebts.length > 0 ? clientDebts.map((d: any) => (
                                    <TableRow key={d.id} className="border-border/30">
                                        <TableCell className="font-semibold text-sm">{d.client_name}</TableCell>
                                        <TableCell className="text-muted-foreground text-xs">{d.project_name || '-'}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{format(new Date(d.created_at), 'MMM d, yy')}</TableCell>
                                        <TableCell>
                                            <span className={`font-bold ${d.status === 'pending' ? 'text-amber-500' : 'text-emerald-500 line-through'}`}>
                                                GH₵ {Number(d.amount_owed).toLocaleString()}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {d.status === 'pending' ? (
                                                <Button size="sm" variant="outline" className="border-emerald-500 text-emerald-500 h-8" onClick={() => handleMarkDebtPaid(d.id)}>
                                                    <CheckCircle className="w-3 h-3 mr-1" /> Mark Paid
                                                </Button>
                                            ) : (
                                                <Badge variant="outline" className="border-emerald-500 text-emerald-500 bg-emerald-500/10">Settled</Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No escrow debts recorded.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Talent Salaries */}
                <div className="rounded-xl border border-border/50 bg-card/50 shadow-sm overflow-hidden mb-8">
                    <div className="p-4 sm:p-5 border-b border-border/50 bg-card/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div><h2 className="text-base font-bold flex items-center gap-2"><Users className="w-4 h-4 text-indigo-500" /> Talent Salary Management</h2></div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                                <Input placeholder="Search talent..." className="pl-8 h-8 text-sm w-full sm:w-48 bg-card/50" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                            </div>
                        </div>
                    </div>
                    <div className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-card/40 border-b border-border/30">
                                        <TableHead>User</TableHead>
                                        <TableHead>Role Title</TableHead>
                                        <TableHead>Total PH Points</TableHead>
                                        <TableHead>Expected Salary</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredDesigners.length > 0 ? filteredDesigners.map((d: any) => (
                                        <TableRow key={d.id} className="border-border/30">
                                            <TableCell>
                                                <p className="font-semibold text-sm">{d.full_name}</p>
                                                <p className="text-[10px] text-muted-foreground">{d.email}</p>
                                            </TableCell>
                                            <TableCell className="text-xs">{d.professional_title || 'Platform Talent'}</TableCell>
                                            <TableCell className="font-bold text-cyan-500">{d.total_points}</TableCell>
                                            <TableCell className="font-bold text-emerald-500">GH₵ {d.activeSalary.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleSendSalaryNotification(d)}
                                                    className="h-8 bg-indigo-600 hover:bg-indigo-700"
                                                    disabled={d.activeSalary <= 0}
                                                >
                                                    <Mail className="w-3 h-3 mr-2" /> Notify Payment
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No pending salaries found.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>

                {/* Pending Withdrawal Requests */}
                <div className="rounded-xl border border-border/50 bg-card/50 shadow-sm overflow-hidden mb-8">
                    <div className="p-4 sm:p-5 border-b border-border/50 bg-card/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div><h2 className="text-base font-bold flex items-center gap-2"><Wallet className="w-4 h-4 text-emerald-500" /> Pending Withdrawal Requests</h2></div>
                        <div className="text-xs text-muted-foreground">Live requests waiting superadmin approval.</div>
                    </div>
                    <div className="p-0 overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-card/40 border-b border-border/30">
                                    <TableHead>Request</TableHead>
                                    <TableHead>Designer</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Method</TableHead>
                                    <TableHead>Requested At</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingWithdrawals.length > 0 ? pendingWithdrawals.map((w: any) => (
                                    <TableRow key={w.id} className="border-border/30">
                                        <TableCell className="font-mono text-[10px] text-muted-foreground">{w.id.slice(0, 8).toUpperCase()}</TableCell>
                                        <TableCell className="font-medium text-sm">{w.client_name}</TableCell>
                                        <TableCell className="font-bold whitespace-nowrap">GH₵ {Number(w.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {w.payout_method ? `${w.payout_method.provider.toUpperCase()} • ${w.payout_method.phone_number}` : 'Method missing'}
                                        </TableCell>
                                        <TableCell className="text-[10px] text-muted-foreground whitespace-nowrap">{format(new Date(w.created_at), 'MMM d, yy HH:mm')}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="uppercase text-[10px] tracking-[.2em]">{w.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" variant="outline" disabled={approvingWithdrawal === w.id} onClick={() => approveWithdrawal(w.id)}>
                                                {approvingWithdrawal === w.id ? 'Approving...' : 'Approve via Korapay'}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No pending withdrawals found.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Ledger */}
                <div className="rounded-xl border border-border/50 bg-card/50 shadow-sm overflow-hidden mb-8">
                    <div className="p-4 sm:p-5 border-b border-border/50 bg-card/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div><h2 className="text-base font-bold flex items-center gap-2"><ArrowRightLeft className="w-4 h-4 text-indigo-500" /> Ledger & Transactions</h2></div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Select value={filter} onValueChange={setFilter}>
                                <SelectTrigger className="h-8 text-sm w-full sm:w-40 bg-card/50"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Transactions</SelectItem>
                                    <SelectItem value="incoming">Incoming Funds</SelectItem>
                                    <SelectItem value="outgoing">Outgoing Payouts</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button size="sm" variant="outline" className="h-8"><FileText className="w-3 h-3 mr-1" /> Export CSV</Button>
                        </div>
                    </div>
                    <div className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-card/40 border-b border-border/30">
                                        <TableHead>Ref ID</TableHead>
                                        <TableHead>Direction</TableHead>
                                        <TableHead>User / Entity</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredTransactions.length > 0 ? filteredTransactions.map((t: any, i: number) => (
                                        <TableRow key={`${t.id}-${i}`} className="border-border/30">
                                            <TableCell className="font-mono text-[10px] text-muted-foreground">{t.id}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${t.type === 'incoming' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                    'bg-red-500/10 text-red-500 border-red-500/20'
                                                    }`}>
                                                    {t.type === 'incoming' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                                                    {t.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium text-xs max-w-[150px] truncate" title={t.user}>{t.user}</TableCell>
                                            <TableCell className="text-[10px] text-muted-foreground">{t.gateway}</TableCell>
                                            <TableCell className="text-[10px] uppercase text-muted-foreground">{t.category?.replace('_', ' ')}</TableCell>
                                            <TableCell className="font-bold whitespace-nowrap">GH₵ {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`text-[9px] uppercase tracking-wider ${t.status === 'completed' || t.status === 'success' ? 'border-emerald-500 text-emerald-500' : 'border-amber-500 text-amber-500'
                                                    }`}>
                                                    {t.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-[10px] text-muted-foreground whitespace-nowrap">{format(new Date(t.date), 'MMM d, yy HH:mm')}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">No ledger records found.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>

            </div>

            {/* Modals */}
            <Dialog open={isDebtModalOpen} onOpenChange={setIsDebtModalOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add Escrow Debt</DialogTitle><DialogDescription>Record a client order that hasn't been fully paid to escrow yet.</DialogDescription></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Client Name</Label>
                            <Select value={newDebt.client_name} onValueChange={v => setNewDebt({ ...newDebt, client_name: v })}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select a client..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {systemClients.map((c: any) => (
                                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Project</Label>
                            <Select value={newDebt.project_name} onValueChange={v => setNewDebt({ ...newDebt, project_name: v })}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select a project..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {!newDebt.client_name ? (
                                        <SelectItem value="none" disabled>Select a client first</SelectItem>
                                    ) : acceptedProjects.filter(p => p.client_ref === newDebt.client_name).length === 0 ? (
                                        <SelectItem value="none" disabled>No accepted projects found</SelectItem>
                                    ) : (
                                        acceptedProjects.filter(p => p.client_ref === newDebt.client_name).map((p: any) => (
                                            <SelectItem key={p.id} value={p.project_name}>{p.project_name}</SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Amount Owed</Label>
                            <Input type="number" className="col-span-3" value={newDebt.amount_owed} onChange={e => setNewDebt({ ...newDebt, amount_owed: Number(e.target.value) })} />
                        </div>
                    </div>
                    <DialogFooter><Button onClick={handleCreateDebt} className="bg-amber-600 hover:bg-amber-700">Record Escrow</Button></DialogFooter>
                </DialogContent>
            </Dialog>

        </SuperAdminLayout>
    );
};

export default FinanceDashboard;
