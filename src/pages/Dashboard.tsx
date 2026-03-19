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
import DashboardLayout from '@/components/DashboardLayout';
import AvailableJobs from '@/components/AvailableJobs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { useToast } from '@/hooks/use-toast';

interface ProfileData {
  full_name: string;
  email_verified: boolean;
  registration_fee_paid: boolean;
}

interface DesignerData {
  total_points: number;
  monthly_points: number;
  salary_estimated: number;
  professional_title: string;
  talent_score: number;
  talent_score_breakdown: any;
  talent_score_updated_at: string;
}

interface Submission {
  id: string;
  project_name: string;
  status: string;
  points_awarded: number;
  client_preference: boolean;
  ph_approved: boolean;
  client_accepted: boolean;
  created_at: string;
  rejection_reason?: string;
  parent_submission_id?: string;
  client_ref?: string;
  service_type?: string;
}

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  total_points: number;
  monthly_points: number;
  professional_title: string;
  talent_score: number;
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
  const [activeJobs, setActiveJobs] = useState<{ id: string; title: string }[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [hasStartedProject, setHasStartedProject] = useState(false);
  const [startedProjectInfo, setStartedProjectInfo] = useState<{ jobId: string; title: string; startedAt: string } | null>(null);

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
    if (!user || !startWorkingProject.trim()) return;
    setStartWorkingSending(true);
    try {
      const selectedJob = activeJobs.find(j => j.title === startWorkingProject);
      const { error } = await supabase.functions.invoke('notify-designer', {
        body: { designerId: user.id, projectName: startWorkingProject.trim(), notificationType: 'start_working' },
      });
      if (error) throw error;
      // Store started project info in localStorage
      localStorage.setItem(`started_project_${user.id}`, JSON.stringify({
        jobId: selectedJob?.id || '',
        title: startWorkingProject.trim(),
        startedAt: new Date().toISOString(),
      }));
      setHasStartedProject(true);
      toast({ title: 'Notification sent!', description: 'Admin has been notified that you started working.' });
      setStartWorkingOpen(false);
      setStartWorkingProject('');
    } catch (err) {
      console.error('Error sending start working notification:', err);
      toast({ title: 'Error', description: 'Failed to send notification. Please try again.', variant: 'destructive' });
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
          supabase.from('designer_details').select('total_points, monthly_points, salary_estimated, professional_title, talent_score, talent_score_breakdown, talent_score_updated_at').eq('user_id', user.id).maybeSingle(),
          supabase.from('submissions').select('*').eq('designer_id', user.id).order('created_at', { ascending: false }).limit(10),
          supabase.from('designer_details').select('user_id, total_points, monthly_points, professional_title, talent_score').order('total_points', { ascending: false }),
          supabase.from('profiles').select('id, full_name'),
          supabase.from('system_settings').select('key, value')
        ]);
        if (profileResult.data) setProfile(profileResult.data);
        if (designerResult.data) setDesigner(designerResult.data);
        if (submissionsResult.data) setSubmissions(submissionsResult.data);

        const profilesMap = new Map((profilesResult.data || []).map((p: any) => [p.id, p.full_name]));
        if (designersResult.data && designersResult.data.length > 0) {
          const processedLeaderboard: LeaderboardEntry[] = designersResult.data.map((entry: any) => ({
            user_id: entry.user_id,
            full_name: profilesMap.get(entry.user_id) || 'Anonymous',
            total_points: entry.total_points || 0,
            monthly_points: entry.monthly_points || 0,
            professional_title: entry.professional_title || 'Designer',
            talent_score: entry.talent_score || 0,
          }));
          setLeaderboard(processedLeaderboard);

          const userCategory = normalizeCategory(designerResult.data?.professional_title || null);
          const categoryLeaderboard = processedLeaderboard
            .filter(e => normalizeCategory(e.professional_title) === userCategory)
            .sort((a, b) => (b.total_points || 0) - (a.total_points || 0));
          const userRank = categoryLeaderboard.findIndex(e => e.user_id === user.id) + 1;

          let monthlyRevenue = 0;
          if (settingsResult.data) {
            const s: any = {};
            settingsResult.data.forEach((item: any) => { s[item.key] = item.value; });
            monthlyRevenue = s.monthly_revenue?.amount || 0;
          }

          setStats({
            totalPoints: designerResult.data?.total_points || 0,
            monthlyRank: userRank || 0,
            totalDesigners: categoryLeaderboard.length,
            estSalary: designerResult.data?.salary_estimated || 0,
            totalSubmissions: submissionsResult.data?.length || 0,
            approvedSubmissions: submissionsResult.data?.filter((s: any) => s.status === 'approved' || s.client_accepted).length || 0,
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
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(dateString).toLocaleDateString();
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-4 h-4 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-gray-400" />;
    if (rank === 3) return <Medal className="w-4 h-4 text-amber-600" />;
    return <span className="text-xs font-bold text-muted-foreground">#{rank}</span>;
  };

  const showEarnings = settings.show_earnings;

  if (loading || authLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
            </div>
            <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
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
            </div>
            <div className="flex gap-2">
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
              <Button size="sm" className="text-xs bg-primary hover:bg-primary/90" onClick={() => navigate('/submit-work')}>
                <Upload className="w-3.5 h-3.5 mr-1.5" /> Submit Work
              </Button>
            </div>
          </div>
        </motion.div>

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

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {[
            { label: 'Total Points', value: stats.totalPoints.toLocaleString(), sub: `+${designer?.monthly_points || 0} this month`, icon: Flame, iconColor: 'text-primary' },
            { label: 'Rank', value: stats.monthlyRank > 0 ? `#${stats.monthlyRank}` : '—', sub: `of ${stats.totalDesigners} designers`, icon: Trophy, iconColor: 'text-yellow-500' },
            { label: 'Est. Salary', value: showEarnings ? formatCurrency(stats.estSalary) : '••••', sub: showEarnings ? 'Based on points' : 'Hidden', icon: showEarnings ? Wallet : EyeOff, iconColor: 'text-emerald-500' },
            { label: 'Submissions', value: stats.totalSubmissions.toString(), sub: `${stats.approvedSubmissions} approved`, icon: FileCheck, iconColor: 'text-blue-500' },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.05 }}
              className="relative group rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-4 sm:p-5 hover:border-primary/20 hover:bg-card/60 transition-all duration-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
                <p className="text-2xl sm:text-3xl font-heading font-bold tracking-tight">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{stat.label}</p>
                <p className="text-[10px] text-primary mt-0.5 font-medium">{stat.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>

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

        {/* Available Jobs */}
        <AvailableJobs />

        {/* AI Talent Score */}
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
                    ? `Updated ${new Date(designer.talent_score_updated_at).toLocaleDateString()}`
                    : 'Not yet calculated'}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={recalculateTalentScore} disabled={recalculating} className="text-xs h-8">
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${recalculating ? 'animate-spin' : ''}`} />
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
                    strokeLinecap="round" strokeDasharray={`${(designer?.talent_score || 0) * 2.64} 264`}
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
                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, Number(value))}%` }}
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
          {/* Recent Submissions */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-heading font-bold">Recent Submissions</h2>
              <Badge variant="outline" className="text-[10px] px-2 py-0">{submissions.length}</Badge>
            </div>
            {submissions.length > 0 ? (
              <div className="space-y-1">
                {submissions.slice(0, 6).map((sub) => {
                  const type = getActivityType(sub);
                  return (
                    <div key={sub.id} className="group p-3 rounded-xl hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${getStatusColor(type)}`} />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate">{sub.project_name}</p>
                            <p className="text-[10px] text-muted-foreground">{getActivityLabel(type)}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {sub.points_awarded > 0 && (
                            <p className="text-[10px] text-primary font-bold">+{sub.points_awarded}</p>
                          )}
                          <p className="text-[9px] text-muted-foreground flex items-center gap-0.5 justify-end">
                            <Clock className="w-2.5 h-2.5" />{getTimeAgo(sub.created_at)}
                          </p>
                        </div>
                      </div>
                      {(type === 'rejected' || type === 'client_rejected') && sub.rejection_reason && (
                        <div className="mt-2 ml-4 p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                          <p className="text-[10px] text-red-400">{sub.rejection_reason}</p>
                        </div>
                      )}
                      {type === 'correction_requested' && (
                        <>
                          {sub.rejection_reason && (
                            <div className="mt-2 ml-4 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                              <p className="text-[10px] text-amber-400">{sub.rejection_reason}</p>
                            </div>
                          )}
                          <div className="mt-2 ml-4">
                            <Button size="sm" variant="outline"
                              className="h-6 text-[10px] border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-white"
                              onClick={() => navigate(`/submit-work?correction=${sub.id}&project=${encodeURIComponent(sub.project_name)}&client=${encodeURIComponent(sub.client_ref || '')}&service=${sub.service_type || 'logo'}`)}>
                              Submit Correction
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileCheck className="w-8 h-8 text-muted mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No submissions yet</p>
              </div>
            )}
          </motion.div>

          {/* Leaderboard */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-heading font-bold">Leaderboard</h2>
              <Trophy className="w-4 h-4 text-yellow-500" />
            </div>
            {leaderboard.length > 0 ? (
              <Tabs defaultValue={normalizeCategory(designer?.professional_title || null)} className="w-full">
                <TabsList className="w-full mb-3 h-8 gap-0.5 bg-muted/40">
                  {['Graphic Designer', 'UI/UX Designer', 'Web Developer'].map((cat) => (
                    <TabsTrigger key={cat} value={cat} className="text-[10px] flex-1 min-w-0 h-6 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                      {cat.replace('Designer', '').replace('Developer', 'Dev').trim()}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {['Graphic Designer', 'UI/UX Designer', 'Web Developer'].map((cat) => {
                  const filtered = leaderboard
                    .filter(e => normalizeCategory(e.professional_title) === cat)
                    .sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
                    .slice(0, 8);
                  return (
                    <TabsContent key={cat} value={cat} className="mt-0">
                      {filtered.length > 0 ? (
                        <div className="space-y-1">
                          {filtered.map((entry, idx) => {
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
                                  <p className="text-xs font-bold">{entry.total_points}</p>
                                  {entry.talent_score > 0 && (
                                    <span className="text-[9px] text-primary">⚡{entry.talent_score}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-center py-6 text-xs text-muted-foreground">No designers yet</p>
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>
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
                { label: 'Start Work', icon: PlayCircle, action: () => setStartWorkingOpen(true), primary: true },
                { label: 'Submit New Work', icon: Upload, action: () => navigate('/submit-work') },
                { label: 'Payment Settings', icon: Wallet, action: () => navigate('/payments') },
                { label: 'Edit Profile', icon: Settings, action: () => navigate('/edit-profile') },
              ].map((action) => (
                <button key={action.label} onClick={action.action}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 group
                    ${action.primary
                      ? 'bg-primary/10 border border-primary/20 hover:bg-primary/15 hover:border-primary/30'
                      : 'hover:bg-muted/30 border border-transparent'
                    }`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${action.primary ? 'bg-primary/20' : 'bg-muted/50'}`}>
                    <action.icon className={`w-4 h-4 ${action.primary ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <span className={`text-xs font-medium flex-1 ${action.primary ? 'text-primary' : 'text-foreground'}`}>{action.label}</span>
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
      <Dialog open={startWorkingOpen} onOpenChange={(open) => {
        setStartWorkingOpen(open);
        if (open) {
          setLoadingJobs(true);
          supabase
            .from('job_contracts')
            .select('id, title')
            .in('status', ['active', 'in_progress'])
            .order('created_at', { ascending: false })
            .then(({ data }) => {
              setActiveJobs(data || []);
              setLoadingJobs(false);
            });
        }
      }}>
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
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">No active jobs available</div>
                  )}
                  {activeJobs.map((job) => (
                    <SelectItem key={job.id} value={job.title}>{job.title}</SelectItem>
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
    </DashboardLayout>
  );
};

export default Dashboard;
