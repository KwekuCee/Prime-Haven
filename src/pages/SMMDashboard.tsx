import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    BarChart2, Briefcase, Calendar, ChevronRight, Edit2, ExternalLink,
    FileCheck, Globe, Instagram, Loader2, MessageSquare, Plus, Settings,
    Share2, Target, Trash2, TrendingUp, Users, X, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/DashboardLayout';
import { useSmmDashboard, SmmCampaign, SmmPost } from '@/hooks/useSmmDashboard';

// ─── Constants ───────────────────────────────────────────────────────────────
const PLATFORMS = ['instagram', 'facebook', 'tiktok', 'x', 'linkedin', 'youtube'];
const GOALS = ['awareness', 'engagement', 'conversion', 'leads', 'sales', 'community'];
const POST_TYPES = ['post', 'story', 'reel', 'ad', 'thread'];
const PLATFORM_COLORS: Record<string, string> = {
    instagram: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    facebook: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    tiktok: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
    x: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20',
    linkedin: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    youtube: 'bg-red-500/10 text-red-400 border-red-500/20',
};
const STATUS_COLORS: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    paused: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    completed: 'bg-primary/10 text-primary border-primary/20',
    archived: 'bg-muted/50 text-muted-foreground border-border/40',
    draft: 'bg-muted/50 text-muted-foreground border-border/40',
    scheduled: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    posted: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
};

// ─── Campaign Form Modal ──────────────────────────────────────────────────────
const CampaignModal = ({
    open, onClose, onSave, initial, contracts,
}: {
    open: boolean;
    onClose: () => void;
    onSave: (data: Partial<SmmCampaign>) => Promise<void>;
    initial?: Partial<SmmCampaign>;
    contracts: { id: string; title: string }[];
}) => {
    const [form, setForm] = useState<Partial<SmmCampaign>>(initial || {
        campaign_name: '', client_name: '', platforms: [], goal: '', status: 'active', notes: '', contract_id: undefined,
    });
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    const togglePlatform = (p: string) =>
        setForm(f => ({
            ...f,
            platforms: f.platforms?.includes(p) ? f.platforms.filter(x => x !== p) : [...(f.platforms || []), p],
        }));

    const handleSave = async () => {
        if (!form.campaign_name?.trim()) { toast({ title: 'Campaign name required', variant: 'destructive' }); return; }
        if (!form.platforms?.length) { toast({ title: 'Select at least one platform', variant: 'destructive' }); return; }
        setSaving(true);
        try { await onSave(form); onClose(); }
        catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
        finally { setSaving(false); }
    };

    return (
        <Dialog open={open} onOpenChange={o => !o && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>{initial?.id ? 'Edit Campaign' : 'New Campaign'}</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 space-y-1.5">
                            <Label className="text-xs">Campaign Name *</Label>
                            <Input value={form.campaign_name || ''} onChange={e => setForm(f => ({ ...f, campaign_name: e.target.value }))} placeholder="Q3 Brand Awareness" className="h-9 text-xs" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Client Name</Label>
                            <Input value={form.client_name || ''} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="Client / Brand name" className="h-9 text-xs" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Goal</Label>
                            <Select value={form.goal || ''} onValueChange={v => setForm(f => ({ ...f, goal: v }))}>
                                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select goal" /></SelectTrigger>
                                <SelectContent>{GOALS.map(g => <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Start Date</Label>
                            <Input type="date" value={form.start_date || ''} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="h-9 text-xs" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">End Date</Label>
                            <Input type="date" value={form.end_date || ''} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="h-9 text-xs" />
                        </div>
                        {contracts.length > 0 && (
                            <div className="col-span-2 space-y-1.5">
                                <Label className="text-xs">Link to Contract (Optional)</Label>
                                <Select value={form.contract_id || 'none'} onValueChange={v => setForm(f => ({ ...f, contract_id: v === 'none' ? undefined : v }))}>
                                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="No contract" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No contract</SelectItem>
                                        {contracts.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="col-span-2 space-y-1.5">
                            <Label className="text-xs">Platforms *</Label>
                            <div className="flex flex-wrap gap-2">
                                {PLATFORMS.map(p => (
                                    <Badge key={p} variant="outline" onClick={() => togglePlatform(p)}
                                        className={`cursor-pointer capitalize text-[10px] px-3 py-1.5 transition-all ${form.platforms?.includes(p) ? PLATFORM_COLORS[p] + ' ring-2 ring-offset-1 ring-offset-background' : 'opacity-60 hover:opacity-100'}`}>
                                        {p}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                        <div className="col-span-2 space-y-1.5">
                            <Label className="text-xs">Notes</Label>
                            <Textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Campaign brief, objectives..." className="text-xs resize-none h-20" />
                        </div>
                    </div>
                    <Button onClick={handleSave} disabled={saving} className="w-full">
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : initial?.id ? 'Update Campaign' : 'Create Campaign'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// ─── Post Form Modal ──────────────────────────────────────────────────────────
const PostModal = ({
    open, onClose, onSave, campaigns,
}: {
    open: boolean; onClose: () => void;
    onSave: (data: Partial<SmmPost>) => Promise<void>;
    campaigns: SmmCampaign[];
}) => {
    const [form, setForm] = useState<Partial<SmmPost>>({ platform: '', post_type: 'post', status: 'draft', caption: '', media_url: '', notes: '' });
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    const handleSave = async () => {
        if (!form.campaign_id) { toast({ title: 'Select a campaign', variant: 'destructive' }); return; }
        if (!form.platform) { toast({ title: 'Select a platform', variant: 'destructive' }); return; }
        setSaving(true);
        try { await onSave(form); onClose(); setForm({ platform: '', post_type: 'post', status: 'draft', caption: '', media_url: '', notes: '' }); }
        catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
        finally { setSaving(false); }
    };

    return (
        <Dialog open={open} onOpenChange={o => !o && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>New Post</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 space-y-1.5">
                            <Label className="text-xs">Campaign *</Label>
                            <Select value={form.campaign_id || ''} onValueChange={v => setForm(f => ({ ...f, campaign_id: v }))}>
                                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select campaign" /></SelectTrigger>
                                <SelectContent>{campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.campaign_name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Platform *</Label>
                            <Select value={form.platform || ''} onValueChange={v => setForm(f => ({ ...f, platform: v }))}>
                                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Platform" /></SelectTrigger>
                                <SelectContent>{PLATFORMS.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Post Type</Label>
                            <Select value={form.post_type || 'post'} onValueChange={v => setForm(f => ({ ...f, post_type: v }))}>
                                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>{POST_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-2 space-y-1.5">
                            <Label className="text-xs">Caption</Label>
                            <Textarea value={form.caption || ''} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))} placeholder="Post copy..." className="text-xs resize-none h-20" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Media URL</Label>
                            <Input value={form.media_url || ''} onChange={e => setForm(f => ({ ...f, media_url: e.target.value }))} placeholder="https://..." className="h-9 text-xs" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Schedule Date</Label>
                            <Input type="datetime-local" value={form.scheduled_at || ''} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} className="h-9 text-xs" />
                        </div>
                        <div className="col-span-2 space-y-1.5">
                            <Label className="text-xs">Status</Label>
                            <Select value={form.status || 'draft'} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {['draft', 'scheduled', 'posted', 'cancelled'].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Button onClick={handleSave} disabled={saving} className="w-full">
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Add Post'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// ─── Analytics Log Modal ──────────────────────────────────────────────────────
const AnalyticsModal = ({
    open, onClose, onSave, campaigns,
}: {
    open: boolean; onClose: () => void;
    onSave: (data: any) => Promise<void>;
    campaigns: SmmCampaign[];
}) => {
    const [form, setForm] = useState({ campaign_id: '', platform: '', week_start: '', followers_gained: 0, total_reach: 0, total_impressions: 0, total_engagement: 0, total_posts: 0, top_post_url: '' });
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();
    const n = (f: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [f]: e.target.type === 'number' ? Number(e.target.value) : e.target.value }));

    const selectedCampaign = campaigns.find(c => c.id === form.campaign_id);
    const availablePlatforms = selectedCampaign?.platforms || PLATFORMS;

    const handleSave = async () => {
        if (!form.campaign_id || !form.platform || !form.week_start) { toast({ title: 'Campaign, platform and week required', variant: 'destructive' }); return; }
        setSaving(true);
        try { await onSave(form); onClose(); setForm({ campaign_id: '', platform: '', week_start: '', followers_gained: 0, total_reach: 0, total_impressions: 0, total_engagement: 0, total_posts: 0, top_post_url: '' }); }
        catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
        finally { setSaving(false); }
    };

    return (
        <Dialog open={open} onOpenChange={o => !o && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Log Weekly Analytics</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 space-y-1.5">
                            <Label className="text-xs">Campaign *</Label>
                            <Select value={form.campaign_id} onValueChange={v => setForm(p => ({ ...p, campaign_id: v, platform: '' }))}>
                                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select campaign" /></SelectTrigger>
                                <SelectContent>{campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.campaign_name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Platform *</Label>
                            <Select value={form.platform} onValueChange={v => setForm(p => ({ ...p, platform: v }))}>
                                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Platform" /></SelectTrigger>
                                <SelectContent>{availablePlatforms.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Week Starting *</Label>
                            <Input type="date" value={form.week_start} onChange={n('week_start')} className="h-9 text-xs" />
                        </div>
                        {[
                            { label: 'Followers Gained', field: 'followers_gained' },
                            { label: 'Total Reach', field: 'total_reach' },
                            { label: 'Total Impressions', field: 'total_impressions' },
                            { label: 'Total Engagement', field: 'total_engagement' },
                            { label: 'Posts Published', field: 'total_posts' },
                        ].map(({ label, field }) => (
                            <div key={field} className="space-y-1.5">
                                <Label className="text-xs">{label}</Label>
                                <Input type="number" min={0} value={(form as any)[field]} onChange={n(field)} className="h-9 text-xs" />
                            </div>
                        ))}
                        <div className="col-span-2 space-y-1.5">
                            <Label className="text-xs">Top Post URL</Label>
                            <Input value={form.top_post_url} onChange={n('top_post_url')} placeholder="https://..." className="h-9 text-xs" />
                        </div>
                    </div>
                    <Button onClick={handleSave} disabled={saving} className="w-full">
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Log Analytics'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const SMMDashboard = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const {
        loading, profile, campaigns, posts, analytics, stats, contracts, submissions,
        createCampaign, updateCampaign, deleteCampaign, createPost, updatePost, logAnalytics,
    } = useSmmDashboard();

    const [campaignModal, setCampaignModal] = useState<{ open: boolean; initial?: Partial<SmmCampaign> }>({ open: false });
    const [postModal, setPostModal] = useState(false);
    const [analyticsModal, setAnalyticsModal] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<SmmCampaign | null>(null);
    const [tab, setTab] = useState('overview');

    const handleDeleteCampaign = async (id: string) => {
        try { await deleteCampaign(id); toast({ title: 'Campaign deleted' }); if (selectedCampaign?.id === id) setSelectedCampaign(null); }
        catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    };

    const campaignPosts = selectedCampaign ? posts.filter(p => p.campaign_id === selectedCampaign.id) : [];
    const campaignAnalytics = selectedCampaign ? analytics.filter(a => a.campaign_id === selectedCampaign.id) : [];

    if (loading) {
        return (
            <DashboardLayout>
                <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
                    <Skeleton className="h-10 w-64" />
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
                    <Skeleton className="h-[400px] rounded-2xl" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                        <div>
                            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Welcome back</p>
                            <h1 className="text-2xl sm:text-3xl font-heading font-bold">
                                {profile?.full_name?.split(' ')[0] || 'SMM'} <span className="text-gradient">✦</span>
                            </h1>
                            <Badge variant="outline" className="mt-2 text-[10px] gap-1.5">
                                <Share2 className="w-3 h-3" /> Social Media Manager
                            </Badge>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => navigate('/messages')}>
                                <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Messages
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => navigate('/edit-profile')}>
                                <Settings className="w-3.5 h-3.5 mr-1.5" /> Profile
                            </Button>
                            <Button size="sm" className="text-xs" onClick={() => setCampaignModal({ open: true })}>
                                <Plus className="w-3.5 h-3.5 mr-1.5" /> New Campaign
                            </Button>
                        </div>
                    </div>
                </motion.div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                    {[
                        { label: 'Active Campaigns', value: stats.activeCampaigns, sub: 'running now', icon: Zap, color: 'text-primary' },
                        { label: 'Posts Published', value: stats.totalPosts, sub: 'all time', icon: Share2, color: 'text-pink-400' },
                        { label: 'Total Reach', value: stats.totalReach.toLocaleString(), sub: 'across campaigns', icon: Users, color: 'text-sky-400' },
                        { label: 'Pending Reviews', value: stats.pendingSubmissions, sub: 'submissions', icon: FileCheck, color: 'text-amber-400' },
                    ].map((s, i) => (
                        <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-4 sm:p-5 hover:border-primary/20 transition-all h-full">
                                <div className="flex items-center justify-between mb-3">
                                    <s.icon className={`w-5 h-5 ${s.color}`} />
                                </div>
                                <p className="text-2xl sm:text-3xl font-heading font-bold tracking-tight">{s.value}</p>
                                <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
                                <p className="text-[10px] text-primary mt-0.5 font-medium">{s.sub}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Main Tabs */}
                <Tabs value={tab} onValueChange={setTab}>
                    <TabsList className="mb-6 h-9 text-xs">
                        <TabsTrigger value="overview"><TrendingUp className="w-3.5 h-3.5 mr-1.5" />Overview</TabsTrigger>
                        <TabsTrigger value="campaigns"><Target className="w-3.5 h-3.5 mr-1.5" />Campaigns</TabsTrigger>
                        <TabsTrigger value="contracts"><Briefcase className="w-3.5 h-3.5 mr-1.5" />Contracts</TabsTrigger>
                        <TabsTrigger value="submissions"><FileCheck className="w-3.5 h-3.5 mr-1.5" />Submissions</TabsTrigger>
                    </TabsList>

                    {/* ── Overview Tab ─────────────────────────────────────────────── */}
                    <TabsContent value="overview">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Recent Campaigns */}
                            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-sm font-heading font-bold">Recent Campaigns</h2>
                                    <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setTab('campaigns')}>View all <ChevronRight className="w-3.5 h-3.5 ml-1" /></Button>
                                </div>
                                {campaigns.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Target className="w-8 h-8 text-muted mx-auto mb-2" />
                                        <p className="text-xs text-muted-foreground">No campaigns yet</p>
                                        <Button size="sm" className="mt-3 text-xs" onClick={() => setCampaignModal({ open: true })}>Create your first campaign</Button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {campaigns.slice(0, 5).map(c => (
                                            <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-background/40 hover:bg-background/60 transition-colors cursor-pointer" onClick={() => { setSelectedCampaign(c); setTab('campaigns'); }}>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold truncate">{c.campaign_name}</p>
                                                    <p className="text-[10px] text-muted-foreground">{c.client_name || 'No client'} · {c.platforms.join(', ')}</p>
                                                </div>
                                                <Badge variant="outline" className={`text-[9px] shrink-0 ${STATUS_COLORS[c.status]}`}>{c.status}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>

                            {/* Recent Posts */}
                            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-sm font-heading font-bold">Recent Posts</h2>
                                    <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setPostModal(true)}>
                                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Post
                                    </Button>
                                </div>
                                {posts.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Share2 className="w-8 h-8 text-muted mx-auto mb-2" />
                                        <p className="text-xs text-muted-foreground">No posts logged yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {posts.slice(0, 6).map(p => (
                                            <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-background/40">
                                                <Badge variant="outline" className={`text-[9px] shrink-0 capitalize ${PLATFORM_COLORS[p.platform] || ''}`}>{p.platform}</Badge>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] text-muted-foreground truncate">{p.caption || 'No caption'}</p>
                                                    <p className="text-[9px] text-muted-foreground">{p.post_type} · {p.scheduled_at ? new Date(p.scheduled_at).toLocaleDateString() : 'No date'}</p>
                                                </div>
                                                <Badge variant="outline" className={`text-[9px] shrink-0 capitalize ${STATUS_COLORS[p.status]}`}>{p.status}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>

                            {/* Analytics Summary */}
                            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-sm font-heading font-bold">Analytics Snapshots</h2>
                                    <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setAnalyticsModal(true)}>
                                        <Plus className="w-3.5 h-3.5 mr-1" /> Log Week
                                    </Button>
                                </div>
                                {analytics.length === 0 ? (
                                    <div className="text-center py-8">
                                        <BarChart2 className="w-8 h-8 text-muted mx-auto mb-2" />
                                        <p className="text-xs text-muted-foreground">No analytics logged yet</p>
                                        <Button size="sm" className="mt-3 text-xs" onClick={() => setAnalyticsModal(true)}>Log your first week</Button>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-border/40">
                                                    {['Platform', 'Week', 'Followers', 'Reach', 'Impressions', 'Engagement', 'Posts'].map(h => (
                                                        <th key={h} className="text-left pb-2 pr-4 text-[10px] text-muted-foreground font-medium">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/20">
                                                {analytics.slice(0, 8).map(a => (
                                                    <tr key={a.id} className="hover:bg-muted/10 transition-colors">
                                                        <td className="py-2 pr-4"><Badge variant="outline" className={`text-[9px] capitalize ${PLATFORM_COLORS[a.platform] || ''}`}>{a.platform}</Badge></td>
                                                        <td className="py-2 pr-4 text-muted-foreground">{a.week_start}</td>
                                                        <td className="py-2 pr-4 font-medium text-emerald-400">+{a.followers_gained.toLocaleString()}</td>
                                                        <td className="py-2 pr-4">{a.total_reach.toLocaleString()}</td>
                                                        <td className="py-2 pr-4">{a.total_impressions.toLocaleString()}</td>
                                                        <td className="py-2 pr-4">{a.total_engagement.toLocaleString()}</td>
                                                        <td className="py-2 pr-4">{a.total_posts}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    </TabsContent>

                    {/* ── Campaigns Tab ─────────────────────────────────────────────── */}
                    <TabsContent value="campaigns">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Campaign List */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-heading font-bold">All Campaigns</h2>
                                    <Button size="sm" className="text-xs h-8" onClick={() => setCampaignModal({ open: true })}>
                                        <Plus className="w-3.5 h-3.5 mr-1" /> New
                                    </Button>
                                </div>
                                {campaigns.length === 0 ? (
                                    <div className="rounded-2xl border border-border/60 bg-card/40 p-8 text-center">
                                        <Target className="w-8 h-8 text-muted mx-auto mb-2" />
                                        <p className="text-xs text-muted-foreground">No campaigns yet</p>
                                    </div>
                                ) : (
                                    campaigns.map(c => (
                                        <div key={c.id} onClick={() => setSelectedCampaign(c)}
                                            className={`rounded-2xl border p-4 cursor-pointer transition-all ${selectedCampaign?.id === c.id ? 'border-primary/40 bg-primary/5' : 'border-border/60 bg-card/40 hover:bg-card/60 hover:border-border'}`}>
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold truncate">{c.campaign_name}</p>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5">{c.client_name || 'No client set'}</p>
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {c.platforms.slice(0, 3).map(p => (
                                                            <Badge key={p} variant="outline" className={`text-[8px] py-0 capitalize ${PLATFORM_COLORS[p] || ''}`}>{p}</Badge>
                                                        ))}
                                                        {c.platforms.length > 3 && <Badge variant="outline" className="text-[8px] py-0">+{c.platforms.length - 3}</Badge>}
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className={`text-[9px] shrink-0 capitalize ${STATUS_COLORS[c.status]}`}>{c.status}</Badge>
                                            </div>
                                            {(c.start_date || c.end_date) && (
                                                <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                                                    <Calendar className="w-3 h-3" />
                                                    {c.start_date && new Date(c.start_date).toLocaleDateString()} — {c.end_date ? new Date(c.end_date).toLocaleDateString() : 'Ongoing'}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Campaign Detail */}
                            <div className="lg:col-span-2">
                                {selectedCampaign ? (
                                    <div className="space-y-4">
                                        <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5">
                                            <div className="flex items-start justify-between gap-4 mb-4">
                                                <div>
                                                    <h2 className="text-lg font-heading font-bold">{selectedCampaign.campaign_name}</h2>
                                                    {selectedCampaign.client_name && <p className="text-xs text-muted-foreground">{selectedCampaign.client_name}</p>}
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setCampaignModal({ open: true, initial: selectedCampaign })}>
                                                        <Edit2 className="w-3 h-3 mr-1" /> Edit
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleDeleteCampaign(selectedCampaign.id)}>
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                                <div className="rounded-xl bg-background/40 p-3 text-center">
                                                    <p className="text-lg font-bold text-primary">{campaignPosts.filter(p => p.status === 'posted').length}</p>
                                                    <p className="text-[10px] text-muted-foreground">Posted</p>
                                                </div>
                                                <div className="rounded-xl bg-background/40 p-3 text-center">
                                                    <p className="text-lg font-bold text-sky-400">{campaignPosts.filter(p => p.status === 'scheduled').length}</p>
                                                    <p className="text-[10px] text-muted-foreground">Scheduled</p>
                                                </div>
                                                <div className="rounded-xl bg-background/40 p-3 text-center">
                                                    <p className="text-lg font-bold text-emerald-400">{campaignAnalytics.reduce((s, a) => s + a.followers_gained, 0).toLocaleString()}</p>
                                                    <p className="text-[10px] text-muted-foreground">Followers</p>
                                                </div>
                                                <div className="rounded-xl bg-background/40 p-3 text-center">
                                                    <p className="text-lg font-bold">{campaignAnalytics.reduce((s, a) => s + a.total_reach, 0).toLocaleString()}</p>
                                                    <p className="text-[10px] text-muted-foreground">Total Reach</p>
                                                </div>
                                            </div>
                                            {selectedCampaign.notes && (
                                                <div className="rounded-xl bg-background/40 p-3">
                                                    <p className="text-[10px] text-muted-foreground font-medium mb-1">Notes</p>
                                                    <p className="text-xs">{selectedCampaign.notes}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Posts for campaign */}
                                        <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-sm font-heading font-bold">Posts</h3>
                                                <Button size="sm" className="h-8 text-xs" onClick={() => setPostModal(true)}>
                                                    <Plus className="w-3 h-3 mr-1" /> Add Post
                                                </Button>
                                            </div>
                                            {campaignPosts.length === 0 ? (
                                                <div className="text-center py-6">
                                                    <Share2 className="w-7 h-7 text-muted mx-auto mb-2" />
                                                    <p className="text-xs text-muted-foreground">No posts logged for this campaign</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                                    {campaignPosts.map(p => (
                                                        <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-background/40">
                                                            <Badge variant="outline" className={`text-[9px] shrink-0 capitalize ${PLATFORM_COLORS[p.platform] || ''}`}>{p.platform}</Badge>
                                                            <Badge variant="outline" className="text-[9px] shrink-0 capitalize">{p.post_type}</Badge>
                                                            <p className="text-[10px] text-muted-foreground flex-1 truncate">{p.caption || 'No caption'}</p>
                                                            <Badge variant="outline" className={`text-[9px] shrink-0 capitalize ${STATUS_COLORS[p.status]}`}>{p.status}</Badge>
                                                            {p.media_url && (
                                                                <a href={p.media_url} target="_blank" rel="noreferrer">
                                                                    <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-primary transition-colors" />
                                                                </a>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Analytics for campaign */}
                                        <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-sm font-heading font-bold">Weekly Analytics</h3>
                                                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setAnalyticsModal(true)}>
                                                    <Plus className="w-3 h-3 mr-1" /> Log Week
                                                </Button>
                                            </div>
                                            {campaignAnalytics.length === 0 ? (
                                                <div className="text-center py-6">
                                                    <BarChart2 className="w-7 h-7 text-muted mx-auto mb-2" />
                                                    <p className="text-xs text-muted-foreground">No analytics logged</p>
                                                </div>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs">
                                                        <thead>
                                                            <tr className="border-b border-border/40">
                                                                {['Platform', 'Week', '+Followers', 'Reach', 'Engagement'].map(h => (
                                                                    <th key={h} className="text-left pb-2 pr-3 text-[10px] text-muted-foreground font-medium">{h}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-border/20">
                                                            {campaignAnalytics.map(a => (
                                                                <tr key={a.id}>
                                                                    <td className="py-2 pr-3"><Badge variant="outline" className={`text-[9px] capitalize ${PLATFORM_COLORS[a.platform] || ''}`}>{a.platform}</Badge></td>
                                                                    <td className="py-2 pr-3 text-muted-foreground text-[10px]">{a.week_start}</td>
                                                                    <td className="py-2 pr-3 text-emerald-400 font-medium">+{a.followers_gained.toLocaleString()}</td>
                                                                    <td className="py-2 pr-3">{a.total_reach.toLocaleString()}</td>
                                                                    <td className="py-2">{a.total_engagement.toLocaleString()}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-12 text-center h-full flex flex-col items-center justify-center">
                                        <Target className="w-12 h-12 text-muted mb-4" />
                                        <p className="text-sm text-muted-foreground">Select a campaign to view details</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {/* ── Contracts Tab ─────────────────────────────────────────────── */}
                    <TabsContent value="contracts">
                        <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5">
                            <div className="mb-4">
                                <h2 className="text-sm font-heading font-bold">Available Social Media Contracts</h2>
                                <p className="text-xs text-muted-foreground mt-1">Active contracts in the social-media category</p>
                            </div>
                            {contracts.length === 0 ? (
                                <div className="text-center py-12">
                                    <Briefcase className="w-10 h-10 text-muted mx-auto mb-3" />
                                    <p className="text-sm text-muted-foreground">No active social media contracts right now</p>
                                    <p className="text-xs text-muted-foreground mt-1">Check back soon — admins post new work regularly</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {contracts.map(c => (
                                        <div key={c.id} className="flex items-center gap-4 p-4 rounded-xl bg-background/40 border border-border/40 hover:border-primary/20 transition-colors">
                                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                <Globe className="w-4 h-4 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold">{c.title}</p>
                                                <p className="text-[10px] text-muted-foreground capitalize">{c.category} · {c.status}</p>
                                            </div>
                                            <Button size="sm" variant="outline" className="text-xs h-8 shrink-0" onClick={() => { setCampaignModal({ open: true, initial: { contract_id: c.id, campaign_name: c.title } }); }}>
                                                Start Campaign
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* ── Submissions Tab ───────────────────────────────────────────── */}
                    <TabsContent value="submissions">
                        <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-sm font-heading font-bold">Submission History</h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">All your submitted work</p>
                                </div>
                                <Button size="sm" className="text-xs h-8" onClick={() => navigate('/submit-work')}>
                                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Submit Work
                                </Button>
                            </div>
                            {submissions.length === 0 ? (
                                <div className="text-center py-12">
                                    <FileCheck className="w-10 h-10 text-muted mx-auto mb-3" />
                                    <p className="text-sm text-muted-foreground">No submissions yet</p>
                                    <Button size="sm" className="mt-4 text-xs" onClick={() => navigate('/submit-work')}>Submit your first work</Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {submissions.map(s => (
                                        <div key={s.id} className="flex items-center gap-4 p-4 rounded-xl bg-background/40 border border-border/30">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold truncate">{s.project_name}</p>
                                                <p className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</p>
                                            </div>
                                            {s.points_awarded > 0 && (
                                                <span className="text-xs font-bold text-primary shrink-0">+{s.points_awarded} pts</span>
                                            )}
                                            <Badge variant="outline" className={`text-[9px] capitalize shrink-0 ${STATUS_COLORS[s.status] || ''}`}>{s.status}</Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Modals */}
            <CampaignModal
                open={campaignModal.open}
                onClose={() => setCampaignModal({ open: false })}
                initial={campaignModal.initial}
                contracts={contracts}
                onSave={async data => {
                    if (campaignModal.initial?.id) {
                        await updateCampaign(campaignModal.initial.id, data);
                        setSelectedCampaign(prev => prev ? { ...prev, ...data } : prev);
                        toast({ title: 'Campaign updated' });
                    } else {
                        const created = await createCampaign(data);
                        if (created) setSelectedCampaign(created);
                        toast({ title: 'Campaign created! 🎉' });
                    }
                }}
            />
            <PostModal
                open={postModal}
                onClose={() => setPostModal(false)}
                campaigns={campaigns}
                onSave={async data => { await createPost(data); toast({ title: 'Post logged' }); }}
            />
            <AnalyticsModal
                open={analyticsModal}
                onClose={() => setAnalyticsModal(false)}
                campaigns={campaigns}
                onSave={async data => { await logAnalytics(data); toast({ title: 'Analytics logged' }); }}
            />
        </DashboardLayout>
    );
};

export default SMMDashboard;
