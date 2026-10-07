import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Calendar, DollarSign, Clock, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

const normalizeCategory = (title: string | null): string => {
  const t = (title || '').toLowerCase();
  if (t.includes('ui') || t.includes('ux') || t.includes('app-design') || t.includes('product design')) return 'UI/UX Designer';
  if (t.includes('mobile') || t.includes('ios') || t.includes('android') || t.includes('flutter')) return 'Mobile App Developer';
  if (t.includes('web') || t.includes('dev') || t.includes('frontend') || t.includes('fullstack') || t.includes('full-stack') || t.includes('backend')) return 'Web Developer';
  if (t.includes('motion') || t.includes('animat')) return 'Motion Graphics Designer';
  if (t.includes('video') || t.includes('edit')) return 'Video Editor';
  if (t.includes('social') || t.includes('smm')) return 'Social Media Manager';
  if (t.includes('it') || t.includes('support') || t.includes('network')) return 'IT Specialist';
  return 'Graphic Designer';
};

const professionToJobCategories = (profession: string): string[] => {
  const p = profession.toLowerCase();
  if (p.includes('ui') || p.includes('ux') || p.includes('app-design')) return ['ui-ux-design', 'app-design'];
  if (p.includes('mobile')) return ['mobile-app-development'];
  if (p.includes('web')) return ['web-development', 'web-dev'];
  if (p.includes('motion')) return ['motion-graphics'];
  if (p.includes('video')) return ['video-editing'];
  if (p.includes('social') || p.includes('smm')) return ['social-media-management'];
  if (p.includes('it')) return ['it-solutions'];
  return ['graphic-design'];
};

interface JobContract {
  id: string;
  title: string;
  description: string;
  category: string;
  deadline: string | null;
  budget: string | null;
  client_name: string | null;
  status: string;
  created_at: string;
  active_designers_count?: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  'graphic-design': 'Graphic Design',
  'app-design': 'UI/UX Design',
  'ui-ux-design': 'UI/UX Design',
  'web-dev': 'Web Development',
  'web-development': 'Web Development',
  'mobile-app-development': 'Mobile App Development',
  'motion-graphics': 'Motion Graphics',
  'video-editing': 'Video Editing',
  'social-media-management': 'Social Media Management',
  'it-solutions': 'General IT Solutions',
};

const AvailableJobs = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const loadJobs = async () => {
      if (!user) { setLoading(false); return; }
      try {
        // Get designer's professions (multi) and professional_title (fallback)
        const { data: designerData } = await supabase
          .from('designer_details')
          .select('professional_title, professions')
          .eq('user_id', user.id)
          .maybeSingle();

        const userProfessions: string[] =
          designerData?.professions && designerData.professions.length > 0
            ? designerData.professions
            : [normalizeCategory(designerData?.professional_title || null)];

        const jobCategories = Array.from(
          new Set(userProfessions.flatMap((p) => professionToJobCategories(p)))
        );

        const { data, error } = await supabase
          .from('job_contracts')
          .select('id, title, description, category, deadline, budget, client_name, status, created_at, active_designers_count, target_professions')
          .in('status', ['active', 'in_progress'])
          .order('created_at', { ascending: false });
        if (!error && data) {
          // Filter out graphic-design contracts with 2+ active designers
          const filtered = (data as any[]).filter((job) => {
            if (job.category === 'graphic-design' && (job.active_designers_count || 0) >= 2) {
              return false;
            }

            const targetProfs: string[] = job.target_professions || [];
            if (targetProfs.length > 0) {
              const matched = targetProfs.some((tp: string) => {
                const tpLower = tp.toLowerCase();
                return userProfessions.some((up: string) => {
                  const upLower = up.toLowerCase();
                  return upLower === tpLower || upLower.includes(tpLower) || tpLower.includes(upLower);
                });
              });
              if (matched) return true;
            }

            // Category match fallback
            const jobCat = (job.category || '').toLowerCase();
            return jobCategories.some((c) => c.toLowerCase() === jobCat);
          });
          setJobs(filtered as JobContract[]);
        }
      } catch (err) {
        console.error('Error loading jobs:', err);
      } finally {
        setLoading(false);
      }
    };
    loadJobs();
  }, [user]);

  if (loading) return null;
  if (jobs.length === 0) return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mb-8"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Briefcase className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-heading font-bold">Available Jobs</h2>
          <p className="text-xs text-muted-foreground font-medium">0 active jobs</p>
        </div>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-8 text-center">
        <Briefcase className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No jobs available for your profession</p>
        <p className="text-xs text-muted-foreground/60 mt-1">New jobs matching your skills will appear here</p>
      </div>
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mb-8"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold">Available Jobs</h2>
            <p className="text-xs text-muted-foreground font-medium">{jobs.length} active job{jobs.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {jobs.map((job) => (
          <Card
            key={job.id}
            className="glass border-l-4 border-l-primary cursor-pointer hover:scale-[1.01] transition-transform"
            onClick={() => setExpanded(expanded === job.id ? null : job.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm font-bold leading-tight">{job.title}</CardTitle>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {CATEGORY_LABELS[job.category] || job.category}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className={`text-xs text-muted-foreground mb-3 ${expanded === job.id ? '' : 'line-clamp-2'}`}>
                {job.description}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {job.budget && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-primary" />
                    {job.budget}
                  </span>
                )}
                {job.deadline && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-primary" />
                    {format(new Date(job.deadline), 'dd MMM yyyy')}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(job.created_at), 'dd MMM')}
                </span>
                {job.status === 'in_progress' && (
                  <Badge className="bg-blue-500/20 text-blue-500 text-[10px]">In Progress</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
};

export default AvailableJobs;
