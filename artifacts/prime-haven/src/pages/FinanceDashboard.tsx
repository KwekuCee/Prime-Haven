import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Building, CreditCard, DollarSign, Wallet, ArrowUpRight, ArrowDownRight,
    Activity, ArrowRightLeft, FileText, CheckCircle, Clock, Mail, Search,
    Users, Plus, Calendar, TrendingUp, Sparkles, Layers, Palette, Layout,
    Globe, Smartphone, Clapperboard, Film, Megaphone, Cpu, Banknote,
    Phone, Send, Copy, ExternalLink, Loader2, SmartphoneNfc, RefreshCw
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
import { loadPlatformRevenue, CANONICAL_SERVICES } from '@/lib/platformRevenue';

const getDepartmentIcon = (slug: string) => {
    switch (slug) {
        case 'graphic-design': return Palette;
        case 'ui-ux-design': return Layout;
        case 'web-development': return Globe;
        case 'motion-graphics': return Clapperboard;
        case 'video-editing': return Film;
        case 'social-media-management': return Megaphone;
        case 'general-it-solutions': return Cpu;
        default: return Layers;
    }
};

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
    const [showArchived, setShowArchived] = useState(false);
    const [clearingLedger, setClearingLedger] = useState(false);
    const [isClearLedgerOpen, setIsClearLedgerOpen] = useState(false);
    const [removeTarget, setRemoveTarget] = useState<any>(null);
    const [removeCheck, setRemoveCheck] = useState<any>(null);
    const [removing, setRemoving] = useState(false);
    const [stuckOpen, setStuckOpen] = useState(false);

    // Modals & Inputs
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
    const [newDebt, setNewDebt] = useState({
        client_id: '',
        client_name: '',
        project_name: '',
        amount_owed: 0,
        client_phone: '',
        network_provider: 'mtn',
    });

    const [momoModal, setMomoModal] = useState<{
        open: boolean;
        debt: any | null;
        phone: string;
        operator: string;
        loading: boolean;
        checkoutUrl: string | null;
    }>({
        open: false,
        debt: null,
        phone: '',
        operator: 'mtn',
        loading: false,
        checkoutUrl: null,
    });

    const [categoryRevenue, setCategoryRevenue] = useState<{
        graphic: number;
        uiux: number;
        web: number;
        total: number;
        byService?: Record<string, any>;
        services?: any[];
    }>({ graphic: 0, uiux: 0, web: 0, total: 0 });

    const [financeMetrics, setFinanceMetrics] = useState({
        allTimeGross: 0,
        allTimeSalariesPaid: 0,
        allTimePendingSalaries: 0,
        allTimeTalentShare: 0,
        allTimePlatformProfit: 0,
        monthGross: 0,
        monthPendingSalaries: 0,
        monthSalariesPaid: 0,
        monthPlatformProfit: 0,
    });

    const [stats, setStats] = useState({
        totalRevenue: 0,
        escrow: 0,
        profit: 0,
        pendingPayouts: 0,
        collected: 0,
        talentShare: 0,
        platformShare: 0
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
                (showArchived
                    ? (supabase.from('payments') as any).select('*, profiles(full_name)')
                    : (supabase.from('payments') as any).select('*, profiles(full_name)').is('archived_at', null)
                ).order('created_at', { ascending: false }),

                supabase.from('designer_details').select('*'),
                supabase.from('profiles').select('id, full_name, email'),
                supabase.from('system_settings').select('key, value').eq('key', 'monthly_revenue'),
                supabase.from('client_debts').select('*').order('created_at', { ascending: false }),
                supabase.from('clients').select('id, name, whatsapp, email'),
                supabase.from('submissions').select('id, project_name, client_ref').eq('client_accepted', true)
            ]);

            setSystemClients(clientsData || []);
            setAcceptedProjects(submissionsData || []);

            // Shared revenue calculation — identical to the SuperAdmin dashboard.
            const revenue = await loadPlatformRevenue().catch(() => null);
            const clientRevenueGhs = revenue?.clientRevenueGhs || 0;
            const escrow = revenue?.escrow || 0;
            if (revenue) {
                setFinanceMetrics({
                    allTimeGross: revenue.allTimeGross,
                    allTimeSalariesPaid: revenue.allTimeSalariesPaid,
                    allTimePendingSalaries: revenue.allTimePendingSalaries,
                    allTimeTalentShare: revenue.allTimeTalentShare,
                    allTimePlatformProfit: revenue.allTimePlatformProfit,
                    monthGross: revenue.monthGross,
                    monthPendingSalaries: revenue.monthPendingSalaries,
                    monthSalariesPaid: revenue.monthSalariesPaid,
                    monthPlatformProfit: revenue.monthPlatformProfit,
                });
                if (revenue.categoryRevenue) {
                    setCategoryRevenue(revenue.categoryRevenue);
                }
            }

            // Completed ledger payments (used for the 70/30 client split below).
            const completedPayments = (paymentsData || []).filter((p: any) => p.status === 'completed');

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
            const grossRevenue = revenue?.grossRevenue || 0;
            // Profit = Revenue (incl. released escrow) - Pending Payouts
            const platformProfit = grossRevenue - pendingPayouts;

            // Client payments collected through Korapay / Paystack, split 70/30.
            const clientPayments = completedPayments.filter((p: any) => String(p.type) === 'client_order');
            const ledgerCollected = clientPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
            const ledgerTalentShare = clientPayments.reduce((sum: number, p: any) => {
                const details = (p.payment_details || {}) as any;
                const share = Number(details.talent_share);
                if (Number.isFinite(share) && share > 0) return sum + share;
                const percent = Number(details.share_percent) || 70;
                return sum + (Number(p.amount || 0) * percent) / 100;
            }, 0);
            // Fall back to the orders/projects tables when no ledger rows exist yet.
            const collected = Math.max(ledgerCollected, clientRevenueGhs);
            const talentShare = ledgerCollected >= clientRevenueGhs && ledgerCollected > 0
                ? ledgerTalentShare
                : (collected * 70) / 100;
            const platformShare = Math.max(0, collected - talentShare);

            setStats({
                totalRevenue: grossRevenue,
                escrow: escrow,
                profit: platformProfit,
                pendingPayouts: pendingPayouts,
                collected,
                talentShare: Math.round(talentShare * 100) / 100,
                platformShare: Math.round(platformShare * 100) / 100
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
    }, [toast, showArchived]);

    useEffect(() => {
        if (authLoading) return;
        const checkAccess = async () => {
            if (!user) { navigate('/superadmin-login', { replace: true }); return; }
            try {
                const { data: roleRows } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
                const roles = (roleRows || []).map((r: any) => String(r.role || '').trim().toLowerCase());
                if (!roles.some((r) => ['superadmin', 'masteradmin'].includes(r))) {
                    navigate('/dashboard', { replace: true });
                    return;
                }
                setInitialAuthCheck(false);
                await loadFinancialData();
            } catch (err) {
                console.error('Error during finance access verification:', err);
                setInitialAuthCheck(false);
            } finally {
                setInitialAuthCheck(false);
            }
        };
        checkAccess();
    }, [user, authLoading, navigate, loadFinancialData]);

    const handleCreateDebt = async () => {
        if (!newDebt.client_name || !newDebt.amount_owed) return;
        try {
            await (supabase.from('client_debts') as any).insert({
                client_id: newDebt.client_id || null,
                client_name: newDebt.client_name,
                project_name: newDebt.project_name || null,
                amount_owed: Number(newDebt.amount_owed),
                client_phone: newDebt.client_phone || null,
                network_provider: newDebt.network_provider || 'mtn',
                status: 'pending',
            });
            toast({ title: 'Debt Recorded', description: 'Escrow debt successfully logged with MoMo details.' });
            setNewDebt({ client_id: '', client_name: '', project_name: '', amount_owed: 0, client_phone: '', network_provider: 'mtn' });
            setIsDebtModalOpen(false);
            await loadFinancialData();
        } catch (error: any) {
            toast({ title: 'Failed to record debt', description: error.message, variant: 'destructive' });
        }
    };

    const handleOpenMoMoModal = (debt: any) => {
        let defaultPhone = debt.client_phone || '';
        if (!defaultPhone && debt.client_id) {
            const client = systemClients.find((c: any) => c.id === debt.client_id);
            if (client?.whatsapp) defaultPhone = client.whatsapp;
        } else if (!defaultPhone) {
            const client = systemClients.find((c: any) => c.name === debt.client_name);
            if (client?.whatsapp) defaultPhone = client.whatsapp;
        }

        setMomoModal({
            open: true,
            debt,
            phone: defaultPhone,
            operator: debt.network_provider || 'mtn',
            loading: false,
            checkoutUrl: null,
        });
    };

    const handleTriggerMoMoPayment = async (channel: 'ussd_push' | 'checkout_link') => {
        if (!momoModal.debt) return;
        setMomoModal(prev => ({ ...prev, loading: true }));
        try {
            const { data, error } = await supabase.functions.invoke('collect-debt-payment', {
                body: {
                    debt_id: momoModal.debt.id,
                    phone_number: momoModal.phone,
                    operator: momoModal.operator,
                    channel,
                }
            });

            if (error || (data as any)?.error) {
                const message = (data as any)?.message || error?.message || 'Debt collection failed';
                throw new Error(message);
            }

            if (channel === 'ussd_push') {
                toast({
                    title: 'MoMo Prompt Sent!',
                    description: "USSD prompt pushed to client's phone. Awaiting MoMo PIN authorization."
                });
                setMomoModal(prev => ({ ...prev, open: false, loading: false }));
            } else {
                const checkoutUrl = (data as any)?.checkout_url;
                if (checkoutUrl) {
                    await navigator.clipboard.writeText(checkoutUrl).catch(() => {});
                    setMomoModal(prev => ({ ...prev, checkoutUrl, loading: false }));
                    toast({
                        title: 'Checkout Link Ready',
                        description: 'Payment link copied to clipboard! You can share it directly with the client.'
                    });
                } else {
                    setMomoModal(prev => ({ ...prev, open: false, loading: false }));
                }
            }
            await loadFinancialData();
        } catch (err: any) {
            toast({
                title: 'Request Failed',
                description: err.message,
                variant: 'destructive'
            });
            setMomoModal(prev => ({ ...prev, loading: false }));
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
                total_points: 0,
                salary_payment_status: 'paid',
                salary_paid_at: new Date().toISOString(),
                salary_paid_by: user?.id
            }).eq('user_id', designer.user_id);

            // If the talent had an open withdrawal request, paying them manually settles it.
            await supabase.from('withdrawals')
                .update({ status: 'approved', processed_at: new Date().toISOString() })
                .eq('user_id', designer.user_id)
                .in('status', ['pending', 'processing', 'failed']);


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

    const stuckWithdrawals = pendingWithdrawals.filter((w: any) => w.status === 'failed' || (w.status === 'processing' && Date.now() - new Date(w.created_at).getTime() > 10 * 60 * 1000) || (w.status === 'pending' && Date.now() - new Date(w.created_at).getTime() > 10 * 60 * 1000));

    const approveWithdrawal = async (withdrawalId: string, mode: 'korapay' | 'manual' = 'korapay') => {
        if (!user || approvingWithdrawal) return;
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

    const openRemoveRequest = async (withdrawal: any) => {
        setRemoveTarget(withdrawal);
        setRemoveCheck(null);
        try {
            const { data, error } = await (supabase as any).rpc('check_withdrawal_already_paid', { p_withdrawal_id: withdrawal.id });
            if (error) throw error;
            setRemoveCheck(data);
        } catch (err: any) {
            setRemoveCheck({ found: false, message: `Could not check payout history: ${err.message}` });
        }
    };

    const confirmRemoveRequest = async () => {
        if (!removeTarget) return;
        setRemoving(true);
        try {
            const { error } = await (supabase as any).rpc('admin_remove_withdrawal_request', {
                p_withdrawal_id: removeTarget.id,
                p_reason: 'Your pending withdrawal request was removed because the payment was settled outside the platform.',
            });
            if (error) throw error;
            toast({ title: 'Request Removed', description: `${removeTarget.client_name}'s request was removed and they have been notified.` });
            setRemoveTarget(null);
            setRemoveCheck(null);
            await loadFinancialData();
        } catch (err: any) {
            toast({ title: 'Could not remove request', description: err.message, variant: 'destructive' });
        } finally {
            setRemoving(false);
        }
    };

    const clearLedger = async (restore = false) => {
        setClearingLedger(true);
        try {
            const { data, error } = await (supabase as any).rpc('admin_archive_ledger', { p_restore: restore });
            if (error) throw error;
            toast({
                title: restore ? 'Ledger Restored' : 'Ledger Cleared',
                description: `${data ?? 0} record(s) ${restore ? 'restored' : 'archived'}. Nothing was deleted.`,
            });
            setIsClearLedgerOpen(false);
            await loadFinancialData();
        } catch (err: any) {
            toast({ title: 'Action Failed', description: err.message, variant: 'destructive' });
        } finally {
            setClearingLedger(false);
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

                {/* Section 1: All-Time Financial Overview */}
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-indigo-400" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">All-Time Financial Overview</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Card 1: Total Platform Revenue */}
                        <div className="rounded-xl border border-border/50 bg-card/80 p-5 hover:border-indigo-500/50 transition-all">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Total Platform Revenue</span>
                                <DollarSign className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div className="text-2xl sm:text-3xl font-bold tracking-tight">
                                GH₵ {financeMetrics.allTimeGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
                                <ArrowUpRight className="w-3 h-3 text-emerald-400" /> All client orders, projects & fees
                            </div>
                        </div>

                        {/* Card 2: Total Salaries Paid */}
                        <div className="rounded-xl border border-border/50 bg-card/80 p-5 hover:border-sky-500/50 transition-all">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Total Salaries Paid</span>
                                <Wallet className="w-4 h-4 text-sky-400" />
                            </div>
                            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-sky-400">
                                GH₵ {financeMetrics.allTimeSalariesPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
                                Disbursed talent withdrawals & payouts
                            </div>
                        </div>

                        {/* Card 3: Total Talent Accrued (70%) */}
                        <div className="rounded-xl border border-border/50 bg-card/80 p-5 hover:border-purple-500/50 transition-all">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Total Talent Accrued (70%)</span>
                                <Users className="w-4 h-4 text-purple-400" />
                            </div>
                            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-purple-400">
                                GH₵ {financeMetrics.allTimeTalentShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
                                Cumulative 70% share across approved jobs
                            </div>
                        </div>

                        {/* Card 4: Total Prime Haven Profit (30%) */}
                        <div className="rounded-xl border border-border/50 bg-card/80 p-5 hover:border-emerald-500/50 transition-all">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Total Prime Haven Profit (30%)</span>
                                <Activity className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-400">
                                GH₵ {financeMetrics.allTimePlatformProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
                                All-time 30% platform margin + fees
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 2: This Month's Financials */}
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-amber-400" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">This Month's Financials</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Card 1: This Month's Gross Revenue */}
                        <div className="rounded-xl border border-border/50 bg-card/80 p-5 hover:border-indigo-500/50 transition-all">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">This Month's Revenue</span>
                                <DollarSign className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div className="text-2xl sm:text-3xl font-bold tracking-tight">
                                GH₵ {financeMetrics.monthGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
                                Current calendar month gross intake
                            </div>
                        </div>

                        {/* Card 2: Pending Salaries to be Paid */}
                        <div className="rounded-xl border border-border/50 bg-card/80 p-5 hover:border-amber-500/50 transition-all">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Pending Salaries to be Paid</span>
                                <Clock className="w-4 h-4 text-amber-400" />
                            </div>
                            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-400">
                                GH₵ {financeMetrics.monthPendingSalaries.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
                                Current outstanding 70% share awaiting payout
                            </div>
                        </div>

                        {/* Card 3: Salaries Disbursed This Month */}
                        <div className="rounded-xl border border-border/50 bg-card/80 p-5 hover:border-sky-500/50 transition-all">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Salaries Disbursed This Month</span>
                                <CreditCard className="w-4 h-4 text-sky-400" />
                            </div>
                            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-sky-400">
                                GH₵ {financeMetrics.monthSalariesPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
                                Payouts completed this month
                            </div>
                        </div>

                        {/* Card 4: Prime Haven Profit This Month */}
                        <div className="rounded-xl border border-border/50 bg-card/80 p-5 hover:border-emerald-500/50 transition-all">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Prime Haven Profit This Month</span>
                                <Sparkles className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-400">
                                GH₵ {financeMetrics.monthPlatformProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
                                Realized 30% platform margin this month
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 3: Department Breakdown Grid */}
                <div className="rounded-xl border border-border/50 bg-card/60 p-5 shadow-xs mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div>
                            <h2 className="text-base font-bold flex items-center gap-2">
                                <Layers className="w-4 h-4 text-indigo-400" /> Department Revenue Breakdown
                            </h2>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Organic revenue pools derived from active contracts and client projects across all 8 tracks.
                            </p>
                        </div>
                        <Badge variant="outline" className="text-xs font-mono font-bold text-indigo-400 border-indigo-500/30 bg-indigo-500/10 self-start sm:self-auto">
                            Total Department Volume: GH₵ {categoryRevenue.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {(() => {
                            const activeServices = (categoryRevenue.services || []).filter(
                                (s: any) => s.slug !== 'mobile-app-development' && Number(s.total || 0) > 0
                            );
                            if (activeServices.length === 0) {
                                return (
                                    <div className="col-span-full py-8 text-center text-xs text-muted-foreground bg-card/20 rounded-xl border border-dashed border-border/50">
                                        No active department revenue recorded yet.
                                        Revenues, department pools, and talent payouts derive organically from live contracts and client orders.
                                    </div>
                                );
                            }
                            return activeServices.map((s: any) => {
                                const IconComponent = getDepartmentIcon(s.slug);
                                const totalVal = Number(s.total || 0);
                                const talent70 = Number(s.talentPool70 ?? (totalVal * 0.7));
                                const ph30 = Number(s.platformShare30 ?? (totalVal * 0.3));
                                return (
                                    <div key={s.slug} className="rounded-lg border border-border/40 bg-card/40 p-4 flex flex-col justify-between hover:border-indigo-500/40 transition-colors">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-md bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                                                        <IconComponent className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-xs font-semibold text-foreground tracking-tight block truncate" title={s.label}>
                                                        {s.label}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-xl font-bold font-mono text-indigo-400 mt-1">
                                                GH₵ {totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>

                                        <div className="mt-3 pt-2.5 border-t border-border/30 text-[11px] flex flex-col gap-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground text-[10px]">Contracts:</span>
                                                <span className="font-mono text-foreground font-medium text-[10px]">GH₵{Number(s.contractBudget || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground text-[10px]">Orders:</span>
                                                <span className="font-mono text-foreground font-medium text-[10px]">GH₵{Number(s.clientOrders || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-1 pt-1 border-t border-border/20">
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                                                    70% Talent: GH₵{talent70.toFixed(0)}
                                                </Badge>
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-indigo-500/30 text-indigo-400 bg-indigo-500/10">
                                                    30% PH: GH₵{ph30.toFixed(0)}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
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
                                        <TableCell className="font-semibold text-sm">
                                            <div>{d.client_name}</div>
                                            {d.client_phone && (
                                                <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 font-normal">
                                                    <Phone className="w-3 h-3 text-muted-foreground/70" />
                                                    <span>{d.client_phone}</span>
                                                    <span className="uppercase text-[10px] bg-muted/60 px-1 py-0.2 rounded text-muted-foreground font-mono">
                                                        {d.network_provider || 'mtn'}
                                                    </span>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs">{d.project_name || '-'}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{format(new Date(d.created_at), 'MMM d, yy')}</TableCell>
                                        <TableCell>
                                            <span className={`font-bold ${d.status === 'pending' || d.status === 'processing' ? 'text-amber-500' : 'text-emerald-500 line-through'}`}>
                                                GH₵ {Number(d.amount_owed).toLocaleString()}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {d.status === 'pending' ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        className="bg-amber-600 hover:bg-amber-700 text-white h-8 text-xs font-medium shadow-sm"
                                                        onClick={() => handleOpenMoMoModal(d)}
                                                    >
                                                        <SmartphoneNfc className="w-3.5 h-3.5 mr-1" /> Request MoMo Push
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10 h-8 text-xs"
                                                        onClick={() => handleMarkDebtPaid(d.id)}
                                                    >
                                                        <CheckCircle className="w-3 h-3 mr-1" /> Mark Paid
                                                    </Button>
                                                </div>
                                            ) : d.status === 'processing' ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <Badge variant="outline" className="border-amber-500/40 text-amber-500 bg-amber-500/10 flex items-center gap-1.5 py-1 px-2.5">
                                                        <Loader2 className="w-3 h-3 animate-spin" /> Awaiting Client PIN
                                                    </Badge>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 text-xs text-muted-foreground hover:text-foreground"
                                                        onClick={() => handleOpenMoMoModal(d)}
                                                        title="Re-open MoMo Prompt / Link"
                                                    >
                                                        <RefreshCw className="w-3 h-3" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10 h-8 text-xs"
                                                        onClick={() => handleMarkDebtPaid(d.id)}
                                                    >
                                                        <CheckCircle className="w-3 h-3 mr-1" /> Mark Paid
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Badge variant="outline" className="border-emerald-500/50 text-emerald-500 bg-emerald-500/10 flex items-center gap-1 py-1 px-2.5 ml-auto w-fit">
                                                    <CheckCircle className="w-3 h-3" /> Paid via MoMo
                                                </Badge>
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
                        <Button size="sm" variant={stuckWithdrawals.length ? 'destructive' : 'outline'} onClick={() => setStuckOpen(true)}>
                            Stuck payouts ({stuckWithdrawals.length})
                        </Button>
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
                                            <div className="flex flex-wrap gap-2 justify-end">
                                                <Button size="sm" variant="outline" disabled={!!approvingWithdrawal} onClick={() => approveWithdrawal(w.id, 'korapay')}>
                                                    {approvingWithdrawal === w.id ? 'Processing...' : 'Approve via Korapay'}
                                                </Button>
                                                <Button size="sm" variant="ghost" className="text-emerald-600" disabled={!!approvingWithdrawal} onClick={() => approveWithdrawal(w.id, 'manual')}>
                                                    <CheckCircle className="w-3 h-3 mr-1" /> Mark Paid Manually
                                                </Button>
                                                <Button size="sm" variant="ghost" className="text-destructive" disabled={!!approvingWithdrawal} onClick={() => openRemoveRequest(w)}>
                                                    Remove request
                                                </Button>

                                            </div>
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
                            <Button size="sm" variant="outline" className="h-8" onClick={exportLedgerCSV}><FileText className="w-3 h-3 mr-1" /> Export CSV</Button>
                            <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowArchived(!showArchived)}>
                                {showArchived ? 'Hide archived' : 'Show archived'}
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 text-destructive border-destructive/40" onClick={() => setIsClearLedgerOpen(true)}>
                                Clear ledger
                            </Button>

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
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Escrow Debt</DialogTitle>
                        <DialogDescription>Record a client order that hasn't been fully paid to escrow yet.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-xs">Client Name</Label>
                            <Select
                                value={newDebt.client_name}
                                onValueChange={v => {
                                    const selectedClient = systemClients.find((c: any) => c.name === v);
                                    setNewDebt({
                                        ...newDebt,
                                        client_name: v,
                                        client_id: selectedClient?.id || '',
                                        client_phone: selectedClient?.whatsapp || newDebt.client_phone || '',
                                    });
                                }}
                            >
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
                            <Label className="text-right text-xs">Project</Label>
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
                            <Label className="text-right text-xs">Amount Owed</Label>
                            <Input
                                type="number"
                                className="col-span-3"
                                placeholder="0.00"
                                value={newDebt.amount_owed || ''}
                                onChange={e => setNewDebt({ ...newDebt, amount_owed: Number(e.target.value) })}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-xs">MoMo Phone</Label>
                            <Input
                                type="tel"
                                className="col-span-3"
                                placeholder="024XXXXXXX"
                                value={newDebt.client_phone}
                                onChange={e => setNewDebt({ ...newDebt, client_phone: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-xs">Network</Label>
                            <Select
                                value={newDebt.network_provider}
                                onValueChange={v => setNewDebt({ ...newDebt, network_provider: v })}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select network..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                                    <SelectItem value="vodafone">Telecel Cash (Vodafone)</SelectItem>
                                    <SelectItem value="airteltigo">AT Money (AirtelTigo)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsDebtModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateDebt} className="bg-amber-600 hover:bg-amber-700">Record Escrow</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MoMo Push Confirmation & Checkout Link Modal */}
            <Dialog open={momoModal.open} onOpenChange={open => setMomoModal(prev => ({ ...prev, open }))}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <SmartphoneNfc className="w-5 h-5 text-amber-500" />
                            Request Mobile Money Payment
                        </DialogTitle>
                        <DialogDescription>
                            Korapay will send a real-time USSD push prompt directly to the client's phone, or you can generate a hosted checkout link.
                        </DialogDescription>
                    </DialogHeader>

                    {momoModal.debt && (
                        <div className="space-y-4 py-2">
                            <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 space-y-2 text-xs">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Client:</span>
                                    <span className="font-semibold text-foreground">{momoModal.debt.client_name}</span>
                                </div>
                                {momoModal.debt.project_name && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Project:</span>
                                        <span className="text-foreground">{momoModal.debt.project_name}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-2 border-t border-border/40">
                                    <span className="text-muted-foreground font-medium">Amount to Charge:</span>
                                    <span className="font-mono font-bold text-amber-500 text-sm">
                                        GH₵ {Number(momoModal.debt.amount_owed).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Client Mobile Money Number</Label>
                                    <Input
                                        type="tel"
                                        placeholder="e.g. 0244123456"
                                        value={momoModal.phone}
                                        onChange={e => setMomoModal(prev => ({ ...prev, phone: e.target.value }))}
                                        disabled={momoModal.loading}
                                    />
                                    <p className="text-[10px] text-muted-foreground">Prompt will be pushed directly to this device for MoMo PIN entry.</p>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs">Network Operator</Label>
                                    <Select
                                        value={momoModal.operator}
                                        onValueChange={v => setMomoModal(prev => ({ ...prev, operator: v }))}
                                        disabled={momoModal.loading}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select network" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                                            <SelectItem value="vodafone">Telecel Cash (Vodafone)</SelectItem>
                                            <SelectItem value="airteltigo">AT Money (AirtelTigo)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {momoModal.checkoutUrl && (
                                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-2">
                                    <p className="text-xs font-medium text-emerald-400">Checkout Link Generated!</p>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            readOnly
                                            value={momoModal.checkoutUrl}
                                            className="h-8 text-xs font-mono bg-background"
                                        />
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 px-2.5 shrink-0"
                                            onClick={() => {
                                                navigator.clipboard.writeText(momoModal.checkoutUrl || '');
                                                toast({ title: 'Copied!', description: 'Link copied to clipboard.' });
                                            }}
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            className="w-full sm:w-auto"
                            disabled={momoModal.loading || !momoModal.phone}
                            onClick={() => handleTriggerMoMoPayment('checkout_link')}
                        >
                            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                            Get Payment Link
                        </Button>
                        <Button
                            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-medium"
                            disabled={momoModal.loading || !momoModal.phone}
                            onClick={() => handleTriggerMoMoPayment('ussd_push')}
                        >
                            {momoModal.loading ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                    Pushing Prompt...
                                </>
                            ) : (
                                <>
                                    <Send className="w-3.5 h-3.5 mr-1.5" />
                                    Send USSD Prompt
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Stuck payouts */}
            <Dialog open={stuckOpen} onOpenChange={setStuckOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Stuck payouts</DialogTitle>
                        <DialogDescription>Withdrawals Korapay couldn't finish. Paying manually first checks Korapay so nobody is paid twice.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                        {stuckWithdrawals.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No stuck payouts right now.</p>}
                        {stuckWithdrawals.map((w: any) => (
                            <div key={w.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/60 p-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold">{w.client_name} · GH₵ {Number(w.amount).toFixed(2)}</p>
                                    <p className="text-xs text-muted-foreground">{w.payout_method ? `${w.payout_method.provider.toUpperCase()} • ${w.payout_method.phone_number}` : 'No payout method'} · {format(new Date(w.created_at), 'MMM d, HH:mm')} · <span className="uppercase">{w.status}</span></p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <Button size="sm" variant="outline" disabled={!!approvingWithdrawal} onClick={() => approveWithdrawal(w.id, 'korapay')}>Retry Korapay</Button>
                                    <Button size="sm" disabled={!!approvingWithdrawal} onClick={() => approveWithdrawal(w.id, 'manual')}>
                                        {approvingWithdrawal === w.id ? 'Working...' : 'Pay manually'}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Remove withdrawal request */}
            <Dialog open={!!removeTarget} onOpenChange={(open) => { if (!open) { setRemoveTarget(null); setRemoveCheck(null); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remove withdrawal request</DialogTitle>
                        <DialogDescription>
                            This removes {removeTarget?.client_name}'s pending request for GH₵ {Number(removeTarget?.amount || 0).toFixed(2)}.
                            Use it only when the talent has already been paid outside the platform. They will be notified.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
                        {removeCheck === null ? (
                            <span className="text-muted-foreground">Checking payout history…</span>
                        ) : (
                            <span className={removeCheck.found ? 'text-emerald-600' : 'text-amber-600'}>
                                {removeCheck.message}
                            </span>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => { setRemoveTarget(null); setRemoveCheck(null); }}>Cancel</Button>
                        <Button variant="destructive" disabled={removing} onClick={confirmRemoveRequest}>
                            {removing ? 'Removing…' : 'Remove request'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Clear ledger */}
            <Dialog open={isClearLedgerOpen} onOpenChange={setIsClearLedgerOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Clear the ledger?</DialogTitle>
                        <DialogDescription>
                            Every current ledger record will be archived and hidden from this view. Nothing is deleted —
                            use "Show archived" to bring them back at any time.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="ghost" onClick={() => setIsClearLedgerOpen(false)}>Cancel</Button>
                        <Button variant="outline" disabled={clearingLedger} onClick={() => clearLedger(true)}>
                            Restore archived
                        </Button>
                        <Button variant="destructive" disabled={clearingLedger} onClick={() => clearLedger(false)}>
                            {clearingLedger ? 'Working…' : 'Archive all records'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>



        </SuperAdminLayout>
    );
};

export default FinanceDashboard;
