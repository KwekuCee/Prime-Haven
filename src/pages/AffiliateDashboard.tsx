import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, Copy, CheckCircle2, Users, DollarSign, TrendingUp, Presentation, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { MagneticEffect } from '@/components/ui/MagneticEffect';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Referral {
    id: string;
    client_name: string;
    service: string;
    status: string;
    commission: number;
    date: string;
}

const AffiliateDashboard = () => {
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [referralLink, setReferralLink] = useState('');

    // Mocking data since specific tables might not exist yet
    const [stats, setStats] = useState({ clicks: 0, signups: 0, conversions: 0, pendingPayout: 0, totalEarned: 0 });
    const [referrals, setReferrals] = useState<Referral[]>([]);

    useEffect(() => {
        if (user?.id) {
            // Setup mock data for presentation
            setReferralLink(`https://primehaven.tech/ref/${user.id.substring(0, 8)}`);
            setStats({
                clicks: 342,
                signups: 45,
                conversions: 12,
                pendingPayout: 1250,
                totalEarned: 8400
            });
            setReferrals([
                { id: '1', client_name: 'John Doe', service: 'Logo Design', status: 'converted', commission: 200, date: new Date().toISOString() },
                { id: '2', client_name: 'Sarah Smith', service: 'E-commerce App', status: 'pending', commission: 1050, date: new Date(Date.now() - 86400000).toISOString() },
            ]);
            setLoading(false);
        }
    }, [user]);

    const copyLink = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        toast({ title: 'Link Copied!', description: 'Your affiliate link has been copied to your clipboard.' });
        setTimeout(() => setCopied(false), 2000);
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
                        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Marketing Partner</p>
                        <h1 className="text-2xl sm:text-3xl font-heading font-bold">
                            Affiliate Dashboard <span className="text-gradient">✦</span>
                        </h1>
                    </div>
                    <MagneticEffect intensity={0.1}>
                        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-xs">
                            <DollarSign className="w-4 h-4" /> Request Payout
                        </Button>
                    </MagneticEffect>
                </motion.div>

                {/* Link Generator */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="mb-8 p-6 rounded-2xl border border-border/60 bg-primary/5 backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Link className="w-4 h-4 text-primary" />
                        </div>
                        <h2 className="text-sm font-heading font-bold">Your Unique Referral Link</h2>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4 max-w-2xl">
                        Share this link across your network, social media, or marketing campaigns. You earn a 10% commission on every successful project booked through your link.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 bg-card/50 border border-border/50 rounded-xl px-4 py-3 font-mono text-sm flex items-center overflow-x-auto text-primary">
                            {referralLink}
                        </div>
                        <Button onClick={copyLink} className="h-11 px-6 shrink-0" variant={copied ? "default" : "secondary"}>
                            {copied ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                            {copied ? 'Copied' : 'Copy Link'}
                        </Button>
                    </div>
                </motion.div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="h-full">
                        <SpotlightCard className="h-full rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5 hover:border-primary/20 transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <Presentation className="w-5 h-5 text-blue-500" />
                            </div>
                            <p className="text-2xl sm:text-3xl font-heading font-bold">{stats.clicks}</p>
                            <p className="text-[11px] text-muted-foreground mt-1">Total Link Clicks</p>
                        </SpotlightCard>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="h-full">
                        <SpotlightCard className="h-full rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5 hover:border-primary/20 transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <Users className="w-5 h-5 text-primary" />
                            </div>
                            <p className="text-2xl sm:text-3xl font-heading font-bold">{stats.signups}</p>
                            <p className="text-[11px] text-muted-foreground mt-1">Registered Clients</p>
                        </SpotlightCard>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="h-full">
                        <SpotlightCard className="h-full rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5 hover:border-primary/20 transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <TrendingUp className="w-5 h-5 text-amber-500" />
                            </div>
                            <p className="text-2xl sm:text-3xl font-heading font-bold">GH₵{stats.pendingPayout.toLocaleString()}</p>
                            <p className="text-[11px] text-muted-foreground mt-1">Pending Commisions</p>
                        </SpotlightCard>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="h-full">
                        <SpotlightCard className="h-full rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5 hover:border-primary/20 transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <DollarSign className="w-5 h-5 text-emerald-500" />
                            </div>
                            <p className="text-2xl sm:text-3xl font-heading font-bold">GH₵{stats.totalEarned.toLocaleString()}</p>
                            <p className="text-[11px] text-muted-foreground mt-1">Total Lifetime Earned</p>
                        </SpotlightCard>
                    </motion.div>
                </div>

                {/* Referrals Table */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden">
                    <div className="p-5 border-b border-border/50">
                        <h2 className="text-sm font-heading font-bold flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" /> Active Referrals
                        </h2>
                    </div>

                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-border/50">
                                    <TableHead className="text-xs font-semibold">Client Name</TableHead>
                                    <TableHead className="text-xs font-semibold">Service Booked</TableHead>
                                    <TableHead className="text-xs font-semibold">Status</TableHead>
                                    <TableHead className="text-xs font-semibold">Your Commission</TableHead>
                                    <TableHead className="text-xs font-semibold">Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {referrals.map((ref) => (
                                    <TableRow key={ref.id} className="border-border/30">
                                        <TableCell>
                                            <span className="text-sm font-medium">{ref.client_name}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs text-muted-foreground">{ref.service}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider ${ref.status === 'converted' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' :
                                                    'text-amber-500 border-amber-500/20 bg-amber-500/10'
                                                }`}>
                                                {ref.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm font-bold text-primary">
                                            GH₵{ref.commission.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {new Date(ref.date).toLocaleDateString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </motion.div>

            </div>
        </DashboardLayout>
    );
};

export default AffiliateDashboard;
