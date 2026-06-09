import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, BarChart2, Calendar, ChevronRight, Download, Edit2, Image as ImageIcon,
    Instagram, Link2, Loader2, Plus, Radio, Search, Settings, Sparkles, Trash2,
    TrendingUp, Upload, Users, Zap,
} from 'lucide-react';
import { format, formatDistanceToNow, parseISO, startOfMonth, startOfWeek, addDays, addMonths, subMonths, isSameDay, isSameMonth } from 'date-fns';
import {
    DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors,
    useDraggable, useDroppable,
} from '@dnd-kit/core';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
    Legend, CartesianGrid,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/DashboardLayout';
import { useSmmDashboard, SmmCampaign, SmmPost, SmmAnalytics } from '@/hooks/useSmmDashboard';

const PLATFORMS = ['instagram', 'facebook', 'tiktok', 'x', 'linkedin', 'youtube'];
const GOALS = ['awareness', 'engagement', 'conversion', 'leads', 'sales', 'community'];
const POST_TYPES = ['post', 'story', 'reel', 'ad', 'thread'];
const POST_STATUSES: PostStatus[] = ['draft', 'scheduled', 'posted', 'cancelled'];
type PostStatus = 'draft' | 'scheduled' | 'posted' | 'cancelled';

const PLATFORM_COLORS: Record<string, string> = {
    instagram: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    facebook: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    tiktok: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
    x: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20',
    linkedin: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    youtube: 'bg-red-500/10 text-red-400 border-red-500/20',
};
const PLATFORM_DOT: Record<string, string> = {
    instagram: 'bg-pink-500', facebook: 'bg-blue-500', tiktok: 'bg-slate-400',
    x: 'bg-zinc-400', linkedin: 'bg-sky-500', youtube: 'bg-red-500',
};
const PLATFORM_HEX: Record<string, string> = {
    instagram: '#ec4899', facebook: '#3b82f6', tiktok: '#94a3b8',
    x: '#a1a1aa', linkedin: '#0ea5e9', youtube: '#ef4444',
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

const fmtNum = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toString();
};

// ───────── Campaign Modal ─────────
const CampaignModal = ({ open, onClose, onSave, initial, contracts }: {
    open: boolean; onClose: () => void;
    onSave: (data: Partial<SmmCampaign>) => Promise<void>;
    initial?: Partial<SmmCampaign>; contracts: { id: string; title: string }[];
}) => {
    const [form, setForm] = useState<Partial<SmmCampaign>>(initial || {
        campaign_name: '', client_name: '', platforms: [], goal: '', status: 'active', notes: '',
    });
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();
    const togglePlatform = (p: string) =>
        setForm(f => ({ ...f, platforms: f.platforms?.includes(p) ? f.platforms.filter(x => x !== p) : [...(f.platforms || []), p] }));
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
                <div className="space-y-3 mt-2">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 space-y-1.5">
                            <Label className="text-xs">Campaign Name *</Label>
                            <Input value={form.campaign_name || ''} onChange={e => setForm(f => ({ ...f, campaign_name: e.target.value }))} className="h-9 text-xs" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Client</Label>
                            <Input value={form.client_name || ''} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} className="h-9 text-xs" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Goal</Label>
                            <Select value={form.goal || ''} onValueChange={v => setForm(f => ({ ...f, goal: v }))}>
                                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select goal" /></SelectTrigger>
                                <SelectContent>{GOALS.map(g => <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Status</Label>
                            <Select value={form.status || 'active'} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>{['active', 'paused', 'completed', 'archived'].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Start</Label>
                            <Input type="date" value={form.start_date || ''} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="h-9 text-xs" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">End</Label>
                            <Input type="date" value={form.end_date || ''} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="h-9 text-xs" />
                        </div>
                        {contracts.length > 0 && (
                            <div className="col-span-2 space-y-1.5">
                                <Label className="text-xs">Linked Contract</Label>
                                <Select value={form.contract_id || 'none'} onValueChange={v => setForm(f => ({ ...f, contract_id: v === 'none' ? null : v }))}>
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
                            <Textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="text-xs resize-none h-20" />
                        </div>
                    </div>
                    <Button onClick={handleSave} disabled={saving} className="w-full">
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : initial?.id ? 'Update' : 'Create'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// ───────── Post Modal ─────────
const PostModal = ({ open, onClose, onSave, campaigns, uploadMedia, initial }: {
    open: boolean; onClose: () => void;
    onSave: (data: Partial<SmmPost>) => Promise<void>;
    campaigns: SmmCampaign[];
    uploadMedia: (f: File) => Promise<string>;
    initial?: Partial<SmmPost>;
}) => {
    const [form, setForm] = useState<Partial<SmmPost>>(initial || { platform: '', post_type: 'post', status: 'draft', caption: '', media_url: '' });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [hashtags, setHashtags] = useState('');
    const { toast } = useToast();
    const handleSave = async () => {
        if (!form.campaign_id) { toast({ title: 'Pick a campaign', variant: 'destructive' }); return; }
        if (!form.platform) { toast({ title: 'Pick a platform', variant: 'destructive' }); return; }
        setSaving(true);
        try {
            const caption = `${form.caption || ''}${hashtags ? '\n\n' + hashtags.split(/\s+/).filter(Boolean).map(t => t.startsWith('#') ? t : `#${t}`).join(' ') : ''}`;
            await onSave({ ...form, caption });
            onClose();
            setForm({ platform: '', post_type: 'post', status: 'draft', caption: '', media_url: '' });
            setHashtags('');
        } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
        finally { setSaving(false); }
    };
    const handleFile = async (file: File) => {
        setUploading(true);
        try {
            const url = await uploadMedia(file);
            setForm(f => ({ ...f, media_url: url }));
        } catch (e: any) { toast({ title: 'Upload failed', description: e.message, variant: 'destructive' }); }
        finally { setUploading(false); }
    };
    return (
        <Dialog open={open} onOpenChange={o => !o && onClose()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>{initial?.id ? 'Edit Post' : 'New Post'}</DialogTitle></DialogHeader>
                <div className="grid md:grid-cols-2 gap-4 mt-2">
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Campaign *</Label>
                            <Select value={form.campaign_id || ''} onValueChange={v => setForm(f => ({ ...f, campaign_id: v }))}>
                                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select campaign" /></SelectTrigger>
                                <SelectContent>{campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.campaign_name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Platform *</Label>
                                <Select value={form.platform || ''} onValueChange={v => setForm(f => ({ ...f, platform: v }))}>
                                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Platform" /></SelectTrigger>
                                    <SelectContent>{PLATFORMS.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Type</Label>
                                <Select value={form.post_type || 'post'} onValueChange={v => setForm(f => ({ ...f, post_type: v }))}>
                                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>{POST_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Caption</Label>
                            <Textarea value={form.caption || ''} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))} className="text-xs resize-none h-24" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Hashtags</Label>
                            <Textarea value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="space separated, # optional" className="text-xs resize-none h-16" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Media</Label>
                            <div className="flex items-center gap-2">
                                <Input type="file" accept="image/*,video/*" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} className="h-9 text-xs" disabled={uploading} />
                                {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                            </div>
                            {form.media_url && <a href={form.media_url} target="_blank" rel="noreferrer" className="text-[10px] text-primary underline break-all">{form.media_url}</a>}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Schedule</Label>
                                <Input type="datetime-local" value={form.scheduled_at?.slice(0, 16) || ''} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} className="h-9 text-xs" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Status</Label>
                                <Select value={form.status || 'draft'} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>{POST_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs">Preview ({form.platform || 'platform'})</Label>
                        <div className="rounded-lg border border-border bg-card/40 overflow-hidden">
                            {form.media_url && (form.media_url.match(/\.(mp4|webm)/i) ? (
                                <video src={form.media_url} className="w-full max-h-60 bg-black" controls />
                            ) : (
                                <img src={form.media_url} alt="" className="w-full max-h-60 object-cover" />
                            ))}
                            <div className="p-3 space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2.5 h-2.5 rounded-full ${PLATFORM_DOT[form.platform || ''] || 'bg-muted-foreground'}`} />
                                    <span className="text-xs font-semibold capitalize">{form.platform || 'platform'}</span>
                                    <Badge variant="outline" className="text-[10px] capitalize ml-auto">{form.post_type}</Badge>
                                </div>
                                <p className="text-xs whitespace-pre-wrap leading-relaxed">{form.caption || 'Your caption appears here…'}</p>
                                {hashtags && <p className="text-[10px] text-primary">{hashtags.split(/\s+/).filter(Boolean).map(t => t.startsWith('#') ? t : `#${t}`).join(' ')}</p>}
                            </div>
                        </div>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full mt-3">
                    {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save Post'}
                </Button>
            </DialogContent>
        </Dialog>
    );
};

// ───────── Analytics Modal ─────────
const AnalyticsModal = ({ open, onClose, onSave, campaigns }: {
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
        if (!form.campaign_id || !form.platform || !form.week_start) { toast({ title: 'Campaign, platform & week required', variant: 'destructive' }); return; }
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
                            { label: 'Followers Gained', f: 'followers_gained' }, { label: 'Total Reach', f: 'total_reach' },
                            { label: 'Total Impressions', f: 'total_impressions' }, { label: 'Total Engagement', f: 'total_engagement' },
                            { label: 'Posts Published', f: 'total_posts' },
                        ].map(({ label, f }) => (
                            <div key={f} className="space-y-1.5">
                                <Label className="text-xs">{label}</Label>
                                <Input type="number" value={(form as any)[f]} onChange={n(f)} className="h-9 text-xs" />
                            </div>
                        ))}
                    </div>
                    <Button onClick={handleSave} disabled={saving} className="w-full">
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : 'Save Analytics'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// ───────── Platform Connect Modal ─────────
const PlatformConnectModal = ({ open, onClose, platform, onConnect }: {
    open: boolean; onClose: () => void; platform: string;
    onConnect: (platform: string, accountName: string) => Promise<void>;
}) => {
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const { toast } = useToast();
    const submit = async () => {
        if (!name.trim()) return;
        setBusy(true);
        try {
            console.log(`OAuth flow would start here for ${platform}`);
            await onConnect(platform, name.trim());
            toast({ title: `${platform} connected (mock)` });
            onClose();
            setName('');
        } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
        finally { setBusy(false); }
    };
    return (
        <Dialog open={open} onOpenChange={o => !o && onClose()}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="capitalize flex items-center gap-2"><Link2 className="w-4 h-4" />Connect {platform}</DialogTitle>
                    <DialogDescription className="text-xs">OAuth integration is coming. For now, enter your handle to mark this platform as connected.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 mt-2">
                    <Input placeholder="@handle or account name" value={name} onChange={e => setName(e.target.value)} className="h-9 text-xs" />
                    <Button onClick={submit} disabled={busy || !name.trim()} className="w-full">
                        {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Connecting…</> : 'Authorize'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// ───────── Stat Card ─────────
const StatCard = ({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string | number; hint?: string }) => (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border/50 bg-card/40 p-4 backdrop-blur">
        <div className="flex items-center gap-2 text-muted-foreground"><Icon className="w-3.5 h-3.5" /><span className="text-[11px] uppercase tracking-wider font-semibold">{label}</span></div>
        <p className="text-2xl font-bold mt-1.5">{value}</p>
        {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </motion.div>
);

// ───────── Kanban draggable post ─────────
const KanbanCard = ({ post }: { post: SmmPost }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: post.id });
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
    return (
        <div ref={setNodeRef} {...listeners} {...attributes} style={style}
            className={`rounded-lg border border-border/50 bg-card p-2.5 cursor-grab active:cursor-grabbing text-xs space-y-1.5 ${isDragging ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-1.5">
                <Badge variant="outline" className={`text-[9px] capitalize ${PLATFORM_COLORS[post.platform]}`}>{post.platform}</Badge>
                <Badge variant="outline" className="text-[9px] capitalize">{post.post_type}</Badge>
            </div>
            {post.media_url && (
                <div className="aspect-video rounded bg-muted overflow-hidden">
                    {/\.(mp4|webm)/i.test(post.media_url) ? <video src={post.media_url} className="w-full h-full object-cover" /> : <img src={post.media_url} alt="" className="w-full h-full object-cover" />}
                </div>
            )}
            <p className="line-clamp-3 text-[11px]">{post.caption || <span className="text-muted-foreground italic">No caption</span>}</p>
            {post.scheduled_at && <p className="text-[10px] text-muted-foreground">{format(new Date(post.scheduled_at), 'MMM d, HH:mm')}</p>}
        </div>
    );
};
const KanbanColumn = ({ status, posts }: { status: PostStatus; posts: SmmPost[] }) => {
    const { setNodeRef, isOver } = useDroppable({ id: status });
    return (
        <div ref={setNodeRef} className={`rounded-xl border bg-card/30 p-3 min-h-[300px] transition-colors ${isOver ? 'border-primary/60 bg-primary/5' : 'border-border/50'}`}>
            <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_COLORS[status]}`}>{status}</Badge>
                <span className="text-[10px] text-muted-foreground">{posts.length}</span>
            </div>
            <div className="space-y-2">{posts.map(p => <KanbanCard key={p.id} post={p} />)}</div>
        </div>
    );
};

// ───────── Main page ─────────
export default function SMMDashboard() {
    const dash = useSmmDashboard();
    const { toast } = useToast();
    const [campaignModal, setCampaignModal] = useState<{ open: boolean; initial?: Partial<SmmCampaign> }>({ open: false });
    const [postModal, setPostModal] = useState(false);
    const [analyticsModal, setAnalyticsModal] = useState(false);
    const [connectModal, setConnectModal] = useState<{ open: boolean; platform: string }>({ open: false, platform: '' });
    const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
    const [campSearch, setCampSearch] = useState('');
    const [campStatusFilter, setCampStatusFilter] = useState('all');
    const [postSearch, setPostSearch] = useState('');
    const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
    const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
    const [calMonth, setCalMonth] = useState(startOfMonth(new Date()));
    const [calPlatforms, setCalPlatforms] = useState<string[]>([]);
    const [analyticsRange, setAnalyticsRange] = useState<'7d' | '30d' | '90d'>('30d');
    const [analyticsPlatform, setAnalyticsPlatform] = useState<string>('all');
    const [draggingPost, setDraggingPost] = useState<SmmPost | null>(null);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

    const selectedCampaign = useMemo(() => dash.campaigns.find(c => c.id === selectedCampaignId) || dash.campaigns[0], [dash.campaigns, selectedCampaignId]);
    const filteredCampaigns = useMemo(() =>
        dash.campaigns.filter(c =>
            (campStatusFilter === 'all' || c.status === campStatusFilter) &&
            (!campSearch.trim() || c.campaign_name.toLowerCase().includes(campSearch.toLowerCase()) || (c.client_name || '').toLowerCase().includes(campSearch.toLowerCase()))
        ),
        [dash.campaigns, campSearch, campStatusFilter]);

    const postsForCampaign = useMemo(() => dash.posts.filter(p => p.campaign_id === selectedCampaign?.id), [dash.posts, selectedCampaign]);
    const analyticsForCampaign = useMemo(() => dash.analytics.filter(a => a.campaign_id === selectedCampaign?.id), [dash.analytics, selectedCampaign]);

    const handleDragStart = (e: DragStartEvent) => {
        const post = dash.posts.find(p => p.id === e.active.id);
        if (post) setDraggingPost(post);
    };
    const handleDragEnd = async (e: DragEndEvent) => {
        setDraggingPost(null);
        const newStatus = e.over?.id as PostStatus | undefined;
        if (!newStatus) return;
        const post = dash.posts.find(p => p.id === e.active.id);
        if (!post || post.status === newStatus) return;
        try {
            await dash.updatePost(post.id, { status: newStatus, posted_at: newStatus === 'posted' ? new Date().toISOString() : post.posted_at });
        } catch (err: any) { toast({ title: 'Update failed', description: err.message, variant: 'destructive' }); }
    };

    const upcomingPosts = useMemo(() =>
        dash.posts.filter(p => p.status === 'scheduled' && p.scheduled_at && new Date(p.scheduled_at) > new Date())
            .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())
            .slice(0, 7),
        [dash.posts]);

    const recentCampaigns = dash.campaigns.slice(0, 5);

    // Calendar grid
    const calDays = useMemo(() => {
        const start = startOfWeek(startOfMonth(calMonth), { weekStartsOn: 0 });
        return Array.from({ length: 42 }, (_, i) => addDays(start, i));
    }, [calMonth]);
    const calPosts = useMemo(() => {
        return dash.posts.filter(p => {
            const d = p.scheduled_at || p.posted_at;
            if (!d) return false;
            if (calPlatforms.length && !calPlatforms.includes(p.platform)) return false;
            return true;
        });
    }, [dash.posts, calPlatforms]);

    // Post manager
    const filteredPosts = useMemo(() => dash.posts.filter(p => !postSearch.trim() || (p.caption || '').toLowerCase().includes(postSearch.toLowerCase())), [dash.posts, postSearch]);
    const toggleSelected = (id: string) => setSelectedPostIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const bulkUpdate = async (status: PostStatus) => {
        for (const id of selectedPostIds) {
            try { await dash.updatePost(id, { status, posted_at: status === 'posted' ? new Date().toISOString() : null }); } catch { }
        }
        setSelectedPostIds(new Set());
        toast({ title: `Updated ${selectedPostIds.size} posts` });
    };

    // Analytics tab
    const rangeStart = useMemo(() => {
        const days = analyticsRange === '7d' ? 7 : analyticsRange === '30d' ? 30 : 90;
        const d = new Date(); d.setDate(d.getDate() - days); return d;
    }, [analyticsRange]);
    const analyticsFiltered = useMemo(() =>
        dash.analytics.filter(a => new Date(a.week_start) >= rangeStart && (analyticsPlatform === 'all' || a.platform === analyticsPlatform)),
        [dash.analytics, rangeStart, analyticsPlatform]);
    const followersSeries = useMemo(() => {
        const map = new Map<string, any>();
        analyticsFiltered.forEach(a => {
            const key = a.week_start;
            if (!map.has(key)) map.set(key, { week: key });
            const r = map.get(key);
            r[a.platform] = (r[a.platform] || 0) + (a.followers_gained || 0);
        });
        return Array.from(map.values()).sort((a, b) => a.week.localeCompare(b.week));
    }, [analyticsFiltered]);
    const reachBars = useMemo(() => {
        const map = new Map<string, any>();
        analyticsFiltered.forEach(a => {
            const key = a.week_start;
            if (!map.has(key)) map.set(key, { week: key, reach: 0, impressions: 0, engagement: 0 });
            const r = map.get(key);
            r.reach += a.total_reach || 0;
            r.impressions += a.total_impressions || 0;
            r.engagement += a.total_engagement || 0;
        });
        return Array.from(map.values()).sort((a, b) => a.week.localeCompare(b.week));
    }, [analyticsFiltered]);
    const topPosts = useMemo(() =>
        dash.posts.filter(p => p.status === 'posted')
            .map(p => ({ ...p, score: (p.likes || 0) + (p.comments || 0) + (p.shares || 0) }))
            .sort((a, b) => b.score - a.score).slice(0, 10),
        [dash.posts]);
    const exportCSV = () => {
        const rows = [['week', 'platform', 'followers_gained', 'reach', 'impressions', 'engagement', 'posts']];
        analyticsFiltered.forEach(a => rows.push([a.week_start, a.platform, String(a.followers_gained), String(a.total_reach), String(a.total_impressions), String(a.total_engagement), String(a.total_posts)]));
        const csv = rows.map(r => r.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `smm-analytics-${analyticsRange}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    if (dash.loading) {
        return (
            <DashboardLayout>
                <div className="space-y-4 p-4">
                    <Skeleton className="h-16 w-full" />
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
                    <Skeleton className="h-96 w-full" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-4 md:p-6 space-y-4 max-w-[1500px] mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold">SMM Studio</h1>
                            <span className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border ${dash.realtimeConnected ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-border bg-card/40 text-muted-foreground'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${dash.realtimeConnected ? 'bg-emerald-400 animate-pulse' : 'bg-muted-foreground'}`} />
                                {dash.realtimeConnected ? 'LIVE' : 'OFFLINE'}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{dash.profile?.full_name && `Welcome ${dash.profile.full_name} · `}Manage campaigns across all your platforms</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => setAnalyticsModal(true)}><BarChart2 className="w-4 h-4 mr-1.5" />Log Analytics</Button>
                        <Button size="sm" variant="outline" onClick={() => setPostModal(true)}><Plus className="w-4 h-4 mr-1.5" />Post</Button>
                        <Button size="sm" onClick={() => setCampaignModal({ open: true })}><Plus className="w-4 h-4 mr-1.5" />Campaign</Button>
                    </div>
                </div>

                {/* Live ticker */}
                <AnimatePresence>
                    {dash.liveEvents.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 flex items-center gap-2 overflow-hidden">
                            <Radio className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
                            <p className="text-xs text-emerald-300 truncate">{dash.liveEvents[0].label} <span className="text-emerald-200/60 ml-1">· {formatDistanceToNow(dash.liveEvents[0].at, { addSuffix: true })}</span></p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* KPI bar */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <StatCard icon={Sparkles} label="Active Campaigns" value={dash.stats.activeCampaigns} />
                    <StatCard icon={Calendar} label="Posts This Month" value={dash.stats.postsThisMonth} />
                    <StatCard icon={TrendingUp} label="Total Reach" value={fmtNum(dash.stats.totalReach)} />
                    <StatCard icon={Users} label="Followers Gained" value={fmtNum(dash.stats.followersGained)} />
                    <StatCard icon={Zap} label="Avg Engagement" value={`${dash.stats.avgEngagementRate.toFixed(1)}%`} />
                    <StatCard icon={Activity} label="Pending" value={dash.stats.pendingSubmissions} />
                </div>

                <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList className="grid grid-cols-5 w-full md:w-auto">
                        <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                        <TabsTrigger value="campaigns" className="text-xs">Campaigns</TabsTrigger>
                        <TabsTrigger value="calendar" className="text-xs">Calendar</TabsTrigger>
                        <TabsTrigger value="posts" className="text-xs">Posts</TabsTrigger>
                        <TabsTrigger value="analytics" className="text-xs">Analytics</TabsTrigger>
                    </TabsList>

                    {/* ── Overview ── */}
                    <TabsContent value="overview" className="space-y-4">
                        <div>
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Platform Health</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                {PLATFORMS.map(p => {
                                    const conn = dash.connections.find(c => c.platform === p);
                                    return (
                                        <Card key={p} className="bg-card/40 border-border/50">
                                            <CardContent className="p-3 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className={`w-2.5 h-2.5 rounded-full ${PLATFORM_DOT[p]}`} />
                                                        <span className="text-xs font-semibold capitalize">{p}</span>
                                                    </div>
                                                    <Badge variant="outline" className={`text-[9px] ${conn ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'border-border'}`}>
                                                        {conn ? 'Connected' : 'Not connected'}
                                                    </Badge>
                                                </div>
                                                <p className="text-lg font-bold">{fmtNum(conn?.followers_count || 0)}<span className="text-[10px] font-normal text-muted-foreground ml-1">followers</span></p>
                                                {conn ? (
                                                    <Button size="sm" variant="ghost" className="h-7 text-[10px] w-full" onClick={() => dash.disconnectPlatform(p)}>Disconnect</Button>
                                                ) : (
                                                    <Button size="sm" variant="outline" className="h-7 text-[10px] w-full" onClick={() => setConnectModal({ open: true, platform: p })}>Connect</Button>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <Card className="bg-card/40 border-border/50">
                                <CardContent className="p-4 space-y-2">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Campaigns</h3>
                                    {recentCampaigns.length === 0 && <p className="text-xs text-muted-foreground py-6 text-center">No campaigns yet.</p>}
                                    {recentCampaigns.map(c => (
                                        <button key={c.id} onClick={() => setSelectedCampaignId(c.id)} className="w-full flex items-center justify-between rounded-lg p-2.5 hover:bg-secondary text-left">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold truncate">{c.campaign_name}</p>
                                                <p className="text-[10px] text-muted-foreground">{c.client_name || 'No client'}</p>
                                            </div>
                                            <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_COLORS[c.status]}`}>{c.status}</Badge>
                                        </button>
                                    ))}
                                </CardContent>
                            </Card>
                            <Card className="bg-card/40 border-border/50">
                                <CardContent className="p-4 space-y-2">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Upcoming Posts (next 7)</h3>
                                    {upcomingPosts.length === 0 && <p className="text-xs text-muted-foreground py-6 text-center">Nothing scheduled.</p>}
                                    {upcomingPosts.map(p => (
                                        <div key={p.id} className="flex items-center gap-2 rounded-lg p-2.5 hover:bg-secondary">
                                            <div className={`w-2 h-2 rounded-full ${PLATFORM_DOT[p.platform]} shrink-0`} />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-medium truncate">{p.caption || '—'}</p>
                                                <p className="text-[10px] text-muted-foreground">{format(new Date(p.scheduled_at!), 'MMM d · HH:mm')} · {p.post_type}</p>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="bg-card/40 border-border/50">
                            <CardContent className="p-4 space-y-2">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <Radio className="w-3 h-3 text-emerald-400" />Live Activity Feed
                                </h3>
                                {dash.liveEvents.length === 0 && <p className="text-xs text-muted-foreground py-6 text-center">Waiting for activity…</p>}
                                <AnimatePresence>
                                    {dash.liveEvents.slice(0, 10).map(ev => (
                                        <motion.div key={ev.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between text-xs py-1.5 border-b border-border/30 last:border-0">
                                            <span>{ev.label}</span>
                                            <span className="text-muted-foreground text-[10px]">{formatDistanceToNow(ev.at, { addSuffix: true })}</span>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ── Campaigns ── */}
                    <TabsContent value="campaigns" className="space-y-4">
                        <div className="grid lg:grid-cols-3 gap-4">
                            <Card className="bg-card/40 border-border/50 lg:col-span-1">
                                <CardContent className="p-3 space-y-2">
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                            <Input placeholder="Search…" value={campSearch} onChange={e => setCampSearch(e.target.value)} className="h-8 text-xs pl-7" />
                                        </div>
                                        <Select value={campStatusFilter} onValueChange={setCampStatusFilter}>
                                            <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All</SelectItem>
                                                {['active', 'paused', 'completed', 'archived'].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1 max-h-[600px] overflow-auto">
                                        {filteredCampaigns.map(c => (
                                            <button key={c.id} onClick={() => setSelectedCampaignId(c.id)}
                                                className={`w-full text-left rounded-lg p-2.5 border ${selectedCampaign?.id === c.id ? 'border-primary/50 bg-primary/5' : 'border-transparent hover:bg-secondary'}`}>
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-xs font-semibold truncate flex-1">{c.campaign_name}</p>
                                                    <Badge variant="outline" className={`text-[9px] capitalize ${STATUS_COLORS[c.status]}`}>{c.status}</Badge>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">{c.client_name || '—'}</p>
                                                <div className="flex gap-1 mt-1.5">{c.platforms.map(p => <span key={p} className={`w-1.5 h-1.5 rounded-full ${PLATFORM_DOT[p]}`} />)}</div>
                                            </button>
                                        ))}
                                        {filteredCampaigns.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No campaigns.</p>}
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="lg:col-span-2 space-y-3">
                                {!selectedCampaign && <Card className="bg-card/40 border-border/50"><CardContent className="p-10 text-center text-xs text-muted-foreground">Pick a campaign to see details</CardContent></Card>}
                                {selectedCampaign && (
                                    <>
                                        <Card className="bg-card/40 border-border/50">
                                            <CardContent className="p-4 space-y-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <h3 className="text-lg font-bold truncate">{selectedCampaign.campaign_name}</h3>
                                                        <p className="text-[11px] text-muted-foreground">{selectedCampaign.client_name || 'No client'} · {selectedCampaign.goal || 'No goal'}</p>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <Button size="sm" variant="outline" onClick={() => setCampaignModal({ open: true, initial: selectedCampaign })}><Edit2 className="w-3.5 h-3.5" /></Button>
                                                        <Button size="sm" variant="outline" onClick={async () => { if (confirm('Delete?')) await dash.deleteCampaign(selectedCampaign.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center">
                                                    {(['draft', 'scheduled', 'posted', 'cancelled'] as PostStatus[]).map(s => (
                                                        <div key={s} className="rounded-lg border border-border/40 p-2">
                                                            <p className="text-[9px] uppercase text-muted-foreground capitalize">{s}</p>
                                                            <p className="text-base font-bold">{postsForCampaign.filter(p => p.status === s).length}</p>
                                                        </div>
                                                    ))}
                                                    <div className="rounded-lg border border-border/40 p-2">
                                                        <p className="text-[9px] uppercase text-muted-foreground">Reach</p>
                                                        <p className="text-base font-bold">{fmtNum(analyticsForCampaign.reduce((s, a) => s + (a.total_reach || 0), 0))}</p>
                                                    </div>
                                                    <div className="rounded-lg border border-border/40 p-2">
                                                        <p className="text-[9px] uppercase text-muted-foreground">Followers</p>
                                                        <p className="text-base font-bold">+{fmtNum(analyticsForCampaign.reduce((s, a) => s + (a.followers_gained || 0), 0))}</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Kanban */}
                                        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                                {POST_STATUSES.map(s => <KanbanColumn key={s} status={s} posts={postsForCampaign.filter(p => p.status === s)} />)}
                                            </div>
                                            <DragOverlay>{draggingPost && <KanbanCard post={draggingPost} />}</DragOverlay>
                                        </DndContext>

                                        {/* Weekly analytics chart */}
                                        <Card className="bg-card/40 border-border/50">
                                            <CardContent className="p-4">
                                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Weekly Analytics</h3>
                                                {analyticsForCampaign.length === 0 ? (
                                                    <p className="text-xs text-muted-foreground py-6 text-center">No analytics yet — use “Log Analytics”.</p>
                                                ) : (
                                                    <ResponsiveContainer width="100%" height={240}>
                                                        <LineChart data={Array.from(analyticsForCampaign.reduce((m, a) => {
                                                            const r = m.get(a.week_start) || { week: a.week_start };
                                                            r[a.platform] = (r[a.platform] || 0) + a.total_reach + a.total_engagement;
                                                            m.set(a.week_start, r); return m;
                                                        }, new Map()).values()).sort((a, b) => a.week.localeCompare(b.week))}>
                                                            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                                                            <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                                                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={fmtNum} />
                                                            <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                                                            <Legend wrapperStyle={{ fontSize: 10 }} />
                                                            {selectedCampaign.platforms.map(p => <Line key={p} type="monotone" dataKey={p} stroke={PLATFORM_HEX[p]} strokeWidth={2} dot={false} />)}
                                                        </LineChart>
                                                    </ResponsiveContainer>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {/* ── Calendar ── */}
                    <TabsContent value="calendar" className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" onClick={() => setCalMonth(subMonths(calMonth, 1))}>‹</Button>
                                <h3 className="text-sm font-bold w-40 text-center">{format(calMonth, 'MMMM yyyy')}</h3>
                                <Button size="sm" variant="outline" onClick={() => setCalMonth(addMonths(calMonth, 1))}>›</Button>
                                <Button size="sm" variant="ghost" onClick={() => setCalMonth(startOfMonth(new Date()))}>Today</Button>
                            </div>
                            <div className="flex gap-1 flex-wrap">
                                {PLATFORMS.map(p => (
                                    <Badge key={p} variant="outline" onClick={() => setCalPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                                        className={`text-[10px] capitalize cursor-pointer ${calPlatforms.includes(p) || calPlatforms.length === 0 ? PLATFORM_COLORS[p] : 'opacity-40'}`}>
                                        {p}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-[10px] text-muted-foreground font-semibold">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="text-center py-1">{d}</div>)}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {calDays.map(d => {
                                const isToday = isSameDay(d, new Date());
                                const isCurMonth = isSameMonth(d, calMonth);
                                const dayPosts = calPosts.filter(p => {
                                    const dt = p.scheduled_at || p.posted_at;
                                    return dt && isSameDay(parseISO(dt), d);
                                });
                                return (
                                    <button key={d.toISOString()} onClick={() => setPostModal(true)}
                                        className={`min-h-[90px] rounded-lg border p-1.5 text-left text-xs space-y-1 transition-colors ${isCurMonth ? 'border-border/40 bg-card/30 hover:bg-secondary' : 'border-border/20 bg-card/10 text-muted-foreground/50'} ${isToday ? 'ring-2 ring-primary/60' : ''}`}>
                                        <p className="text-[10px] font-semibold">{format(d, 'd')}</p>
                                        {dayPosts.slice(0, 3).map(p => (
                                            <div key={p.id} className="flex items-center gap-1">
                                                <span className={`w-1.5 h-1.5 rounded-full ${PLATFORM_DOT[p.platform]} shrink-0`} />
                                                <span className="text-[9px] truncate">{p.caption || p.post_type}</span>
                                            </div>
                                        ))}
                                        {dayPosts.length > 3 && <p className="text-[9px] text-muted-foreground">+{dayPosts.length - 3}</p>}
                                    </button>
                                );
                            })}
                        </div>
                    </TabsContent>

                    {/* ── Posts ── */}
                    <TabsContent value="posts" className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input placeholder="Search captions…" value={postSearch} onChange={e => setPostSearch(e.target.value)} className="h-8 text-xs pl-7" />
                            </div>
                            {selectedPostIds.size > 0 && (
                                <Select onValueChange={(v) => bulkUpdate(v as PostStatus)}>
                                    <SelectTrigger className="h-8 text-xs w-40"><SelectValue placeholder={`Update ${selectedPostIds.size}…`} /></SelectTrigger>
                                    <SelectContent>{POST_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">Mark as {s}</SelectItem>)}</SelectContent>
                                </Select>
                            )}
                            <Button size="sm" onClick={() => setPostModal(true)}><Plus className="w-3.5 h-3.5 mr-1" />Add Post</Button>
                        </div>
                        <Card className="bg-card/40 border-border/50 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead className="bg-card/60 border-b border-border/40 text-muted-foreground">
                                        <tr>
                                            <th className="p-2 w-8"></th>
                                            <th className="p-2 text-left">Platform</th>
                                            <th className="p-2 text-left">Campaign</th>
                                            <th className="p-2 text-left">Type</th>
                                            <th className="p-2 text-left">Caption</th>
                                            <th className="p-2 text-left">Status</th>
                                            <th className="p-2 text-left">Scheduled</th>
                                            <th className="p-2 text-right">Eng</th>
                                            <th className="p-2 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPosts.map(p => {
                                            const camp = dash.campaigns.find(c => c.id === p.campaign_id);
                                            const eng = (p.likes || 0) + (p.comments || 0) + (p.shares || 0);
                                            return (
                                                <>
                                                    <tr key={p.id} className="border-b border-border/30 hover:bg-secondary/40">
                                                        <td className="p-2"><Checkbox checked={selectedPostIds.has(p.id)} onCheckedChange={() => toggleSelected(p.id)} /></td>
                                                        <td className="p-2"><Badge variant="outline" className={`text-[9px] capitalize ${PLATFORM_COLORS[p.platform]}`}>{p.platform}</Badge></td>
                                                        <td className="p-2 max-w-[120px] truncate">{camp?.campaign_name || '—'}</td>
                                                        <td className="p-2 capitalize">{p.post_type}</td>
                                                        <td className="p-2 max-w-[260px] truncate cursor-pointer" onClick={() => setExpandedPostId(expandedPostId === p.id ? null : p.id)}>{p.caption || '—'}</td>
                                                        <td className="p-2"><Badge variant="outline" className={`text-[9px] capitalize ${STATUS_COLORS[p.status]}`}>{p.status}</Badge></td>
                                                        <td className="p-2 text-[10px] text-muted-foreground whitespace-nowrap">{p.scheduled_at ? format(new Date(p.scheduled_at), 'MMM d HH:mm') : '—'}</td>
                                                        <td className="p-2 text-right">{eng}</td>
                                                        <td className="p-2 text-right">
                                                            {p.status !== 'posted' && (
                                                                <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={async () => await dash.updatePost(p.id, { status: 'posted', posted_at: new Date().toISOString() })}>Mark Posted</Button>
                                                            )}
                                                            <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={async () => { if (confirm('Delete?')) await dash.deletePost(p.id); }}><Trash2 className="w-3 h-3" /></Button>
                                                        </td>
                                                    </tr>
                                                    {expandedPostId === p.id && (
                                                        <tr className="bg-card/30 border-b border-border/30">
                                                            <td colSpan={9} className="p-3">
                                                                <p className="text-xs whitespace-pre-wrap mb-2">{p.caption}</p>
                                                                <div className="grid grid-cols-5 gap-2 text-center">
                                                                    {(['likes', 'comments', 'shares', 'views', 'reach'] as const).map(k => (
                                                                        <div key={k} className="rounded border border-border/40 p-2">
                                                                            <p className="text-[9px] uppercase text-muted-foreground">{k}</p>
                                                                            <p className="text-sm font-bold">{(p as any)[k] || 0}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </>
                                            );
                                        })}
                                        {filteredPosts.length === 0 && <tr><td colSpan={9} className="p-10 text-center text-muted-foreground">No posts.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </TabsContent>

                    {/* ── Analytics ── */}
                    <TabsContent value="analytics" className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <Select value={analyticsRange} onValueChange={(v: any) => setAnalyticsRange(v)}>
                                <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="7d">Last 7d</SelectItem><SelectItem value="30d">Last 30d</SelectItem><SelectItem value="90d">Last 90d</SelectItem></SelectContent>
                            </Select>
                            <Select value={analyticsPlatform} onValueChange={setAnalyticsPlatform}>
                                <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="all">All platforms</SelectItem>{PLATFORMS.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                            </Select>
                            <Button size="sm" variant="outline" onClick={exportCSV}><Download className="w-3.5 h-3.5 mr-1.5" />Export CSV</Button>
                        </div>

                        <Card className="bg-card/40 border-border/50">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Engagement Rate</h3>
                                </div>
                                <p className="text-4xl font-bold mt-2">{dash.stats.avgEngagementRate.toFixed(2)}%</p>
                                <p className="text-[11px] text-muted-foreground">across {analyticsFiltered.length} weekly snapshots</p>
                            </CardContent>
                        </Card>

                        <div className="grid lg:grid-cols-2 gap-3">
                            <Card className="bg-card/40 border-border/50">
                                <CardContent className="p-4">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Followers Gained per week</h3>
                                    {followersSeries.length === 0 ? <p className="text-xs text-muted-foreground py-10 text-center">No data.</p> : (
                                        <ResponsiveContainer width="100%" height={260}>
                                            <LineChart data={followersSeries}>
                                                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                                                <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={fmtNum} />
                                                <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                                                <Legend wrapperStyle={{ fontSize: 10 }} />
                                                {PLATFORMS.filter(p => analyticsPlatform === 'all' || p === analyticsPlatform).map(p => (
                                                    <Line key={p} type="monotone" dataKey={p} stroke={PLATFORM_HEX[p]} strokeWidth={2} dot={false} />
                                                ))}
                                            </LineChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>
                            <Card className="bg-card/40 border-border/50">
                                <CardContent className="p-4">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Reach vs Impressions vs Engagement</h3>
                                    {reachBars.length === 0 ? <p className="text-xs text-muted-foreground py-10 text-center">No data.</p> : (
                                        <ResponsiveContainer width="100%" height={260}>
                                            <BarChart data={reachBars}>
                                                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                                                <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={fmtNum} />
                                                <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                                                <Legend wrapperStyle={{ fontSize: 10 }} />
                                                <Bar dataKey="reach" fill="#fe4c18" />
                                                <Bar dataKey="impressions" fill="#0ea5e9" />
                                                <Bar dataKey="engagement" fill="#10b981" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="bg-card/40 border-border/50">
                            <CardContent className="p-4">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Top Posts</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead className="text-muted-foreground border-b border-border/40">
                                            <tr><th className="text-left p-2">Platform</th><th className="text-left p-2">Caption</th><th className="text-right p-2">Likes</th><th className="text-right p-2">Comments</th><th className="text-right p-2">Shares</th></tr>
                                        </thead>
                                        <tbody>
                                            {topPosts.map(p => (
                                                <tr key={p.id} className="border-b border-border/30">
                                                    <td className="p-2"><Badge variant="outline" className={`text-[9px] capitalize ${PLATFORM_COLORS[p.platform]}`}>{p.platform}</Badge></td>
                                                    <td className="p-2 max-w-[400px] truncate">{p.caption || '—'}</td>
                                                    <td className="p-2 text-right">{p.likes || 0}</td>
                                                    <td className="p-2 text-right">{p.comments || 0}</td>
                                                    <td className="p-2 text-right">{p.shares || 0}</td>
                                                </tr>
                                            ))}
                                            {topPosts.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No posted content yet.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            <CampaignModal open={campaignModal.open} onClose={() => setCampaignModal({ open: false })} initial={campaignModal.initial} contracts={dash.contracts}
                onSave={async (data) => { if (campaignModal.initial?.id) await dash.updateCampaign(campaignModal.initial.id, data); else await dash.createCampaign(data); toast({ title: campaignModal.initial?.id ? 'Updated' : 'Created' }); }} />
            <PostModal open={postModal} onClose={() => setPostModal(false)} campaigns={dash.campaigns} uploadMedia={dash.uploadMedia}
                onSave={async (data) => { await dash.createPost(data); toast({ title: 'Post saved' }); }} />
            <AnalyticsModal open={analyticsModal} onClose={() => setAnalyticsModal(false)} campaigns={dash.campaigns}
                onSave={async (data) => { await dash.logAnalytics(data); toast({ title: 'Analytics logged' }); }} />
            <PlatformConnectModal open={connectModal.open} onClose={() => setConnectModal({ open: false, platform: '' })} platform={connectModal.platform} onConnect={dash.connectPlatform} />
        </DashboardLayout>
    );
}
