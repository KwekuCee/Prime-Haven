import { useEffect, useMemo, useState } from 'react';
import {
  Search, Loader2, Send, FileText, LinkIcon, ExternalLink, RotateCcw, XCircle, Settings2, Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import SuperAdminLayout from '@/components/admin/SuperAdminLayout';
import { format } from 'date-fns';
import {
  TALENT_TRACKS, APPLICANT_STATUSES, APPLICANT_STATUS_LABELS, getApplicantFileUrl,
} from '@/lib/applicants';

interface Applicant {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  track: string;
  cv_url: string | null;
  portfolio_url: string | null;
  portfolio_link: string | null;
  status: string;
  score: number | null;
  passed: boolean | null;
  invited_at: string | null;
  payment_reference: string | null;
  paid_at: string | null;
  access_token: string;
  admin_notes: string | null;
  created_at: string;
}

interface AssessmentRow {
  id: string;
  applicant_id: string;
  score: number | null;
  correct_count: number | null;
  total_questions: number | null;
  practical_url: string | null;
  practical_text: string | null;
  practical_review_status: string | null;
  submitted_at: string | null;
}

const statusTone: Record<string, string> = {
  submitted: 'bg-muted text-foreground',
  invited: 'bg-blue-500/10 text-blue-600',
  in_review: 'bg-amber-500/10 text-amber-600',
  passed: 'bg-emerald-500/10 text-emerald-600',
  failed: 'bg-destructive/10 text-destructive',
  paid: 'bg-primary/10 text-primary',
  active: 'bg-emerald-600/15 text-emerald-700',
};

const ManageApplicants = () => {
  const { user, checking } = useAdminGuard();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [search, setSearch] = useState('');
  const [trackFilter, setTrackFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date');
  const [detail, setDetail] = useState<Applicant | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [quizSize, setQuizSize] = useState('15');
  const [passMark, setPassMark] = useState('70');
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (!checking && user) {
      load();
      loadSettings();
    }
  }, [checking, user]);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: apps }, { data: assess }] = await Promise.all([
        (supabase as any).from('applicants').select('*').order('created_at', { ascending: false }),
        (supabase as any).from('applicant_assessments').select('*').order('started_at', { ascending: false }),
      ]);
      setApplicants((apps || []) as Applicant[]);
      setAssessments((assess || []) as AssessmentRow[]);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['applicant_intro_video_url', 'applicant_quiz_size', 'applicant_pass_mark']);
    (data || []).forEach((row: { key: string; value: unknown }) => {
      const raw = typeof row.value === 'string' ? row.value.replace(/^"|"$/g, '') : String(row.value ?? '');
      if (row.key === 'applicant_intro_video_url') setVideoUrl(raw);
      if (row.key === 'applicant_quiz_size') setQuizSize(raw || '15');
      if (row.key === 'applicant_pass_mark') setPassMark(raw || '70');
    });
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const rows = [
        { key: 'applicant_intro_video_url', value: JSON.stringify(videoUrl.trim()) },
        { key: 'applicant_quiz_size', value: String(Math.max(5, Math.min(60, Number(quizSize) || 15))) },
        { key: 'applicant_pass_mark', value: String(Math.max(1, Math.min(100, Number(passMark) || 70))) },
      ];
      for (const row of rows) {
        const { error } = await supabase
          .from('system_settings')
          .update({ value: JSON.parse(row.value.startsWith('"') ? row.value : row.value) as never, updated_by: user?.id })
          .eq('key', row.key);
        if (error) throw error;
      }
      toast({ title: 'Screening settings saved' });
      setSettingsOpen(false);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not save', description: err instanceof Error ? err.message : 'Please try again.' });
    } finally {
      setSavingSettings(false);
    }
  };

  const invite = async (applicant: Applicant) => {
    setBusyId(applicant.id);
    try {
      const { data, error } = await supabase.functions.invoke('invite-applicant', {
        body: { applicantId: applicant.id, origin: window.location.origin },
      });
      const payload = data as { success?: boolean; link?: string; emailSent?: boolean; message?: string };
      if (error || !payload?.success) throw new Error(payload?.message || 'Invite could not be sent.');
      toast({
        title: payload.emailSent ? 'Invite emailed' : 'Invite created',
        description: payload.emailSent ? `${applicant.full_name} can now start the screening.` : 'Email delivery failed — copy the link from the applicant row.',
      });
      await load();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Invite failed', description: err instanceof Error ? err.message : 'Please try again.' });
    } finally {
      setBusyId(null);
    }
  };

  const setStatus = async (applicant: Applicant, status: string) => {
    setBusyId(applicant.id);
    try {
      const patch: Record<string, unknown> = { status };
      if (status === 'invited') { patch.score = null; patch.passed = null; patch.video_watched_at = null; }
      const { error } = await (supabase as any).from('applicants').update(patch).eq('id', applicant.id);
      if (error) throw error;
      if (status === 'invited') {
        await (supabase as any).from('applicant_assessments').delete().eq('applicant_id', applicant.id);
      }
      toast({ title: status === 'invited' ? 'Assessment reset' : 'Applicant updated' });
      setDetail(null);
      await load();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Update failed', description: err instanceof Error ? err.message : 'Please try again.' });
    } finally {
      setBusyId(null);
    }
  };

  const openFile = async (path: string) => {
    const url = await getApplicantFileUrl(path);
    if (!url) {
      toast({ variant: 'destructive', title: 'File unavailable', description: 'That file could not be opened.' });
      return;
    }
    window.open(url, '_blank', 'noopener');
  };

  const copyLink = (applicant: Applicant) => {
    const link = `${window.location.origin}/applicant/${applicant.access_token}`;
    navigator.clipboard?.writeText(link);
    toast({ title: 'Screening link copied' });
  };

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = applicants.filter((a) => {
      if (trackFilter !== 'all' && a.track !== trackFilter) return false;
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (!q) return true;
      return a.full_name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
    });
    list = [...list].sort((a, b) =>
      sortBy === 'score'
        ? (b.score ?? -1) - (a.score ?? -1)
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return list;
  }, [applicants, search, trackFilter, statusFilter, sortBy]);

  const detailAssessment = detail ? assessments.find((a) => a.applicant_id === detail.id) || null : null;

  if (checking) {
    return (
      <SuperAdminLayout title="Applicants">
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout title="Applicants">
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email"
              className="pl-9"
              aria-label="Search applicants"
            />
          </div>
          <Select value={trackFilter} onValueChange={setTrackFilter}>
            <SelectTrigger className="lg:w-48"><SelectValue placeholder="Track" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tracks</SelectItem>
              {TALENT_TRACKS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="lg:w-52"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {APPLICANT_STATUSES.map((s) => <SelectItem key={s} value={s}>{APPLICANT_STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'date' | 'score')}>
            <SelectTrigger className="lg:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Newest first</SelectItem>
              <SelectItem value="score">Highest score</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setSettingsOpen(true)} className="gap-2">
            <Settings2 className="w-4 h-4" /> Screening setup
          </Button>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : rows.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No applicants match these filters yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a) => (
                  <TableRow key={a.id} className="cursor-pointer" onClick={() => setDetail(a)}>
                    <TableCell>
                      <p className="font-medium">{a.full_name}</p>
                      <p className="text-xs text-muted-foreground">{a.email}</p>
                    </TableCell>
                    <TableCell className="text-sm">{a.track}</TableCell>
                    <TableCell>
                      <Badge className={`${statusTone[a.status] || 'bg-muted'} border-0`}>
                        {APPLICANT_STATUS_LABELS[a.status] || a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-semibold">{a.score === null ? '—' : `${a.score}%`}</TableCell>
                    <TableCell className="text-sm">{a.paid_at ? format(new Date(a.paid_at), 'dd MMM yyyy') : '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(a.created_at), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {a.status === 'submitted' ? (
                        <Button size="sm" disabled={busyId === a.id} onClick={() => invite(a)} className="gap-2">
                          {busyId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Invite
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => copyLink(a)} className="gap-2">
                          <Copy className="w-3.5 h-3.5" /> Link
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Applicant detail */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.full_name}</DialogTitle>
                <DialogDescription>
                  {detail.track} · {detail.email}{detail.phone ? ` · ${detail.phone}` : ''}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="font-semibold">{APPLICANT_STATUS_LABELS[detail.status] || detail.status}</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Assessment score</p>
                    <p className="font-semibold">
                      {detail.score === null ? 'Not taken' : `${detail.score}%`}
                      {detailAssessment?.total_questions ? ` (${detailAssessment.correct_count}/${detailAssessment.total_questions})` : ''}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Documents</p>
                  <div className="flex flex-wrap gap-2">
                    {detail.cv_url && (
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => openFile(detail.cv_url!)}>
                        <FileText className="w-3.5 h-3.5" /> CV
                      </Button>
                    )}
                    {detail.portfolio_url && (
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => openFile(detail.portfolio_url!)}>
                        <FileText className="w-3.5 h-3.5" /> Portfolio file
                      </Button>
                    )}
                    {detail.portfolio_link && (
                      <Button size="sm" variant="outline" className="gap-2" asChild>
                        <a href={detail.portfolio_link} target="_blank" rel="noopener noreferrer">
                          <LinkIcon className="w-3.5 h-3.5" /> Portfolio link <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Practical task</p>
                  {detailAssessment?.practical_url || detailAssessment?.practical_text ? (
                    <div className="rounded-xl border border-border/60 p-3 space-y-3">
                      {detailAssessment.practical_text && (
                        <p className="text-sm whitespace-pre-wrap">{detailAssessment.practical_text}</p>
                      )}
                      {detailAssessment.practical_url && (
                        <Button size="sm" variant="outline" className="gap-2" onClick={() => openFile(detailAssessment.practical_url!)}>
                          <FileText className="w-3.5 h-3.5" /> Open submission
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nothing submitted yet.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Screening link</p>
                  <div className="flex gap-2">
                    <Input readOnly value={`${window.location.origin}/applicant/${detail.access_token}`} className="text-xs" />
                    <Button size="sm" variant="outline" onClick={() => copyLink(detail)}>Copy</Button>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-wrap gap-2">
                {detail.status === 'submitted' && (
                  <Button disabled={busyId === detail.id} onClick={() => invite(detail)} className="gap-2">
                    <Send className="w-4 h-4" /> Invite to screening
                  </Button>
                )}
                <Button variant="outline" disabled={busyId === detail.id} onClick={() => setStatus(detail, 'invited')} className="gap-2">
                  <RotateCcw className="w-4 h-4" /> Reset assessment
                </Button>
                <Button variant="outline" disabled={busyId === detail.id} onClick={() => setStatus(detail, 'failed')} className="gap-2 text-destructive">
                  <XCircle className="w-4 h-4" /> Reject
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Screening settings */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Screening setup</DialogTitle>
            <DialogDescription>Controls the applicant intro video and the assessment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="intro-video">Intro video URL</Label>
              <Input id="intro-video" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://…/prime-haven-intro.mp4" />
              <p className="text-xs text-muted-foreground">Direct video file link (mp4). Applicants must watch it fully before the assessment unlocks.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quiz-size">Questions per assessment</Label>
                <Input id="quiz-size" type="number" min={5} max={60} value={quizSize} onChange={(e) => setQuizSize(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pass-mark">Pass mark (%)</Label>
                <Input id="pass-mark" type="number" min={1} max={100} value={passMark} onChange={(e) => setPassMark(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>Cancel</Button>
            <Button onClick={saveSettings} disabled={savingSettings}>
              {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save settings'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
};

export default ManageApplicants;
