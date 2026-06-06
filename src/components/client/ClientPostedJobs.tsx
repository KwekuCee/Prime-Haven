import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Briefcase, Clock, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import ClientPostJobDialog from './ClientPostJobDialog';

interface PostedJob {
  id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
  accepted_designer_id: string | null;
  designer?: { full_name: string | null } | null;
  claim_count?: number;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'text-amber-500 border-amber-500/20 bg-amber-500/10',
  in_progress: 'text-primary border-primary/20 bg-primary/10',
  completed: 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10',
  approved: 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10',
};

const ClientPostedJobs = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<PostedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('client_projects')
        .select('id, title, category, status, created_at, accepted_designer_id')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      const list = (data || []) as PostedJob[];

      // Fetch claim counts + designer names
      const ids = list.map((j) => j.id);
      const claimMap: Record<string, number> = {};
      if (ids.length > 0) {
        const { data: assigns } = await supabase
          .from('project_assignments')
          .select('project_id, status')
          .in('project_id', ids)
          .eq('status', 'active');
        (assigns || []).forEach((a: any) => {
          claimMap[a.project_id] = (claimMap[a.project_id] || 0) + 1;
        });
      }

      const designerIds = list
        .map((j) => j.accepted_designer_id)
        .filter(Boolean) as string[];
      const designerMap: Record<string, { full_name: string | null }> = {};
      if (designerIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', designerIds);
        (profs || []).forEach((p: any) => {
          designerMap[p.id] = { full_name: p.full_name };
        });
      }

      const enriched = list.map((j) => ({
        ...j,
        designer: j.accepted_designer_id
          ? designerMap[j.accepted_designer_id]
          : null,
        claim_count: claimMap[j.id] || 0,
      }));

      if (!cancelled) {
        setJobs(enriched);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, reloadKey]);

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden mb-6">
      <div className="p-5 border-b border-border/50 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-heading font-bold">My Posted Jobs</h2>
            <p className="text-[10px] text-muted-foreground">
              Jobs you posted to the designer marketplace
            </p>
          </div>
        </div>
        <ClientPostJobDialog onPosted={() => setReloadKey((k) => k + 1)} />
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          Loading…
        </div>
      ) : jobs.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-xs text-muted-foreground mb-1">
            You haven't posted any jobs yet.
          </p>
          <p className="text-[11px] text-muted-foreground/70">
            Use "Post New Job" above to get started.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {jobs.map((j) => (
            <div
              key={j.id}
              className="p-4 flex items-center gap-3 hover:bg-white/[0.02] transition"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                {j.status === 'completed' || j.status === 'approved' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Clock className="w-4 h-4 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{j.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[10px] text-muted-foreground capitalize">
                    {j.category.replace(/-/g, ' ')}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    · {format(new Date(j.created_at), 'MMM d')}
                  </span>
                  {j.designer?.full_name ? (
                    <span className="text-[10px] text-emerald-400">
                      · Assigned to {j.designer.full_name}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">
                      · {j.claim_count} designer claim
                      {j.claim_count === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge
                  variant="outline"
                  className={`text-[10px] uppercase font-bold tracking-wider ${
                    STATUS_STYLES[j.status] ||
                    'text-muted-foreground border-border'
                  }`}
                >
                  {j.status.replace('_', ' ')}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => navigate(`/project-chat/${j.id}`)}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Chat
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientPostedJobs;
