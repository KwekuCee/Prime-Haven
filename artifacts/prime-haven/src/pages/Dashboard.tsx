import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, Award, Clock, FileCheck, Upload, Wallet, Settings,
  Loader2, Trophy, Medal, Star, DollarSign, EyeOff, Zap, Brain,
  RefreshCw, PlayCircle, ArrowUpRight, Flame, Target, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { MagneticEffect } from '@/components/ui/MagneticEffect';
import DashboardLayout from '@/components/DashboardLayout';
import ProjectMarketplace from '@/components/dashboard/ProjectMarketplace';
import ActiveContracts from '@/components/dashboard/ActiveContracts';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { useToast } from '@/hooks/use-toast';
import ProfileCompleteness from '@/components/dashboard/ProfileCompleteness';
import AchievementBadges from '@/components/dashboard/AchievementBadges';
import ActivityStreak from '@/components/dashboard/ActivityStreak';
import LiveFeed from '@/components/dashboard/LiveFeed';
import ExpectedSalaryModal from '@/components/dashboard/ExpectedSalaryModal';
import EarningsChart from '@/components/dashboard/EarningsChart';
import WithdrawCard from '@/components/dashboard/WithdrawCard';
import GoalTracker from '@/components/dashboard/GoalTracker';
import DesignerPortfolio from '@/components/dashboard/DesignerPortfolio';
import RankBadge from '@/components/dashboard/RankBadge';

interface ProfileData {
  full_name: string | null;
  email_verified: boolean | null;
  registration_fee_paid: boolean | null;
}

interface DesignerData {
  total_points: number | null;
  monthly_points: number | null;
  salary_estimated: number | null;
  professional_title: string | null;
  talent_score: number | null;
  talent_score_breakdown: any | null;
  talent_score_updated_at: string | null;
  professions?: string[] | null;
}

interface Submission {
  id: string;
  project_name: string;
  status: string | null;
  points_awarded: number | null;
  client_preference: boolean | null;
  ph_approved: boolean | null;
  client_accepted: boolean | null;
  created_at: string;
  rejection_reason?: string | null;
  parent_submission_id?: string | null;
  client_ref?: string | null;
  service_type?: string | null;
}

interface LeaderboardEntry {
  user_id: string | null;
  full_name: string | null;
  total_points: number | null;
  monthly_points: number | null;
  professional_title: string | null;
  talent_score: number | null;
}

const normalizeCategory = (title: string | null): string => {
  const t = (title || '').toLowerCase();
  if (t.includes('ui') || t.includes('ux') || t.includes('app')) return 'UI/UX Designer';
  if (t.includes('web') || t.includes('dev') || t.includes('frontend') || t.includes('fullstack') || t.includes('full-stack') || t.includes('backend')) return 'Web Developer';
  return 'Graphic Designer';
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { settings, formatCurrency } = useUserSettings();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [designer, setDesigner] = useState<DesignerData | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState({
    totalPoints: 0, monthlyRank: 0, totalDesigners: 0,
    estSalary: 0, totalSubmissions: 0, approvedSubmissions: 0, monthlyRevenue: 0,
  });
  const [recalculating, setRecalculating] = useState(false);
  const [startWorkingOpen, setStartWorkingOpen] = useState(false);
  const [startWorkingProject, setStartWorkingProject] = useState('');
  const [startWorkingSending, setStartWorkingSending] = useState(false);
  const [activeJobs, setActiveJobs] = useState<{ id: string; title: string; category: string; source: 'client_projects' | 'job_contracts' | 'client_orders' }[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [hasStartedProject, setHasStartedProject] = useState(false);
  const [startedProjectInfo, setStartedProjectInfo] = useState<{ jobId: string; title: string; startedAt: string } | null>(null);
  const [showSalaryModal, setShowSalaryModal] = useState(false);

  useEffect(() => {
    if (user) {
      const started = localStorage.getItem(`started_project_${user.id}`);
      if (started) {
        try {
          const parsed = JSON.parse(started);
          setStartedProjectInfo(parsed);
          setHasStartedProject(true);
        } catch {
          setHasStartedProject(false);
        }
      }
    }
  }, [user]);

  const categoryToJobCategories = (profession: string): string[] => {
    switch (profession) {
      case 'UI/UX Designer': return ['app-design'];
      case 'Web Developer': return ['web-dev'];
      default: return ['graphic-design'];
    }
  };

  useEffect(() => {
    if (!startWorkingOpen || !user) return;
    let isMounted = true;

    // Use the professions array from designer details, fallback to heuristic if empty
    const userProfessions = designer?.professions && designer.professions.length > 0
      ? designer.professions
      : [normalizeCategory(designer?.professional_title || null)];

    const loadJobs = async () => {
      setLoadingJobs(true);

      // 1. Fetch from project_assignments matching user
      const { data: cpAssignments, error: cpError } = await supabase
        .from('project_assignments')
        .select(`
          project_id,
          project:client_projects(id, title, category, created_at)
        `)
        .eq('designer_id', user.id)
        .neq('status', 'completed');

      if (cpError) console.error('Error fetching project_assignments:', cpError);

      const availableCP = (cpAssignments || [])
        .filter((a: any) => a.project)
        .map((a: any) => ({
          id: a.project.id,
          title: a.project.title,
          category: a.project.category,
          source: 'client_projects' as const,
          created_at: a.project.created_at
        }));

      // 2. Fetch from job_contract_claims matching user
      const { data: jcClaims, error: jcError } = await supabase
        .from('job_contract_claims')
        .select(`
          contract_id,
          contract:job_contracts(id, title, category, created_at)
        `)
        .eq('designer_id', user.id)
        .eq('status', 'active');

      if (jcError) console.error('Error fetching job_contract_claims:', jcError);

      const availableJC = (jcClaims || [])
        .filter((c: any) => c.contract)
        .map((c: any) => ({
          id: c.contract.id,
          title: c.contract.title,
          category: c.contract.category,
          source: 'job_contracts' as const,
          created_at: c.contract.created_at
        }));

      // 3. Fallback for legacy client_orders
      const { data: legacyOrders } = await supabase.from('client_orders')
        .select('id, service_type, created_at')
        .eq('assigned_designer_id', user.id)
        .neq('project_status', 'completed');

      const availableLegacy = (legacyOrders || []).map((o: any) => ({
        id: o.id,
        title: `Legacy Order: ${o.service_type}`,
        category: o.service_type,
        source: 'client_orders' as const,
        created_at: o.created_at
      }));

      if (isMounted) {
        const combinedRaw = [...availableCP, ...availableJC, ...availableLegacy].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        // Deduplicate by title to prevent showing the same job from two sources
        const uniqueTitles = new Set();
        const combined = combinedRaw.filter(job => {
          if (!job.title) return true;
          const normalizedTitle = job.title.trim().toLowerCase();
          if (uniqueTitles.has(normalizedTitle)) return false;
          uniqueTitles.add(normalizedTitle);
          return true;
        });

        setActiveJobs(combined);
        setLoadingJobs(false);
      }
    };

    loadJobs();
    return () => { isMounted = false; };
  }, [startWorkingOpen, user, designer, toast]);

  const recalculateTalentScore = async () => {
    if (!user) return;
    setRecalculating(true);
    try {
      const { error } = await supabase.functions.invoke('calculate-talent-score', {
        body: { designer_id: user.id },
      });
      if (error) throw error;
      const { data: updated } = await supabase
        .from('designer_details')
        .select('total_points, monthly_points, salary_estimated, professional_title, talent_score, talent_score_breakdown, talent_score_updated_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (updated) setDesigner(updated);
    } catch (err) {
      console.error('Error recalculating talent score:', err);
    } finally {
      setRecalculating(false);
    }
  };

  const handleStartWorking = async () => {
    if (!user || !startWorkingProject) return;
    const selectedJob = activeJobs.find(j => j.id === startWorkingProject);
    if (!selectedJob) return;

    setStartWorkingSending(true);
    try {
      if (selectedJob.source === 'client_projects') {
        // 1. Call the claim_project RPC to safely assign the job
        const { error: claimError } = await supabase.rpc('claim_project', {
          p_project_id: selectedJob.id
        });

        if (claimError) throw claimError;
      } else if (selectedJob.source === 'job_contracts') {
        // For job_contracts, notify admin that designer is starting
        const { error: notifyError } = await supabase.functions.invoke('notify-designer', {
          body: {
            designerId: user.id,
            projectName: selectedJob.title,
            notificationType: 'contract_application',
          },
        });
        if (notifyError) {
          console.error('Failed to notify admin:', notifyError);
        }
      } else {
        // Legacy client order already assigned; just start it locally.
        console.info('Starting legacy assigned order locally', selectedJob.id);
      }

      // 2. Store local state
      localStorage.setItem(`started_project_${user.id}`, JSON.stringify({
        jobId: selectedJob.id,
        title: selectedJob.title,
        startedAt: new Date().toISOString(),
      }));

      setHasStartedProject(true);
      setStartedProjectInfo({
        jobId: selectedJob.id,
        title: selectedJob.title,
        startedAt: new Date().toISOString()
      });

      toast({
        title: 'Project Claimed! 🚀',
        description: `You have successfully started working on "${selectedJob.title}".`
      });

      setStartWorkingOpen(false);
      setStartWorkingProject('');

    } catch (err: unknown) {
      console.error('Error claiming project:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast({
        title: 'Claim Failed',
        description: errorMessage || 'Failed to claim project. It might have been taken just now.',
        variant: 'destructive'
      });
    } finally {
      setStartWorkingSending(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) { navigate('/login'); return; }
    const loadDashboardData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const [profileResult, designerResult, submissionsResult, designersResult, profilesResult, settingsResult] = await Promise.all([
          supabase.from('profiles').select('full_name, email_verified, registration_fee_paid').eq('id', user.id).maybeSingle(),
          supabase.from('designer_details').select('total_points, monthly_points, salary_estimated, professional_title, professions, talent_score, talent_score_breakdown, talent_score_updated_at').eq('user_id', user.id).maybeSingle(),
          supabase.from('submissions').select('*').eq('designer_id', user.id).order('created_at', { ascending: false }),
          supabase.from('leaderboard_designer_details').select('user_id, total_points, monthly_points, professional_title, talent_score').order('total_points', { ascending: false }),
          supabase.from('leaderboard_profiles').select('id, full_name'),
          supabase.from('system_settings').select('key, value')
        ]);
        if (profileResult.data) setProfile(profileResult.data);
        if (designerResult.data) {
          setDesigner(designerResult.data);
          // Redirect Social Media Managers to their dedicated dashboard
          const title = (designerResult.data.professional_title || '').toLowerCase().replace(/\s+/g, '-');
          if (title === 'social-media-manager') {
            navigate('/dashboard/smm', { replace: true });
            return;
          }
        }
        if (submissionsResult.data) setSubmissions(submissionsResult.data);

        const profilesMap = new Map((profilesResult.data as any[] || []).map((p: { id: string; full_name?: string }) => [p.id, p.full_name]));
        if (designersResult.data && designersResult.data.length > 0) {
          const processedLeaderboard: LeaderboardEntry[] = (designersResult.data as any[]).map((entry: { user_id: string; total_points?: number; monthly_points?: number; professional_title?: string; talent_score?: number }) => {
            const profTitle = entry.professional_title ? String(entry.professional_title).trim() : '';
            return {
              user_id: entry.user_id,
              full_name: profilesMap.get(entry.user_id) || 'Anonymous',
              total_points: entry.total_points || 0,
              monthly_points: entry.monthly_points || 0,
              professional_title: profTitle || 'Designer',
              talent_score: entry.talent_score || 0,
            } as LeaderboardEntry;
          });
          const userCategory = normalizeCategory(designerResult.data?.professional_title || null);
          const categoryLeaderboard = processedLeaderboard
            .filter(e => normalizeCategory(e.professional_title) === userCategory)
            .sort((a, b) => (b.total_points || 0) - (a.total_points || 0));

          setLeaderboard(categoryLeaderboard);
          const userRank = categoryLeaderboard.findIndex(e => e.user_id === user.id) + 1;

          let monthlyRevenue = 0;
          if (settingsResult.data) {
            const s: Record<string, unknown> = {};
            (settingsResult.data as { key: string; value: unknown }[]).forEach((item) => { s[item.key] = item.value; });
            const mr = s.monthly_revenue;
            if (mr && typeof mr === 'object' && 'amount' in (mr as Record<string, unknown>)) {
              const amt = (mr as Record<string, unknown>)['amount'];
              monthlyRevenue = Number((amt as number) || 0);
            }
          }

          setStats({
            totalPoints: designerResult.data?.total_points || 0,
            monthlyRank: userRank || 0,
            totalDesigners: categoryLeaderboard.length,
            estSalary: designerResult.data?.salary_estimated || 0,
            totalSubmissions: submissionsResult.data?.length || 0,
            approvedSubmissions: submissionsResult.data?.filter((sub: Submission) => sub.status === 'approved' || sub.client_accepted).length || 0,
            monthlyRevenue,
          });
        }
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, [user, authLoading, navigate]);

  const getFirstName = () => profile?.full_name?.split(' ')[0] || 'Designer';

  const getActivityType = (s: Submission) => {
    if (s.client_accepted) return 'client_accepted';
    if (s.status === 'correction_requested') return 'correction_requested';
    if (s.status === 'client_rejected') return 'client_rejected';
    if (s.ph_approved) return 'ph_approved';
    if (s.client_preference) return 'preference';
    if (s.status === 'approved') return 'approved';
    if (s.status === 'revision') return 'revision';
    if (s.status === 'rejected') return 'rejected';
    return 'submitted';
  };

  const getActivityLabel = (type: string) => {
    const labels: Record<string, string> = {
      client_accepted: 'Client Accepted', ph_approved: 'PH Approved', preference: 'Client Preference',
      approved: 'Approved', revision: 'Needs Revision', rejected: 'Rejected',
      correction_requested: 'Correction Needed', client_rejected: 'Client Rejected', submitted: 'Submitted',
    };
    return labels[type] || 'Submitted';
  };

  const getStatusColor = (type: string) => {
    const colors: Record<string, string> = {
      client_accepted: 'bg-primary', ph_approved: 'bg-emerald-500', preference: 'bg-primary',
      approved: 'bg-emerald-500', revision: 'bg-amber-500', rejected: 'bg-red-500',
      correction_requested: 'bg-amber-500', client_rejected: 'bg-red-500', submitted: 'bg-muted-foreground',
    };
    return colors[type] || 'bg-muted-foreground';
  };

  const getTimeAgo = (dateString: string) => {
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${ Math.floor(diff / 60) }m ago`;
    if (diff < 86400) return `${ Math.floor(diff / 3600) }h ago`;
    if (diff < 604800) return `${ Math.floor(diff / 86400) }d ago`;
    return new Date(dateString).toLocaleDateString();
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-4 h-4 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-gray-400" />;
    if (rank === 3) return <Medal className="w-4 h-4 text-amber-600" />;
    return <span className="text-xs font-bold text-muted-foreground">#{rank}</span>;
  };

  const showEarnings = settings.show_earnings;
  const correctionRequests = submissions.filter((s) => s.status === 'correction_requested');
  const getCorrectionLink = (submission: Submission) =>
    `/submit-work?correction=${submission.id}&project=${encodeURIComponent(submission.project_name)}&client=${encodeURIComponent(submission.client_ref || '')}&service=${encodeURIComponent(submission.service_type || '')}`;

  if (loading || authLoading) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
          <div className="flex justify-between items-end">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-64" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-[140px] rounded-2xl" />
            <Skeleton className="h-[140px] rounded-2xl" />
            <Skeleton className="h-[140px] rounded-2xl" />
            <Skeleton className="h-[140px] rounded-2xl" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-[300px] rounded-2xl w-full" />
            <Skeleton className="h-[300px] rounded-2xl w-full" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
        {/* Welcome Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Welcome back</p>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold">
                {getFirstName()} <span className="text-gradient">✦</span>
              </h1>
              <div className="mt-2">
                <RankBadge points={designer?.total_points || 0} size="sm" showProgress />
              </div>
            </div>
            <div className="flex gap-2">
              <MagneticEffect intensity={0.1}>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => {
                  if (hasStartedProject) {
                    const stored = localStorage.getItem(`started_project_${user?.id}`);
                    const proj = stored ? JSON.parse(stored) : null;
                    toast({ title: 'Project Already Started', description: `You must submit your work for "${proj?.title || 'your current project'}" before starting another.`, variant: 'destructive' });
                    return;
                  }
                  setStartWorkingOpen(true);
                }}>
                  <PlayCircle className="w-3.5 h-3.5 mr-1.5" /> Start Work
                </Button>
              </MagneticEffect>
              <MagneticEffect intensity={0.1}>
                <Button size="sm" className="text-xs bg-primary hover:bg-primary/90" onClick={() => navigate('/submit-work')}>
                  <Upload className="w-3.5 h-3.5 mr-1.5" /> Submit Work
                </Button>
              </MagneticEffect>
            </div>
          </div>
        </motion.div>

        {/* Active Project Indicator */}
        {hasStartedProject && startedProjectInfo && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}
            className="mb-6 p-4 rounded-2xl bg-primary/5 border border-primary/20 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">Project In Progress</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  <span className="font-medium text-primary">{startedProjectInfo.title}</span>
                  {' — started '}
                  {new Date(startedProjectInfo.startedAt).toLocaleDateString()}
                </p>
              </div>
              <Button size="sm" className="text-xs" onClick={() => navigate('/submit-work')}>
                <Upload className="w-3.5 h-3.5 mr-1.5" /> Submit Now
              </Button>
            </div>
          </motion.div>
        )}

        {/* Verification Alerts */}
        {profile && (!profile.email_verified || !profile.registration_fee_paid) && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="mb-6 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Target className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-500 mb-1">Action Required</p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {!profile.email_verified && <li>• Verify your email to unlock all features</li>}
                  {!profile.registration_fee_paid && <li>• Complete registration fee payment (GH₵100.00)</li>}
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        <ProfileCompleteness profile={profile} designer={designer} submissions={submissions} />
        <AchievementBadges designer={designer} submissions={submissions} />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {[
            { label: 'Total Points', value: stats.totalPoints.toLocaleString(), sub: `+ ${ designer?.monthly_points || 0 } this month`, icon: Flame, iconColor: 'text-primary' },
            { label: 'Rank', value: stats.monthlyRank > 0 ? `#${ stats.monthlyRank } ` : '—', sub: `of ${ stats.totalDesigners } designers`, icon: Trophy, iconColor: 'text-yellow-500' },
            { label: 'Est. Salary', value: showEarnings ? formatCurrency(stats.estSalary) : '••••', sub: showEarnings ? 'Click for breakdown' : 'Hidden', icon: showEarnings ? Wallet : EyeOff, iconColor: 'text-emerald-500', action: 'EST_SALARY' },
            { label: 'Submissions', value: stats.totalSubmissions.toString(), sub: `${ stats.approvedSubmissions } approved`, icon: FileCheck, iconColor: 'text-blue-500' },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.05 }} className="h-full">
              <div onClick={() => { if (stat.action === 'EST_SALARY') setShowSalaryModal(true); }} className={`h - full ${ stat.action && 'cursor-pointer' } `}>
                <SpotlightCard className="h-full rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-4 sm:p-5 hover:border-primary/20 hover:bg-card/60 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <stat.icon className={`w - 5 h - 5 ${ stat.iconColor } `} />
                    </div>
                    <p className="text-2xl sm:text-3xl font-heading font-bold tracking-tight">{stat.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{stat.label}</p>
                    <p className="text-[10px] text-primary mt-0.5 font-medium">{stat.sub}</p>
                  </div>
                </SpotlightCard>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Correction Requests */}
        {correctionRequests.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="mb-6 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-heading font-bold">Corrections Requested</h2>
                <p className="text-xs text-muted-foreground">Submissions needing your revised work.</p>
              </div>
            </div>
            <div className="grid gap-3">
              {correctionRequests.map((submission) => (
                <div key={submission.id} className="rounded-2xl border border-border/50 bg-background/80 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{submission.project_name}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{submission.client_ref ? `Client: ${ submission.client_ref } ` : 'Client not specified'}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Status: <span className="font-semibold">Correction Requested</span>
                    </p>
                    {submission.rejection_reason && (
                      <p className="text-[11px] text-amber-500 mt-1">Feedback: {submission.rejection_reason}</p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" className="w-full md:w-auto" onClick={() => navigate(getCorrectionLink(submission))}>
                    Submit Correction
                  </Button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Revenue Banner */}
        {stats.monthlyRevenue > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Monthly Revenue Pool</p>
                <p className="text-lg font-heading font-bold text-primary">{formatCurrency(stats.monthlyRevenue)}</p>
              </div>
            </div>
          </motion.div>
        )}

        <ActivityStreak submissions={submissions} />

        {/* Active Contracts */}
        <ActiveContracts />

        {/* Profession Setup Prompt */}
        {designer && (!designer.professions || designer.professions.length === 0) && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="mb-6 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Target className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-500 mb-1">Set Your Profession</p>
                <p className="text-xs text-muted-foreground">You haven't set your profession yet. Please update your profile so you can claim jobs that match your skills.</p>
              </div>
              <Button size="sm" variant="outline" className="text-xs border-amber-500/30 text-amber-500 hover:bg-amber-500/10" onClick={() => navigate('/edit-profile')}>
                Update Profile
              </Button>
            </div>
          </motion.div>
        )}

        {/* Project Marketplace Section */}
        <div className="mb-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-heading font-bold">Project Marketplace</h2>
              <p className="text-xs text-muted-foreground mt-1">Claim active contracts matching your skills</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/marketplace')}
              className="group border-primary/20 hover:border-primary/40 bg-primary/5"
            >
              View Full Marketplace
              <ArrowUpRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Button>
          </div>
          <ProjectMarketplace />
        </div>

        {/* Earnings Breakdown & Goal Tracker */}
        {user && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
            <EarningsChart userId={user.id} />
            <GoalTracker userId={user.id} currentPoints={designer?.monthly_points || 0} currentSubmissions={stats.totalSubmissions} />
          </div>
        )}

        {user && (
          <div className="mb-6">
            <WithdrawCard userId={user.id} availableBalance={stats.estSalary} />
          </div>
        )}


        {/* Designer Portfolio */}
        {user && (
          <div className="mb-6">
            <DesignerPortfolio userId={user.id} />
          </div>
        )}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="mb-6 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Brain className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-heading font-bold">AI Talent Score</h2>
                <p className="text-[10px] text-muted-foreground">
                  {designer?.talent_score_updated_at
                    ? `Updated ${ new Date(designer.talent_score_updated_at).toLocaleDateString() } `
                    : 'Not yet calculated'}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={recalculateTalentScore} disabled={recalculating} className="text-xs h-8">
              <RefreshCw className={`w - 3.5 h - 3.5 mr - 1 ${ recalculating ? 'animate-spin' : '' } `} />
              {recalculating ? 'Calculating...' : 'Refresh'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-5">
              {/* Score Ring */}
              <div className="relative w-20 h-20 flex-shrink-0">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--primary))" strokeWidth="6"
                    strokeLinecap="round" strokeDasharray={`${ (designer?.talent_score || 0) * 2.64 } 264`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-heading font-bold">{designer?.talent_score || 0}</span>
                </div>
              </div>
              <div className="space-y-2 flex-1 min-w-0">
                {designer?.talent_score_breakdown && Object.entries(designer.talent_score_breakdown)
                  .filter(([key]) => !['ai_insight', 'total_submissions'].includes(key))
                  .map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground capitalize w-20 truncate">{key.replace(/_/g, ' ')}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${ Math.min(100, Number(value)) }% ` }}
                          transition={{ duration: 0.8, delay: 0.5 }}
                          className="h-full rounded-full bg-primary"
                        />
                      </div>
                      <span className="text-[10px] font-bold w-6 text-right">{Number(value)}</span>
                    </div>
                  ))
                }
              </div>
            </div>

            <div className="flex flex-col justify-center">
              {designer?.talent_score_breakdown?.ai_insight ? (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold">AI Insight</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{designer.talent_score_breakdown.ai_insight}</p>
                </div>
              ) : (
                <div className="text-center p-4">
                  <Brain className="w-8 h-8 text-muted mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Click "Refresh" for AI-powered insights</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Three Column Grid: Submissions, Leaderboard, Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Live Feed (Replaces original Recent Submissions) */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <LiveFeed submissions={submissions} activeJobs={activeJobs} />
          </motion.div>

          {/* Leaderboard */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-heading font-bold">Leaderboard</h2>
              <Trophy className="w-4 h-4 text-yellow-500" />
            </div>
            {leaderboard.length > 0 ? (
              <div className="space-y-1 mt-3">
                {leaderboard
                  .sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
                  .slice(0, 8)
                  .map((entry, idx) => {
                    const isMe = entry.user_id === user?.id;
                    return (
                      <div key={entry.user_id}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-colors ${isMe ? 'bg-primary/5 border border-primary/15' : 'hover:bg-muted/20'}`}>
                        <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                          {getRankIcon(idx + 1)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold truncate ${isMe ? 'text-primary' : ''}`}>
                            {entry.full_name} {isMe && <span className="text-[9px] opacity-60">(You)</span>}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs font-bold text-primary">{entry.total_points || 0} pts</div>
                          <div className="text-[10px] text-muted-foreground">{entry.professional_title}</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Trophy className="w-8 h-8 text-muted mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No data yet</p>
              </div>
            )}
          </motion.div>

          {/* Quick Actions */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
            className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5">
            <h2 className="text-sm font-heading font-bold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {[
                {
                  label: hasStartedProject ? `In Progress: ${ startedProjectInfo?.title } ` : 'Start Work', icon: PlayCircle, action: () => {
                    if (hasStartedProject) {
                      toast({ title: 'Project Already Started', description: `You must submit your work for "${startedProjectInfo?.title}" before starting another.`, variant: 'destructive' });
                      return;
                    }
                    setStartWorkingOpen(true);
                  }, primary: true
                },
                { label: 'Submit New Work', icon: Upload, action: () => navigate('/submit-work') },
                { label: 'Payment Settings', icon: Wallet, action: () => navigate('/payments') },
                { label: 'Edit Profile', icon: Settings, action: () => navigate('/edit-profile') },
              ].map((action) => (
                <button key={action.label} onClick={action.action}
                  className={`w - full flex items - center gap - 3 p - 3 rounded - xl text - left transition - all duration - 200 group
                    ${
      action.primary
      ? 'bg-primary/10 border border-primary/20 hover:bg-primary/15 hover:border-primary/30'
      : 'hover:bg-muted/30 border border-transparent'
    } `}>
                  <div className={`w - 8 h - 8 rounded - lg flex items - center justify - center flex - shrink - 0 ${ action.primary ? 'bg-primary/20' : 'bg-muted/50' } `}>
                    <action.icon className={`w - 4 h - 4 ${ action.primary ? 'text-primary' : 'text-muted-foreground' } `} />
                  </div>
                  <span className={`text - xs font - medium flex - 1 ${ action.primary ? 'text-primary' : 'text-foreground' } `}>{action.label}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>

            {/* Points System */}
            <div className="mt-5 p-4 rounded-xl bg-muted/20 border border-border/40">
              <p className="text-[11px] font-semibold mb-2 flex items-center gap-1.5">
                <Star className="w-3 h-3 text-primary" /> Points System
              </p>
              <div className="space-y-1.5 text-[10px] text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>PH Approval</span>
                  <span className="font-bold text-primary">+15 pts</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Client Acceptance</span>
                  <span className="font-bold text-primary">varies</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Start Working Dialog */}
      <Dialog open={startWorkingOpen} onOpenChange={setStartWorkingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Work</DialogTitle>
            <DialogDescription>Select the project you're starting. Admin will be notified via email.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={startWorkingProject} onValueChange={setStartWorkingProject}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingJobs ? 'Loading jobs...' : 'Select a project'} />
                </SelectTrigger>
                <SelectContent>
                  {activeJobs.length === 0 && !loadingJobs && (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">No jobs available for your profession</div>
                  )}
                  {activeJobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStartWorkingOpen(false)}>Cancel</Button>
            <Button onClick={handleStartWorking} disabled={!startWorkingProject.trim() || startWorkingSending}>
              {startWorkingSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-2" />}
              {startWorkingSending ? 'Sending...' : 'Notify Admin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExpectedSalaryModal
        open={showSalaryModal}
        onOpenChange={setShowSalaryModal}
        submissions={submissions}
        formatCurrency={formatCurrency}
      />
    </DashboardLayout >
  );
};

export default Dashboard;
