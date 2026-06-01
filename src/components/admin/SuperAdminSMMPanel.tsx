import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Briefcase, ChevronRight, Filter, Radio, TrendingUp, Users, AlertTriangle, CheckCircle2, Clock, Eye,
} from 'lucide-react';
import { format, formatDistanceToNow, startOfMonth, differenceInDays } from 'date-fns';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RTooltip, Legend, CartesianGrid,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useSuperAdminSMM, AdminCampaign, SmmSubmission } from '@/hooks/useSuperAdminSMM';
import { useToast } from '@/hooks/use-toast';

const PLATFORM_HEX: Record<string, string> = {
  instagram: '#ec4899', facebook: '#3b82f6', tiktok: '#94a3b8',
  x: '#a1a1aa', linkedin: '#0ea5e9', youtube: '#ef4444',
};
const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  facebook: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  tiktok: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  x: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20',
  linkedin: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  youtube: 'bg-red-500/10 text-red-400 border-red-500/20',
};
const fmt = (n: number) => n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + 'M' : n >= 1_000 ? (n / 1_000).toFixed(1) + 'K' : String(n);

const KPI = ({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) => (
  <Card className="bg-card/40 border-border/50">
    <CardContent className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground"><Icon className="w-3.5 h-3.5" /><span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span></div>
      <p className="text-2xl font-bold mt-1.5">{value}</p>
    </CardContent>
  </Card>
);

const ApproveSubmissionDialog = ({ open, onClose, submission, onApprove }: {
  open: boolean; onClose: () => void; submission: SmmSubmission | null;
  onApprove: (id: string, points: number) => Promise<void>;
}) => {
  const [points, setPoints] = useState(20);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  if (!submission) return null;
  const submit = async () => {
    setBusy(true);
    try { await onApprove(submission.id, points); toast({ title: 'Approved' }); onClose(); }
    catch (e: any) { toast({ title: 'Failed', description: e.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Approve & Award Points</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <p className="text-xs text-muted-foreground">{submission.designer_name} · {submission.project_name}</p>
          <div className="space-y-1.5"><Label className="text-xs">Points</Label><Input type="number" value={points} onChange={e => setPoints(Number(e.target.value))} className="h-9 text-xs" /></div>
          <Button onClick={submit} disabled={busy} className="w-full">{busy ? 'Approving…' : 'Approve'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function SuperAdminSMMPanel() {
  const navigate = useNavigate();
  const sa = useSuperAdminSMM();
  const [expandedMgr, setExpandedMgr] = useState<string | null>(null);
  const [healthFilter, setHealthFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [campSearch, setCampSearch] = useState('');
  const [approveDialog, setApproveDialog] = useState<SmmSubmission | null>(null);

  // KPIs
  const totalManagers = sa.managers.filter(m => m.is_active !== false).length;
  const totalActive = sa.campaigns.filter(c => c.status === 'active').length;
  const monthStart = startOfMonth(new Date());
  const postsThisMonth = sa.posts.filter(p => p.status === 'posted' && p.posted_at && new Date(p.posted_at) >= monthStart).length;
  const combinedReach = sa.analytics.filter(a => new Date(a.week_start) >= monthStart).reduce((s, a) => s + (a.total_reach || 0), 0);

  // Per-campaign aggregates
  const campMetrics = useMemo(() => {
    const m = new Map<string, { posted: number; reach: number; engagement: number; lastPostAt: number | null }>();
    sa.campaigns.forEach(c => m.set(c.id, { posted: 0, reach: 0, engagement: 0, lastPostAt: null }));
    sa.posts.forEach(p => {
      const e = m.get(p.campaign_id); if (!e) return;
      if (p.status === 'posted') e.posted++;
      if (p.posted_at) e.lastPostAt = Math.max(e.lastPostAt || 0, new Date(p.posted_at).getTime());
    });
    sa.analytics.forEach(a => {
      const e = m.get(a.campaign_id); if (!e) return;
      e.reach += a.total_reach || 0;
      e.engagement += a.total_engagement || 0;
    });
    return m;
  }, [sa.campaigns, sa.posts, sa.analytics]);

  const healthOf = (c: AdminCampaign): 'overdue' | 'stale' | 'healthy' => {
    if (c.end_date && c.status !== 'completed' && new Date(c.end_date) < new Date()) return 'overdue';
    const lp = campMetrics.get(c.id)?.lastPostAt;
    if (!lp || differenceInDays(new Date(), new Date(lp)) >= 7) return 'stale';
    return 'healthy';
  };

  const filteredCampaigns = useMemo(() => sa.campaigns.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (healthFilter !== 'all' && healthOf(c) !== healthFilter) return false;
    if (campSearch && !c.campaign_name.toLowerCase().includes(campSearch.toLowerCase())) return false;
    return true;
  }), [sa.campaigns, statusFilter, healthFilter, campSearch, campMetrics]);

  // Per-manager stats
  const managerStats = useMemo(() => sa.managers.map(m => {
    const camps = sa.campaigns.filter(c => c.smm_user_id === m.user_id);
    const campIds = new Set(camps.map(c => c.id));
    const postsTM = sa.posts.filter(p => campIds.has(p.campaign_id) && p.status === 'posted' && p.posted_at && new Date(p.posted_at) >= monthStart).length;
    const reach = sa.analytics.filter(a => campIds.has(a.campaign_id)).reduce((s, a) => s + (a.total_reach || 0), 0);
    const lastActiveMs = sa.posts.filter(p => campIds.has(p.campaign_id)).reduce((mx, p) => Math.max(mx, p.posted_at ? new Date(p.posted_at).getTime() : 0), 0);
    return { ...m, activeCampaigns: camps.filter(c => c.status === 'active').length, postsTM, reach, campaigns: camps, lastActive: lastActiveMs };
  }), [sa.managers, sa.campaigns, sa.posts, sa.analytics, monthStart]);

  // Platform distribution
  const platformPie = useMemo(() => {
    const m: Record<string, number> = {};
    sa.posts.forEach(p => { m[p.platform] = (m[p.platform] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [sa.posts]);
  const reachPerPlatform = useMemo(() => {
    const m: Record<string, number> = {};
    sa.analytics.filter(a => new Date(a.week_start) >= monthStart).forEach(a => { m[a.platform] = (m[a.platform] || 0) + (a.total_reach || 0); });
    return Object.entries(m).map(([platform, reach]) => ({ platform, reach }));
  }, [sa.analytics, monthStart]);

  const pendingSubs = sa.submissions.filter(s => s.status === 'pending');

  if (sa.loading) {
    return <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="SMM Managers" value={totalManagers} icon={Users} />
        <KPI label="Active Campaigns" value={totalActive} icon={Briefcase} />
        <KPI label="Posts This Month" value={postsThisMonth} icon={Activity} />
        <KPI label="Total Reach (mo)" value={fmt(combinedReach)} icon={TrendingUp} />
      </div>

      <div className="grid lg:grid-cols-10 gap-4">
        {/* Main */}
        <div className="lg:col-span-7 space-y-4">
          {/* Managers table */}
          <Card className="bg-card/40 border-border/50">
            <CardContent className="p-4">
              <h3 className="text-sm font-bold mb-3">SMM Managers ({managerStats.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground border-b border-border/40">
                    <tr>
                      <th className="text-left p-2">Name</th>
                      <th className="text-right p-2">Active Campaigns</th>
                      <th className="text-right p-2">Posts (mo)</th>
                      <th className="text-right p-2">Reach</th>
                      <th className="text-left p-2">Last Active</th>
                      <th className="text-right p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managerStats.map(m => (
                      <>
                        <tr key={m.user_id} className="border-b border-border/30 hover:bg-secondary/40 cursor-pointer" onClick={() => setExpandedMgr(expandedMgr === m.user_id ? null : m.user_id)}>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">{(m.full_name || '?').slice(0, 2).toUpperCase()}</div>
                              <div><p className="font-semibold">{m.full_name || '—'}</p><p className="text-[10px] text-muted-foreground">{m.email}</p></div>
                            </div>
                          </td>
                          <td className="p-2 text-right">{m.activeCampaigns}</td>
                          <td className="p-2 text-right">{m.postsTM}</td>
                          <td className="p-2 text-right">{fmt(m.reach)}</td>
                          <td className="p-2 text-[10px] text-muted-foreground">{m.lastActive ? formatDistanceToNow(m.lastActive, { addSuffix: true }) : 'Never'}</td>
                          <td className="p-2 text-right">
                            <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={(e) => { e.stopPropagation(); navigate(`/admin/users/${m.user_id}`); }}><Eye className="w-3 h-3 mr-1" />Profile</Button>
                          </td>
                        </tr>
                        {expandedMgr === m.user_id && (
                          <tr className="bg-card/30 border-b border-border/30">
                            <td colSpan={6} className="p-3">
                              {m.campaigns.length === 0 ? <p className="text-[11px] text-muted-foreground">No campaigns.</p> : (
                                <div className="space-y-1">
                                  {m.campaigns.map(c => (
                                    <div key={c.id} className="flex items-center justify-between text-[11px] rounded p-1.5 hover:bg-secondary/40">
                                      <span className="font-semibold">{c.campaign_name}</span>
                                      <span className="text-muted-foreground">{c.status} · {campMetrics.get(c.id)?.posted || 0} posts</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                    {managerStats.length === 0 && <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">No SMM managers yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Campaign health */}
          <Card className="bg-card/40 border-border/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold mr-auto">Campaign Health</h3>
                <Input placeholder="Search…" value={campSearch} onChange={e => setCampSearch(e.target.value)} className="h-8 text-xs w-40" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All status</SelectItem>{['active', 'paused', 'completed', 'archived'].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={healthFilter} onValueChange={setHealthFilter}>
                  <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All health</SelectItem><SelectItem value="overdue">🔴 Overdue</SelectItem><SelectItem value="stale">🟡 Stale</SelectItem><SelectItem value="healthy">✅ Healthy</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground border-b border-border/40">
                    <tr>
                      <th className="text-left p-2">Campaign</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Platforms</th>
                      <th className="text-right p-2">Posts</th>
                      <th className="text-right p-2">Reach</th>
                      <th className="text-left p-2">Health</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCampaigns.map(c => {
                      const h = healthOf(c);
                      const m = campMetrics.get(c.id);
                      return (
                        <tr key={c.id} className="border-b border-border/30">
                          <td className="p-2 font-semibold">{c.campaign_name}<p className="text-[10px] text-muted-foreground font-normal">{c.client_name}</p></td>
                          <td className="p-2"><Badge variant="outline" className="text-[9px] capitalize">{c.status}</Badge></td>
                          <td className="p-2"><div className="flex gap-1 flex-wrap">{c.platforms.map(p => <Badge key={p} variant="outline" className={`text-[9px] capitalize ${PLATFORM_COLORS[p]}`}>{p}</Badge>)}</div></td>
                          <td className="p-2 text-right">{m?.posted || 0}</td>
                          <td className="p-2 text-right">{fmt(m?.reach || 0)}</td>
                          <td className="p-2">{h === 'overdue' ? <Badge className="bg-red-500/10 text-red-400 border-red-500/30"><AlertTriangle className="w-3 h-3 mr-1" />Overdue</Badge> : h === 'stale' ? <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30"><Clock className="w-3 h-3 mr-1" />Stale</Badge> : <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Healthy</Badge>}</td>
                        </tr>
                      );
                    })}
                    {filteredCampaigns.length === 0 && <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">No campaigns match.</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-3">
            <Card className="bg-card/40 border-border/50">
              <CardContent className="p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Posts by Platform</h3>
                {platformPie.length === 0 ? <p className="text-xs text-muted-foreground py-10 text-center">No data.</p> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={platformPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                        {platformPie.map(e => <Cell key={e.name} fill={PLATFORM_HEX[e.name] || '#888'} />)}
                      </Pie>
                      <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card className="bg-card/40 border-border/50">
              <CardContent className="p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Reach per Platform (this month)</h3>
                {reachPerPlatform.length === 0 ? <p className="text-xs text-muted-foreground py-10 text-center">No data.</p> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={reachPerPlatform}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                      <XAxis dataKey="platform" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={fmt} />
                      <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="reach" fill="#fe4c18" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Submissions queue */}
          <Card className="bg-card/40 border-border/50">
            <CardContent className="p-4">
              <h3 className="text-sm font-bold mb-3">SMM Submissions Queue ({pendingSubs.length} pending)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground border-b border-border/40"><tr><th className="text-left p-2">User</th><th className="text-left p-2">Project</th><th className="text-left p-2">Submitted</th><th className="text-left p-2">Status</th><th className="text-right p-2">Points</th><th className="text-right p-2">Actions</th></tr></thead>
                  <tbody>
                    {sa.submissions.map(s => (
                      <tr key={s.id} className="border-b border-border/30">
                        <td className="p-2">{s.designer_name}</td>
                        <td className="p-2">{s.project_name}</td>
                        <td className="p-2 text-[10px] text-muted-foreground">{format(new Date(s.created_at), 'MMM d HH:mm')}</td>
                        <td className="p-2 capitalize"><Badge variant="outline" className="text-[9px]">{s.status}</Badge></td>
                        <td className="p-2 text-right">{s.points_awarded ?? '—'}</td>
                        <td className="p-2 text-right">
                          {s.status === 'pending' && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 text-[10px] text-emerald-400" onClick={() => setApproveDialog(s)}>Approve</Button>
                              <Button size="sm" variant="ghost" className="h-7 text-[10px] text-red-400" onClick={async () => { await sa.rejectSubmission(s.id); }}>Reject</Button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                    {sa.submissions.length === 0 && <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">No SMM submissions.</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live activity sidebar */}
        <Card className="lg:col-span-3 bg-card/40 border-border/50 h-fit lg:sticky lg:top-4">
          <CardContent className="p-4">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${sa.realtimeConnected ? 'bg-emerald-400 animate-pulse' : 'bg-muted-foreground'}`} />
              Live Activity
              <Radio className="w-3 h-3 ml-auto text-emerald-400" />
            </h3>
            {sa.liveEvents.length === 0 && <p className="text-xs text-muted-foreground py-10 text-center">Waiting for events…</p>}
            <div className="space-y-1.5 max-h-[600px] overflow-auto">
              <AnimatePresence>
                {sa.liveEvents.slice(0, 30).map(ev => (
                  <motion.div key={ev.id} initial={{ opacity: 0, y: -8, backgroundColor: 'hsl(var(--primary)/0.15)' }}
                    animate={{ opacity: 1, y: 0, backgroundColor: 'transparent' }} transition={{ backgroundColor: { duration: 1.5 } }}
                    className="text-[11px] p-2 rounded border-b border-border/30">
                    <p>{ev.text}</p>
                    <p className="text-[9px] text-muted-foreground">{formatDistanceToNow(ev.at, { addSuffix: true })}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </div>

      <ApproveSubmissionDialog open={!!approveDialog} onClose={() => setApproveDialog(null)} submission={approveDialog} onApprove={sa.approveSubmission} />
    </div>
  );
}
