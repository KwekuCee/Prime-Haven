import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, MessageSquare, Loader2, RefreshCcw, ExternalLink, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ProjectChatPanel from '@/components/ProjectChatPanel';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ProjectRow {
  id: string;
  title: string;
  category: string;
  status: string;
  claimed_by: string | null;
  claimed_at: string | null;
  deadline: string | null;
  price_ghs: number | null;
}

interface Delivery {
  id: string;
  client_project_id: string;
  project_name: string;
  status: string;
  files_urls: string[] | null;
  design_link: string | null;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'text-amber-600 border-amber-500/30 bg-amber-500/10',
  revision: 'text-amber-600 border-amber-500/30 bg-amber-500/10',
  approved: 'text-emerald-600 border-emerald-500/30 bg-emerald-500/10',
  client_accepted: 'text-emerald-600 border-emerald-500/30 bg-emerald-500/10',
};

const ClientProjectReview = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [professionals, setProfessionals] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [chatProject, setChatProject] = useState<ProjectRow | null>(null);
  const [revisionFor, setRevisionFor] = useState<Delivery | null>(null);
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const { data: projectRows } = await supabase
        .from('client_projects')
        .select('id, title, category, status, claimed_by, claimed_at, deadline, price_ghs')
        .or(`client_email.eq.${user.email},created_by.eq.${user.id}`)
        .order('created_at', { ascending: false });

      const rows = (projectRows || []) as unknown as ProjectRow[];
      setProjects(rows);

      const ids = rows.map((r) => r.id);
      if (ids.length) {
        const { data: subs } = await supabase
          .from('submissions')
          .select('id, client_project_id, project_name, status, files_urls, design_link, created_at')
          .in('client_project_id', ids)
          .order('created_at', { ascending: false });
        setDeliveries((subs || []) as unknown as Delivery[]);
      } else {
        setDeliveries([]);
      }

      const claimerIds = rows.map((r) => r.claimed_by).filter(Boolean) as string[];
      if (claimerIds.length) {
        const names: Record<string, string> = {};
        for (const id of Array.from(new Set(claimerIds))) {
          const { data } = await (supabase as any).rpc('get_designer_public_profile', { p_designer_id: id });
          const row = Array.isArray(data) ? data[0] : null;
          if (row) names[id] = (row as any).full_name || (row as any).username || 'Professional';
        }
        setProfessionals(names);
      }
    } catch (err) {
      console.error('client project review load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async (delivery: Delivery) => {
    setBusy(delivery.id);
    try {
      const { error } = await (supabase as any).rpc('approve_project_submission', { p_submission_id: delivery.id });
      if (error) throw error;
      toast({ title: 'Project approved', description: 'Your professional has been paid their share and awarded points.' });
      await load();
    } catch (err: any) {
      toast({ title: 'Could not approve', description: err?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const requestRevision = async () => {
    if (!revisionFor || !feedback.trim()) return;
    setBusy(revisionFor.id);
    try {
      const { error } = await (supabase as any).rpc('request_project_revision', {
        p_submission_id: revisionFor.id,
        p_feedback: feedback.trim().slice(0, 2000),
      });
      if (error) throw error;
      toast({ title: 'Revision requested', description: 'Your notes were sent to the professional.' });
      setRevisionFor(null);
      setFeedback('');
      await load();
    } catch (err: any) {
      toast({ title: 'Could not send revision', description: err?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <div className="rounded-2xl border border-border/60 p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center">
        <h3 className="text-sm font-semibold">No projects yet</h3>
        <p className="text-xs text-muted-foreground mt-1">Once your payment clears, your project appears here and goes out to our professionals.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {projects.map((p) => {
        const projectDeliveries = deliveries.filter((d) => d.client_project_id === p.id);
        const latest = projectDeliveries[0];
        return (
          <div key={p.id} className="rounded-2xl border border-border/60 bg-card/40 p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-heading font-bold">{p.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {p.category}
                  {p.deadline ? ` · due ${format(new Date(p.deadline), 'MMM d, yyyy')}` : ''}
                </p>
              </div>
              <Badge variant="outline" className={STATUS_STYLES[latest?.status || ''] || 'text-muted-foreground'}>
                {p.claimed_by
                  ? latest
                    ? latest.status === 'approved' || latest.status === 'client_accepted'
                      ? 'Approved'
                      : latest.status === 'revision'
                        ? 'Revision requested'
                        : 'Awaiting your review'
                    : 'In progress'
                  : 'Waiting for a professional'}
              </Badge>
            </div>

            {p.claimed_by && (
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <UserCheck className="w-3.5 h-3.5 text-primary" />
                  {professionals[p.claimed_by] || 'Assigned professional'}
                </span>
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => setChatProject(p)}>
                  <MessageSquare className="w-3.5 h-3.5" /> Message
                </Button>
              </div>
            )}

            {latest && (
              <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
                <p className="text-xs font-semibold">Latest delivery · {format(new Date(latest.created_at), 'MMM d, yyyy')}</p>
                <div className="flex flex-wrap gap-2">
                  {(latest.files_urls || []).map((url, i) => (
                    <a key={url + i} href={url} target="_blank" rel="noreferrer" className="text-[11px] inline-flex items-center gap-1 underline text-primary">
                      <ExternalLink className="w-3 h-3" /> File {i + 1}
                    </a>
                  ))}
                  {latest.design_link && (
                    <a href={latest.design_link} target="_blank" rel="noreferrer" className="text-[11px] inline-flex items-center gap-1 underline text-primary">
                      <ExternalLink className="w-3 h-3" /> Live link
                    </a>
                  )}
                </div>
                {latest.status !== 'approved' && latest.status !== 'client_accepted' && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" className="h-8 gap-1.5 text-xs" disabled={busy === latest.id} onClick={() => approve(latest)}>
                      {busy === latest.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Approve &amp; close project
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => { setRevisionFor(latest); setFeedback(''); }}
                    >
                      <RefreshCcw className="w-3.5 h-3.5" /> Request a revision
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <Dialog open={!!chatProject} onOpenChange={(open) => !open && setChatProject(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{chatProject?.title}</DialogTitle>
            <DialogDescription>Talk directly with the professional working on your project.</DialogDescription>
          </DialogHeader>
          {chatProject && <ProjectChatPanel projectId={chatProject.id} role="client" senderName={user?.email || 'Client'} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!revisionFor} onOpenChange={(open) => !open && setRevisionFor(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Request a revision</DialogTitle>
            <DialogDescription>Tell the professional exactly what needs to change.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            maxLength={2000}
            rows={5}
            placeholder="e.g. The wordmark is too tight — can we open up the letter spacing?"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevisionFor(null)}>Cancel</Button>
            <Button disabled={!feedback.trim() || busy === revisionFor?.id} onClick={requestRevision}>
              {busy === revisionFor?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send revision notes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientProjectReview;
