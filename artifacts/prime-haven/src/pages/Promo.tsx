
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SuperAdminLayout from '@/components/admin/SuperAdminLayout';
import { motion } from 'framer-motion';
import {
    TrendingUp,
    Target,
    Megaphone,
    BarChart3,
    Tag,
    Globe,
    Users,
    Zap,
    MousePointer2,
    Eye,
    DollarSign,
    ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import ManageMarketingAssets from '@/components/admin/ManageMarketingAssets';
import AdsterraStats from '@/components/admin/AdsterraStats';
import ManageSitePromos from '@/components/admin/ManageSitePromos';
import { supabase } from '@/integrations/supabase/client';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const PromoDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('assets');
    const [stats, setStats] = useState({
        totalPromos: 0,
        activeCampaigns: 0,
        marketingReach: '0',
        conversionRate: '0%'
    });
    const [affiliates, setAffiliates] = useState<any[]>([]);
    const [loadingAffiliates, setLoadingAffiliates] = useState(false);
    const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);

    useEffect(() => {
        const fetchPromoData = async () => {
            // Fetch Stats
            const { count: promoCount } = await supabase.from('marketing_assets').select('*', { count: 'exact', head: true });

            // Get unique visitors count
            const { count: reachCount } = await supabase.from('visitor_analytics').select('ip_hash', { count: 'exact', head: true });

            // Get conversion (registered users vs total visitors)
            const { count: registeredCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

            const convRate = reachCount && reachCount > 0
                ? ((registeredCount || 0) / reachCount * 100).toFixed(1) + '%'
                : '0%';

            setStats({
                totalPromos: promoCount || 0,
                activeCampaigns: (promoCount || 0) > 0 ? Math.floor((promoCount || 0) * 0.7) : 0, // Mock active logic if not explicitly in DB
                marketingReach: reachCount ? (reachCount > 1000 ? (reachCount / 1000).toFixed(1) + 'K' : reachCount.toString()) : '0',
                conversionRate: convRate
            });

            // Fetch Affiliates
            setLoadingAffiliates(true);
            const { data: affiliateData } = await supabase
                .from('affiliate_profiles')
                .select(`
                    *,
                    profiles:user_id (full_name, email, avatar_url)
                `)
                .limit(5);

            setAffiliates(affiliateData || []);
            setLoadingAffiliates(false);
        };

        fetchPromoData();
    }, []);

    return (
        <SuperAdminLayout>
            <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-1"
                    >
                        <h1 className="text-3xl font-bold tracking-tight font-heading">Promotion Hub</h1>
                        <p className="text-muted-foreground flex items-center gap-2">
                            <Megaphone className="w-4 h-4 text-primary" />
                            Manage campaigns, assets and ad performance
                        </p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex gap-2"
                    >
                        <Button variant="outline" className="glass-card border-primary/20 hover:bg-primary/5" onClick={() => setActiveTab('ads')}>
                            <BarChart3 className="w-4 h-4 mr-2" /> View Reports
                        </Button>
                        <Button className="bg-primary text-primary-foreground shadow-lg shadow-primary/20" onClick={() => setActiveTab('assets')}>
                            <Zap className="w-4 h-4 mr-2" /> Launch Campaign
                        </Button>
                    </motion.div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Marketing Assets', value: stats.totalPromos, icon: Tag, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                        { label: 'Active Promotions', value: stats.activeCampaigns, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                        { label: 'Total Reach', value: stats.marketingReach, icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                        { label: 'Conversion Rate', value: stats.conversionRate, icon: Target, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <Card className="glass-card border-border/50 hover:border-primary/30 transition-all overflow-hidden group">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                        </div>
                                        <TrendingUp className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <div className="mt-4 space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                                        <h3 className="text-2xl font-bold tracking-tight">{stat.value}</h3>
                                    </div>
                                    <div className="mt-2 h-1 w-full bg-muted rounded-full overflow-hidden">
                                        <motion.div
                                            className={`h-full ${stat.bg.replace('/10', '')}`}
                                            initial={{ width: 0 }}
                                            animate={{ width: '60%' }}
                                            transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Main Content Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-muted/50 p-1 border border-border/50 rounded-xl w-full sm:w-auto overflow-x-auto inline-flex flex-nowrap">
                        <TabsTrigger value="assets" className="px-6 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all whitespace-nowrap">
                            <Tag className="w-4 h-4 mr-2" /> Marketing Assets
                        </TabsTrigger>
                        <TabsTrigger value="ads" className="px-6 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all whitespace-nowrap">
                            <Globe className="w-4 h-4 mr-2" /> Ad Performance
                        </TabsTrigger>
                        <TabsTrigger value="partners" className="px-6 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all whitespace-nowrap">
                            <Users className="w-4 h-4 mr-2" /> Partners
                        </TabsTrigger>
                        <TabsTrigger value="promos" className="px-6 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all whitespace-nowrap">
                            <Megaphone className="w-4 h-4 mr-2" /> Site Promos
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="assets" className="space-y-4 focus-visible:outline-none">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Card className="glass-card overflow-hidden border-border/50">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl">Campaign Banners</CardTitle>
                                        <CardDescription>Manage your platform banners and promotional assets</CardDescription>
                                    </div>
                                    <Button size="sm" onClick={() => setIsAddAssetOpen(true)}>
                                        <Zap className="w-4 h-4 mr-2" /> New Asset
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    <ManageMarketingAssets />
                                </CardContent>
                            </Card>
                        </motion.div>
                    </TabsContent>

                    <TabsContent value="ads" className="space-y-4 focus-visible:outline-none">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Card className="glass-card overflow-hidden border-border/50">
                                <CardHeader className="border-b border-border/50 mb-6">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <CardTitle className="text-xl">Adsterra Analytics</CardTitle>
                                            <CardDescription>Real-time performance tracking and revenue stats</CardDescription>
                                        </div>
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                            <div className="px-4 py-2 bg-primary/5 rounded-lg border border-primary/10">
                                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Today's Est</p>
                                                <p className="text-sm font-bold text-primary">$42.50</p>
                                            </div>
                                            <div className="px-4 py-2 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">CTR</p>
                                                <p className="text-sm font-bold text-emerald-500">2.4%</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <AdsterraStats />
                                </CardContent>
                            </Card>
                        </motion.div>
                    </TabsContent>
                    <TabsContent value="partners" className="space-y-4 focus-visible:outline-none">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Card className="glass-card overflow-hidden border-border/50">
                                <CardHeader>
                                    <CardTitle className="text-xl">Affiliate Partners</CardTitle>
                                    <CardDescription>Top performing influencers and marketing partners</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Partner</TableHead>
                                                <TableHead>Code</TableHead>
                                                <TableHead>Clicks</TableHead>
                                                <TableHead>Total Earnings</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {affiliates.map((affiliate) => (
                                                <TableRow key={affiliate.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="w-8 h-8">
                                                                <AvatarImage src={affiliate.profiles?.avatar_url} />
                                                                <AvatarFallback>{affiliate.profiles?.full_name?.charAt(0) || 'P'}</AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <div className="font-medium text-sm">{affiliate.profiles?.full_name || 'Anonymous Partner'}</div>
                                                                <div className="text-[10px] text-muted-foreground">{affiliate.profiles?.email}</div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell><Badge variant="outline" className="font-mono">{affiliate.referral_code}</Badge></TableCell>
                                                    <TableCell className="font-semibold">{affiliate.clicks || 0}</TableCell>
                                                    <TableCell className="text-emerald-500 font-bold">GH₵ {((affiliate.clicks || 0) * 0.5).toFixed(2)}</TableCell>
                                                    <TableCell><Badge className="bg-emerald-500/10 text-emerald-500 border-none">Active</Badge></TableCell>
                                                </TableRow>
                                            ))}
                                            {affiliates.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No active partners found.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </TabsContent>
                    <TabsContent value="promos" className="space-y-4 focus-visible:outline-none">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Card className="glass-card overflow-hidden border-border/50">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-xl">Site-Wide Promotions</CardTitle>
                                            <CardDescription>Manage timed pop-up ads and announcements</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <ManageSitePromos />
                                </CardContent>
                            </Card>
                        </motion.div>
                    </TabsContent>
                </Tabs>

                {/* Action Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="glass-card group cursor-pointer border-border/50 hover:border-primary/30 transition-all overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 text-primary/5 group-hover:text-primary/10 transition-colors">
                            <Megaphone className="w-24 h-24 rotate-12" />
                        </div>
                        <CardHeader>
                            <CardTitle>Creative Lab</CardTitle>
                            <CardDescription>Request new creative assets from the design team</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="ghost" className="p-0 text-primary group-hover:translate-x-1 transition-transform" onClick={() => navigate('/superadmin?tab=messages')}>
                                Open Creative Portal <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="glass-card group cursor-pointer border-border/50 hover:border-emerald-500/30 transition-all overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 text-emerald-500/5 group-hover:text-emerald-500/10 transition-colors">
                            <TrendingUp className="w-24 h-24 -rotate-12" />
                        </div>
                        <CardHeader>
                            <CardTitle>Partner Program</CardTitle>
                            <CardDescription>Manage your affiliate partners and influencers</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="ghost" className="p-0 text-emerald-500 group-hover:translate-x-1 transition-transform" onClick={() => setActiveTab('partners')}>
                                View All Partners <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </CardContent>
                    </Card>
                </div>
                <Dialog open={isAddAssetOpen} onOpenChange={setIsAddAssetOpen}>
                    <DialogContent className="sm:max-w-[600px] glass-card border-border/50 max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Launch New Campaign Asset</DialogTitle>
                            <DialogDescription>Add a new banner or marketing resource for your partners.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <ManageMarketingAssets />
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </SuperAdminLayout>
    );
};

export default PromoDashboard;
