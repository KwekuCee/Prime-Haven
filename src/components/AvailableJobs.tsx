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
  if (t.includes('ui') || t.includes('ux') || t.includes('app')) return 'UI/UX Designer';
  if (t.includes('web') || t.includes('dev') || t.includes('frontend') || t.includes('fullstack') || t.includes('full-stack') || t.includes('backend')) return 'Web Developer';
  return 'Graphic Designer';
};

const categoryToJobCategories = (profession: string): string[] => {
  switch (profession) {
    case 'UI/UX Designer': return ['app-design'];
    case 'Web Developer': return ['web-dev'];
    default: return ['graphic-design'];
  }
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
}

const CATEGORY_LABELS: Record<string, string> = {
  'graphic-design': 'Graphic Design',
  'app-design': 'UI/UX Design',
  'web-dev': 'Web Development',
};

const AvailableJobs = () => {
  const [jobs, setJobs] = useState<JobContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const { data, error } = await supabase
          .from('job_contracts')
          .select('id, title, description, category, deadline, budget, client_name, status, created_at')
          .in('status', ['active', 'in_progress'])
          .order('created_at', { ascending: false });
        if (!error && data) setJobs(data as JobContract[]);
      } catch (err) {
        console.error('Error loading jobs:', err);
      } finally {
        setLoading(false);
      }
    };
    loadJobs();
  }, []);

  if (loading) return null;
  if (jobs.length === 0) return null;

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
