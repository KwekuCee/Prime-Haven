import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, Copy, CheckCircle2, Users, DollarSign, TrendingUp, Presentation, Loader2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { MagneticEffect } from '@/components/ui/MagneticEffect';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Payout {
    id: string;
    amount: number;
    status: string;
    created_at: string;
}

interface MarketingAsset {
    id: string;
    title: string;
    description: string;
    asset_url: string;
    asset_type: string;
}

interface Referral {
    id: string;
    client_name: string;
    service_booked: string;
    status: string;
    commission: number;
    created_at: string;
}

interface AffiliateProfile {
    id: string;
    referral_code: string;
    clicks: number;
}

const AffiliateDashboard = () => {
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const location = useLocation();

    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [copied, setCopied] = useState(false);
    const [profile, setProfile] = useState<AffiliateProfile | null>(null);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [payouts, setPayouts] = useState<Payout[]>([]);
    const [assets, setAssets] = useState<MarketingAsset[]>([]);
    const [requestingPayout, setRequestingPayout] = useState(false);

    useEffect(() => {
        if (!authLoading && user?.id) {
            loadAffiliateData();
        }
    }, [user, authLoading]);

    const loadAffiliateData = async () => {
        try {
            setLoading(true);
            
            // 1. Fetch Profile
            const { data: profileData, error: profileError } = await supabase
                .from('affiliate_profiles')
                .select('*')
                .eq('user_id', user!.id)
                .maybeSingle();

            if (profileError) {
                if (profileError.code === '42P01') {
                    console.warn("Affiliate schema not initialized");
                    setLoading(false);
                    return;
                }
                throw profileError;
            }

            setProfile(profileData as AffiliateProfile);

            // 2. Fetch Referrals, Payouts, and Assets if profile exists
            if (profileData) {
                const [refRes, payRes, astRes] = await Promise.all([
                    supabase.from('affiliate_referrals').select('*').eq('affiliate_id', profileData.id).order('created_at', { ascending: false }),
                    supabase.from('affiliate_payouts').select('*').eq('affiliate_id', profileData.id).order('created_at', { ascending: false }),
                    supabase.from('marketing_assets').select('*').order('created_at', { ascending: false })
                ]);
                
                if (refRes.error) throw refRes.error;
                setReferrals((refRes.data || []) as Referral[]);
                
                if (!payRes.error) setPayouts((payRes.data || []) as Payout[]);
                if (!astRes.error) setAssets((astRes.data || []) as MarketingAsset[]);
            }

        } catch (error: any) {
            console.error('Error loading affiliate data:', error);
            toast({ title: "Error", description: "Failed to load dashboard. Ensure SQL schema is run.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const joinProgram = async () => {
        if (!user) return;
        setJoining(true);
        try {
            const uniqueCode = "PH-" + Math.random().toString(36).substring(2, 10).toUpperCase();
            
            const { error } = await supabase.from('affiliate_profiles').insert({
                user_id: user.id,
                referral_code: uniqueCode
            });

            if (error) {
                if (error.code === '42P01') {
                    throw new Error("The affiliate system database isn't initialized yet. Please run the SQL migration.");
                }
                throw error;
            }

            toast({ title: 'Welcome aboard! 🎉', description: 'Your affiliate account has been activated.' });
            loadAffiliateData();
        } catch (error: any) {
            toast({ title: 'Failed to join', description: error.message, variant: 'destructive' });
        } finally {
            setJoining(false);
        }
    };

    const copyLink = () => {
        if (!profile) return;
        const link = `${window.location.origin}/ref/${profile.referral_code}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        toast({ title: 'Link Copied!', description: 'Your affiliate link has been copied to your clipboard.' });
        setTimeout(() => setCopied(false), 2000);
    };

    const requestPayout = async () => {
        if (!profile || availableBalance <= 0) return;
        setRequestingPayout(true);
        try {
            const { error } = await supabase.from('affiliate_payouts').insert({
                affiliate_id: profile.id,
                amount: availableBalance
            });
            if (error) throw error;
            toast({ title: "Payout Requested", description: "Your payout request has been submitted successfully." });
            loadAffiliateData();
        } catch (error: any) {
            toast({ title: "Request Failed", description: error.message, variant: "destructive" });
        } finally {
            setRequestingPayout(false);
        }
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

    if (!profile) {
        return (
            <DashboardLayout>
                <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto min-h-[70vh] flex flex-col items-center justify-center">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md text-center bg-card/40 backdrop-blur-sm border border-border/50 p-8 rounded-3xl">
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <TrendingUp className="w-8 h-8 text-primary" />
                        </div>
                        <h1 className="text-2xl font-heading font-bold mb-3">Join the Partner Program</h1>
                        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                            Turn your network into income. Share Prime Haven with your peers and earn a <strong>5% commission</strong> on every successful project booked through your unique link.
                        </p>
                        <Button size="lg" className="w-full text-sm h-12" onClick={joinProgram} disabled={joining}>
                            {joining ? <Loader2 className="w-5 h-5 animate-spin" /> : "Generate My Referral Link"}
                        </Button>
                    </motion.div>
                </div>
            </DashboardLayout>
        );
    }

    const pendingPayout = referrals.filter(r => r.status === 'converted').reduce((sum, r) => sum + Number(r.commission), 0);
    const availableBalance = referrals.filter(r => r.status === 'available').reduce((sum, r) => sum + Number(r.commission), 0);
    const totalEarned = referrals.filter(r => r.status === 'paid').reduce((sum, r) => sum + Number(r.commission), 0);
    const signups = referrals.filter(r => r.status !== 'rejected').length;
    const hasPendingRequest = payouts.some(p => p.status === 'pending');

    const currentTab = location.hash.replace('#', '') || 'overview';

    return (
        <DashboardLayout>
            <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Marketing Partner</p>
                        <h1 className="text-2xl sm:text-3xl font-heading font-bold capitalize">
                            {currentTab === 'overview' ? 'Affiliate Dashboard' : `Affiliate ${currentTab}`} <span className="text-gradient">✦</span>
                        </h1>
                    </div>
                    {currentTab === 'overview' && (
                        <MagneticEffect intensity={0.1}>
                            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-xs" 
                                disabled={pendingPayout === 0 || hasPendingRequest} onClick={requestPayout}>
                                {requestingPayout ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />} 
                                {hasPendingRequest ? 'Payout Pending' : 'Request Payout'}
                            </Button>
                        </MagneticEffect>
                    )}
                </motion.div>

                {currentTab === 'overview' && (
                    <>
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
                                Share this link across your network, social media, or marketing campaigns. You earn a <strong>5% commission</strong> on every successful project booked through your link.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-1 bg-card/50 border border-border/50 rounded-xl px-4 py-3 font-mono text-sm flex items-center overflow-x-auto text-primary">
                                    {`${window.location.origin}/ref/${profile.referral_code}`}
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
                                    <p className="text-2xl sm:text-3xl font-heading font-bold">{profile.clicks || 0}</p>
                                    <p className="text-[11px] text-muted-foreground mt-1">Total Link Clicks</p>
                                </SpotlightCard>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="h-full">
                                <SpotlightCard className="h-full rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5 hover:border-primary/20 transition-all">
                                    <div className="flex items-center justify-between mb-3">
                                        <Users className="w-5 h-5 text-primary" />
                                    </div>
                                    <p className="text-2xl sm:text-3xl font-heading font-bold">{signups}</p>
                                    <p className="text-[11px] text-muted-foreground mt-1">Converted Referrals</p>
                                </SpotlightCard>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="h-full">
                                <SpotlightCard className="h-full rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5 hover:border-primary/20 transition-all">
                                    <div className="flex items-center justify-between mb-3">
                                        <TrendingUp className="w-5 h-5 text-amber-500" />
                                    </div>
                                    <p className="text-2xl sm:text-3xl font-heading font-bold">GH₵{pendingPayout.toLocaleString()}</p>
                                    <p className="text-[11px] text-muted-foreground mt-1">Pending Commisions</p>
                                </SpotlightCard>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="h-full">
                                <SpotlightCard className="h-full rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5 hover:border-primary/20 transition-all">
                                    <div className="flex items-center justify-between mb-3">
                                        <DollarSign className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <p className="text-2xl sm:text-3xl font-heading font-bold">GH₵{totalEarned.toLocaleString()}</p>
                                    <p className="text-[11px] text-muted-foreground mt-1">Total Lifetime Earned</p>
                                </SpotlightCard>
                            </motion.div>
                        </div>
                    </>
                )}

                {/* Referrals View */}
                {(currentTab === 'overview' || currentTab === 'referrals') && (
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden mb-8">
                        <div className="p-5 border-b border-border/50">
                            <h2 className="text-sm font-heading font-bold flex items-center gap-2">
                                <Users className="w-4 h-4 text-primary" /> {currentTab === 'referrals' ? 'All Referrals History' : 'Active Referrals'}
                            </h2>
                        </div>

                        {referrals.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground">
                                <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p className="text-sm">No referrals yet. Share your link to start earning!</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent border-border/50">
                                            <TableHead className="text-xs font-semibold">Client Name</TableHead>
                                            <TableHead className="text-xs font-semibold">Service Booked</TableHead>
                                            <TableHead className="text-xs font-semibold">Status</TableHead>
                                            <TableHead className="text-xs font-semibold">Your Commission (5%)</TableHead>
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
                                                    <span className="text-xs text-muted-foreground">{ref.service_booked}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider ${
                                                        ref.status === 'paid' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' :
                                                        ref.status === 'converted' ? 'text-amber-500 border-amber-500/20 bg-amber-500/10' :
                                                        'text-blue-500 border-blue-500/20 bg-blue-500/10'
                                                    }`}>
                                                        {ref.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm font-bold text-primary">
                                                    GH₵{Number(ref.commission).toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {new Date(ref.created_at).toLocaleDateString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Payouts Tab */}
                {currentTab === 'payouts' && (
                    <div className="space-y-6">
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                            className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden p-8 text-center max-w-2xl mx-auto">
                            <Wallet className="w-16 h-16 text-primary mx-auto mb-6 opacity-80" />
                            <h2 className="text-2xl font-bold font-heading mb-2">Payout Management</h2>
                            <p className="text-muted-foreground mb-8">
                                You currently have <strong className="text-primary">GH₵{pendingPayout.toLocaleString()}</strong> in pending commissions. 
                                Commissions become eligible for payout 14 days after the referred project is successfully completed.
                            </p>
                            <Button size="lg" className="px-8 h-14 w-full sm:w-auto" disabled={pendingPayout === 0 || hasPendingRequest} onClick={requestPayout}>
                                {requestingPayout ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                                {hasPendingRequest ? 'Payout Request Processing...' : 'Request Payout to Bank / Mobile Money'}
                            </Button>
                        </motion.div>

                        {payouts.length > 0 && (
                            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                                className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden">
                                <div className="p-5 border-b border-border/50">
                                    <h2 className="text-sm font-heading font-bold flex items-center gap-2">
                                        <Wallet className="w-4 h-4 text-primary" /> Payout History
                                    </h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent border-border/50">
                                                <TableHead className="text-xs font-semibold">Date</TableHead>
                                                <TableHead className="text-xs font-semibold">Amount</TableHead>
                                                <TableHead className="text-xs font-semibold">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {payouts.map((p) => (
                                                <TableRow key={p.id} className="border-border/30">
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {new Date(p.created_at).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell className="text-sm font-bold">
                                                        GH₵{Number(p.amount).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider ${
                                                            p.status === 'processed' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' :
                                                            p.status === 'rejected' ? 'text-red-500 border-red-500/20 bg-red-500/10' :
                                                            'text-amber-500 border-amber-500/20 bg-amber-500/10'
                                                        }`}>
                                                            {p.status}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </motion.div>
                        )}
                    </div>
                )}

                {/* Marketing Assets Tab */}
                {currentTab === 'assets' && (
                     <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="space-y-6">
                        <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden p-8 text-center max-w-2xl mx-auto mb-8">
                            <Presentation className="w-16 h-16 text-blue-500 mx-auto mb-6 opacity-80" />
                            <h2 className="text-2xl font-bold font-heading mb-2">Marketing Toolkit</h2>
                            <p className="text-muted-foreground mb-4">
                                Use these officially approved banners, copy, and logos to promote Prime Haven across your channels.
                            </p>
                        </div>

                        {assets.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground border border-border/50 rounded-2xl bg-card/20">
                                <p className="text-sm">No marketing assets available yet. Check back soon!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {assets.map(asset => (
                                    <div key={asset.id} className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden flex flex-col">
                                        {asset.asset_type === 'image' ? (
                                            <div className="h-48 bg-muted relative overflow-hidden flex items-center justify-center">
                                                <img src={asset.asset_url} alt={asset.title} className="max-w-full max-h-full object-contain" />
                                            </div>
                                        ) : (
                                            <div className="h-48 bg-muted flex items-center justify-center text-muted-foreground p-6 text-center">
                                                <Presentation className="w-12 h-12 opacity-50 mb-2" />
                                            </div>
                                        )}
                                        <div className="p-5 flex flex-col flex-1">
                                            <h3 className="font-bold mb-2">{asset.title}</h3>
                                            <p className="text-xs text-muted-foreground mb-4 flex-1">{asset.description}</p>
                                            <Button variant="secondary" className="w-full text-xs" onClick={() => {
                                                if (asset.asset_type === 'copy') {
                                                    navigator.clipboard.writeText(asset.asset_url);
                                                    toast({ title: "Copied!", description: "Copy text copied to clipboard." });
                                                } else {
                                                    window.open(asset.asset_url, '_blank');
                                                }
                                            }}>
                                                {asset.asset_type === 'copy' ? 'Copy Text' : 'Download / View'}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

            </div>
        </DashboardLayout>
    );
};

export default AffiliateDashboard;
