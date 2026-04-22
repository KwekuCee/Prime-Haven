import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Search, ArrowRight, Download, Receipt, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { generateInvoicePDF } from '@/lib/invoicePDF';

interface PaymentRecord {
    id: string;
    service_type: string;
    tier: string;
    price: number;
    payment_status: string;
    created_at: string;
    payment_reference?: string;
    client_name?: string;
    client_email?: string;
}

const ClientPayments = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [totalSpent, setTotalSpent] = useState(0);

    useEffect(() => {
        if (user?.email) {
            loadPayments();
        }
    }, [user]);

    const loadPayments = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('client_orders')
                .select('*')
                .eq('client_email', user?.email)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const fetchedPayments = ((data || []) as any) as PaymentRecord[];
            setPayments(fetchedPayments);

            // Calculate total spent (only for paid/completed orders)
            const total = fetchedPayments
                .filter(p => p.payment_status === 'paid' || p.payment_status === 'completed')
                .reduce((sum, p) => sum + Number(p.price || 0), 0);
            
            setTotalSpent(total);

        } catch (err: any) {
            console.error('Error loading payments:', err);
            toast({ title: 'Error', description: 'Could not load your payment history.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        if (!status) return 'bg-muted-foreground';
        if (status.includes('pending') || status.includes('failed')) return 'text-amber-500 border-amber-500/20 bg-amber-500/10';
        if (status.includes('completed') || status.includes('paid')) return 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10';
        return 'text-muted-foreground border-border bg-muted/20';
    };

    return (
        <DashboardLayout>
            <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto">
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Financial Overview</p>
                        <h1 className="text-2xl sm:text-3xl font-heading font-bold">Payments & Invoices</h1>
                    </div>
                </motion.div>

                {/* Amount Spent Card */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8 max-w-md">
                    <SpotlightCard className="h-full rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-6 hover:border-primary/20 transition-all">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                <Wallet className="w-6 h-6 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-[11px] text-muted-foreground tracking-wider uppercase font-bold">Total Amount Spent</p>
                            </div>
                        </div>
                        {loading ? (
                            <Skeleton className="h-10 w-40" />
                        ) : (
                            <div className="flex items-baseline gap-2">
                                <p className="text-4xl sm:text-5xl font-heading font-bold text-gradient">GH₵{totalSpent.toLocaleString()}</p>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-3">Total investment across all your projects.</p>
                    </SpotlightCard>
                </motion.div>

                {/* Payments Table */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden">
                    <div className="p-5 border-b border-border/50 flex items-center justify-between">
                        <h2 className="text-sm font-heading font-bold flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-primary" /> Payment History
                        </h2>
                    </div>

                    {loading ? (
                        <div className="p-8 space-y-4">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ) : payments.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-border/50">
                                        <TableHead className="text-xs font-semibold">Service</TableHead>
                                        <TableHead className="text-xs font-semibold">Package</TableHead>
                                        <TableHead className="text-xs font-semibold">Amount</TableHead>
                                        <TableHead className="text-xs font-semibold">Status</TableHead>
                                        <TableHead className="text-xs font-semibold">Date</TableHead>
                                        <TableHead className="text-xs font-semibold text-right">Receipt</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.map((payment) => (
                                        <TableRow key={payment.id} className="border-border/30 hover:bg-muted/10">
                                            <TableCell>
                                                <div className="font-medium capitalize">{payment.service_type?.replace(/-/g, ' ')}</div>
                                                <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">{payment.payment_reference || 'N/A'}</div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs text-muted-foreground capitalize">{payment.tier}</span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-bold">GH₵{(payment.price || 0).toLocaleString()}</span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider ${getStatusColor(payment.payment_status)}`}>
                                                    {(payment.payment_status || 'Pending')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {format(new Date(payment.created_at), 'MMM d, yyyy')}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                  title="Download Invoice PDF"
                                                  onClick={() => generateInvoicePDF({
                                                    id: payment.id,
                                                    clientEmail: user?.email || undefined,
                                                    clientName: user?.email?.split('@')[0] || 'Client',
                                                    serviceType: payment.service_type,
                                                    tier: payment.tier,
                                                    amount: payment.price,
                                                    paymentReference: payment.payment_reference,
                                                    paymentStatus: payment.payment_status,
                                                    createdAt: payment.created_at,
                                                    currency: 'GH₵',
                                                  })}
                                                >
                                                  <Download className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="p-12 text-center">
                            <CreditCard className="w-12 h-12 text-muted mx-auto mb-4" />
                            <h3 className="text-lg font-heading font-bold mb-1">No payment history</h3>
                            <p className="text-sm text-muted-foreground mb-4">You haven't made any payments yet.</p>
                        </div>
                    )}
                </motion.div>
            </div>
        </DashboardLayout>
    );
};

export default ClientPayments;
