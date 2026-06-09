import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import ProjectChatPanel from '@/components/ProjectChatPanel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const ProjectChatPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [role, setRole] = useState<'client' | 'designer' | null>(null);
  const [senderName, setSenderName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    if (!projectId) return;

    (async () => {
      setLoading(true);
      const { data: proj } = await supabase
        .from('client_projects')
        .select('id, title, created_by, accepted_designer_id, status')
        .eq('id', projectId)
        .maybeSingle();

      if (!proj) {
        setDenied(true);
        setLoading(false);
        return;
      }

      let resolvedRole: 'client' | 'designer' | null = null;
      if (proj.created_by === user.id) resolvedRole = 'client';
      else if (proj.accepted_designer_id === user.id) resolvedRole = 'designer';
      else {
        // designer might be assigned but not yet accepted
        const { data: pa } = await supabase
          .from('project_assignments')
          .select('id')
          .eq('project_id', projectId)
          .eq('designer_id', user.id)
          .maybeSingle();
        if (pa) resolvedRole = 'designer';
      }

      if (!resolvedRole) {
        setDenied(true);
        setLoading(false);
        return;
      }

      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .maybeSingle();

      setProject(proj);
      setRole(resolvedRole);
      setSenderName(prof?.full_name || prof?.email || resolvedRole);
      setLoading(false);
    })();
  }, [projectId, user, authLoading, navigate]);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>

        {loading ? (
          <Skeleton className="h-[520px] rounded-2xl w-full" />
        ) : denied ? (
          <div className="rounded-2xl border border-border/60 bg-card/40 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              You don't have access to this project chat.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Project Chat
              </p>
              <h1 className="text-xl font-heading font-bold">{project?.title}</h1>
            </div>
            <ProjectChatPanel
              projectId={projectId!}
              role={role!}
              senderName={senderName}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ProjectChatPage;
