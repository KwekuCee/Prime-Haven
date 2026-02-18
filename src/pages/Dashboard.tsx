import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp,
  Award,
  Clock,
  FileCheck,
  Upload,
  Wallet,
  Settings,
  Loader2,
  Trophy,
  Medal,
  Star,
  DollarSign,
  EyeOff,
  Zap,
  Brain,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useUserSettings } from '@/contexts/UserSettingsContext';

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

interface SystemSettings {
  monthly_revenue?: { amount: number; currency: string };
  revenue_share_percentage?: { value: number };
}

const normalizeCategory = (title: string | null): string => {
  const t = (title || '').toLowerCase();
  if (t.includes('ui') || t.includes('ux')) return 'UI/UX Designer';
  if (t.includes('web') || t.includes('dev') || t.includes('frontend') || t.includes('fullstack') || t.includes('full-stack') || t.includes('backend')) return 'Web Developer';
  return 'Graphic Designer';
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { settings, formatCurrency } = useUserSettings();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [designer, setDesigner] = useState<DesignerData | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({});
  const [stats, setStats] = useState({
    totalPoints: 0,
    monthlyRank: 0,
    totalDesigners: 0,
    estSalary: 0,
    totalSubmissions: 0,
    approvedSubmissions: 0,
    monthlyRevenue: 0,
  });
  const [recalculating, setRecalculating] = useState(false);

  const recalculateTalentScore = async () => {
    if (!user) return;
    setRecalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-talent-score', {
        body: { designer_id: user.id },
      });
      if (error) throw error;
      // Refresh designer data
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

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    const loadDashboardData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Load all data in parallel
        const [profileResult, designerResult, submissionsResult, designersResult, profilesResult, settingsResult] = await Promise.all([
          supabase.from('profiles').select('full_name, email_verified, registration_fee_paid').eq('id', user.id).maybeSingle(),
          supabase.from('designer_details').select('total_points, monthly_points, salary_estimated, professional_title, talent_score, talent_score_breakdown, talent_score_updated_at').eq('user_id', user.id).maybeSingle(),
          supabase.from('submissions').select('*').eq('designer_id', user.id).order('created_at', { ascending: false }).limit(10),
          supabase.from('designer_details')
            .select('user_id, total_points, monthly_points, professional_title, talent_score')
            .order('total_points', { ascending: false }),
          supabase.from('profiles').select('id, full_name'),
          supabase.from('system_settings').select('key, value')
        ]);

        if (profileResult.data) {
          setProfile(profileResult.data);
        }

        if (designerResult.data) {
          setDesigner(designerResult.data);
        }

        if (submissionsResult.data) {
          setSubmissions(submissionsResult.data);
        }

        // Process leaderboard - create a map of user_id to full_name from profiles
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

          // Calculate user's rank within their profession category
          const userCategory = normalizeCategory(designerResult.data?.professional_title || null);
          const categoryLeaderboard = processedLeaderboard
            .filter(e => normalizeCategory(e.professional_title) === userCategory)
            .sort((a, b) => (b.total_points || 0) - (a.total_points || 0));
          const userRank = categoryLeaderboard.findIndex(e => e.user_id === user.id) + 1;
          
          // Get system settings
          let monthlyRevenue = 0;
          let revenueShare = 50;
          if (settingsResult.data) {
            const settings: any = {};
            settingsResult.data.forEach((item: any) => {
              settings[item.key] = item.value;
            });
            setSystemSettings(settings);
            monthlyRevenue = settings.monthly_revenue?.amount || 0;
            revenueShare = settings.revenue_share_percentage?.value || 50;
          }

          // Calculate estimated salary based on points share
          const totalAllPoints = processedLeaderboard.reduce((sum, e) => sum + (e.monthly_points || 0), 0);
          const userMonthlyPoints = designerResult.data?.monthly_points || 0;
          const estSalary = totalAllPoints > 0 
            ? ((userMonthlyPoints / totalAllPoints) * (monthlyRevenue * (revenueShare / 100)))
            : 0;

          const approvedCount = submissionsResult.data?.filter((s: any) => s.status === 'approved' || s.client_accepted).length || 0;
          
          setStats({
            totalPoints: designerResult.data?.total_points || 0,
            monthlyRank: userRank || 0,
            totalDesigners: categoryLeaderboard.length,
            estSalary: estSalary,
            totalSubmissions: submissionsResult.data?.length || 0,
            approvedSubmissions: approvedCount,
            monthlyRevenue: monthlyRevenue,
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

  const getFirstName = () => {
    if (!profile?.full_name) return 'Designer';
    return profile.full_name.split(' ')[0];
  };

  const getActivityType = (submission: Submission) => {
    if (submission.client_accepted) return 'client_accepted';
    if (submission.status === 'correction_requested') return 'correction_requested';
    if (submission.status === 'client_rejected') return 'client_rejected';
    if (submission.ph_approved) return 'ph_approved';
    if (submission.client_preference) return 'preference';
    if (submission.status === 'approved') return 'approved';
    if (submission.status === 'revision') return 'revision';
    if (submission.status === 'rejected') return 'rejected';
    return 'submitted';
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'client_accepted': return 'Client Accepted (+40 pts)';
      case 'ph_approved': return 'PH Approved (+15 pts)';
      case 'preference': return 'Client Preference';
      case 'approved': return 'Approved';
      case 'revision': return 'Needs Revision';
      case 'rejected': return 'Rejected';
      case 'correction_requested': return 'Correction Requested';
      case 'client_rejected': return 'Client Rejected';
      default: return 'Submitted';
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
  };

  const showEarnings = settings.show_earnings;

  const statsData = [
    { 
      label: 'Total Points', 
      value: stats.totalPoints.toLocaleString(), 
      icon: Award, 
      trend: `+${designer?.monthly_points || 0} this month` 
    },
    { 
      label: 'Monthly Rank', 
      value: stats.monthlyRank > 0 ? `#${stats.monthlyRank}` : 'N/A', 
      icon: TrendingUp, 
      trend: stats.totalDesigners > 0 ? `of ${stats.totalDesigners} designers` : 'Calculating...' 
    },
    { 
      label: 'Est. Salary', 
      value: showEarnings ? formatCurrency(stats.estSalary) : '••••••', 
      icon: showEarnings ? Wallet : EyeOff, 
      trend: showEarnings ? 'Based on current points' : 'Hidden — enable in Settings'
    },
    { 
      label: 'Submissions', 
      value: stats.totalSubmissions.toString(), 
      icon: FileCheck, 
      trend: `${stats.approvedSubmissions} approved` 
    },
  ];

  if (loading || authLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-heading font-bold mb-2">
            Welcome back, <span className="text-gradient">{getFirstName()}</span>
          </h1>
          <p className="text-muted-foreground font-medium">
            Here's an overview of your performance this month.
          </p>
        </motion.div>

        {/* Monthly Revenue Banner */}
        {stats.monthlyRevenue > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">This Month's Revenue Pool</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(stats.monthlyRevenue)}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Verification Alerts */}
        {profile && (!profile.email_verified || !profile.registration_fee_paid) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30"
          >
            <p className="text-sm font-semibold text-amber-500 mb-2">Action Required:</p>
            <ul className="text-sm text-muted-foreground space-y-1 font-medium">
              {!profile.email_verified && (
                <li>• Please verify your email address to unlock all features</li>
              )}
              {!profile.registration_fee_paid && (
                <li>• Complete your registration fee payment (GH₵100.00) to start submitting work</li>
              )}
            </ul>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statsData.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass rounded-2xl p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-heading font-bold mb-1">{stat.value}</p>
              <p className="text-muted-foreground text-sm font-semibold">{stat.label}</p>
              <p className="text-xs text-primary mt-2 font-medium">{stat.trend}</p>
            </motion.div>
          ))}
        </div>

        {/* AI Talent Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-8 glass rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-heading font-bold">AI Talent Score</h2>
                <p className="text-xs text-muted-foreground font-medium">
                  {designer?.talent_score_updated_at 
                    ? `Updated ${new Date(designer.talent_score_updated_at).toLocaleDateString()}`
                    : 'Not yet calculated'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={recalculateTalentScore}
              disabled={recalculating}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${recalculating ? 'animate-spin' : ''}`} />
              {recalculating ? 'Calculating...' : 'Recalculate'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Score Circle */}
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24 flex-shrink-0">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="42" fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(designer?.talent_score || 0) * 2.64} 264`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-heading font-bold">{designer?.talent_score || 0}</span>
                </div>
              </div>
              <div className="space-y-2 flex-1">
                {designer?.talent_score_breakdown && Object.entries(designer.talent_score_breakdown)
                  .filter(([key]) => !['ai_insight', 'total_submissions'].includes(key))
                  .map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium capitalize w-28">{key.replace(/_/g, ' ')}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.min(100, Number(value))}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold w-8 text-right">{Number(value)}</span>
                    </div>
                  ))
                }
              </div>
            </div>

            {/* AI Insight */}
            <div className="flex flex-col justify-center">
              {designer?.talent_score_breakdown?.ai_insight ? (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold">AI Insight</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {designer.talent_score_breakdown.ai_insight}
                  </p>
                </div>
              ) : (
                <div className="text-center p-4">
                  <Brain className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground font-medium">
                    Click "Recalculate" to get your AI-powered talent score and personalized insights.
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass rounded-2xl p-6"
          >
            <h2 className="text-xl font-heading font-bold mb-4">Recent Activity</h2>
            {submissions.length > 0 ? (
              <div className="space-y-4">
                {submissions.slice(0, 5).map((submission) => {
                  const activityType = getActivityType(submission);
                  return (
                    <div key={submission.id} className="py-3 border-b border-border last:border-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            activityType === 'client_accepted' ? 'bg-primary' :
                            activityType === 'ph_approved' ? 'bg-green-500' :
                            activityType === 'approved' ? 'bg-green-500' :
                            activityType === 'preference' ? 'bg-primary' :
                            activityType === 'revision' ? 'bg-yellow-500' :
                            activityType === 'rejected' ? 'bg-red-500' :
                            'bg-muted-foreground'
                          }`} />
                          <div>
                            <p className="font-semibold text-sm">{submission.project_name}</p>
                            <p className="text-xs text-muted-foreground font-medium">{getActivityLabel(activityType)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {submission.points_awarded > 0 && (
                            <p className="text-sm text-primary font-bold">+{submission.points_awarded} pts</p>
                          )}
                          <p className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3" />
                            {getTimeAgo(submission.created_at)}
                          </p>
                        </div>
                      </div>
                      {(activityType === 'rejected' || activityType === 'client_rejected') && submission.rejection_reason && (
                        <div className="mt-2 ml-5 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                          <p className="text-xs font-semibold text-red-400 mb-0.5">Admin Feedback:</p>
                          <p className="text-xs text-muted-foreground">{submission.rejection_reason}</p>
                        </div>
                      )}
                      {activityType === 'correction_requested' && (
                        <div className="mt-2 ml-5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-white text-xs"
                            onClick={() => navigate(`/submit-work?correction=${submission.id}&project=${encodeURIComponent(submission.project_name)}&client=${encodeURIComponent(submission.client_ref || '')}&service=${submission.service_type || 'logo'}`)}
                          >
                            Submit Correction
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">No submissions yet</p>
                <p className="text-sm text-muted-foreground">Start by submitting your first work!</p>
              </div>
            )}
          </motion.div>

          {/* Leaderboard by Profession */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-heading font-bold">Leaderboard</h2>
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            {leaderboard.length > 0 ? (
              <Tabs defaultValue={designer?.professional_title || 'Graphic Designer'} className="w-full">
                <TabsList className="w-full mb-3 flex-wrap h-auto gap-1">
                  {['Graphic Designer', 'UI/UX Designer', 'Web Developer'].map((category) => {
                    const count = leaderboard.filter(e => normalizeCategory(e.professional_title) === category).length;
                    return (
                      <TabsTrigger key={category} value={category} className="text-xs flex-1 min-w-0">
                        {category.replace('Designer', '').replace('Developer', 'Dev').trim()} ({count})
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
                {['Graphic Designer', 'UI/UX Designer', 'Web Developer'].map((category) => {
                  const filtered = leaderboard
                    .filter(e => normalizeCategory(e.professional_title) === category)
                    .sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
                    .slice(0, 10);
                  return (
                    <TabsContent key={category} value={category}>
                      {filtered.length > 0 ? (
                        <div className="space-y-3">
                          {filtered.map((entry, index) => {
                            const isCurrentUser = entry.user_id === user?.id;
                            return (
                              <div 
                                key={entry.user_id} 
                                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                                  isCurrentUser ? 'bg-primary/10 border border-primary/30' : 'bg-muted/30 hover:bg-muted/50'
                                }`}
                              >
                                <div className="w-8 h-8 flex items-center justify-center">
                                  {getRankIcon(index + 1)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`font-semibold text-sm truncate ${isCurrentUser ? 'text-primary' : ''}`}>
                                    {entry.full_name}
                                    {isCurrentUser && <span className="text-xs ml-1">(You)</span>}
                                  </p>
                                </div>
                                <div className="text-right flex flex-col items-end gap-0.5">
                                  <p className="font-bold text-sm">{entry.total_points} pts</p>
                                  {entry.talent_score > 0 && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                                      ⚡ {entry.talent_score}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <p className="text-sm text-muted-foreground font-medium">No {category}s yet</p>
                        </div>
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>
            ) : (
              <div className="text-center py-8">
                <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">No data yet</p>
              </div>
            )}
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass rounded-2xl p-6"
          >
            <h2 className="text-xl font-heading font-bold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Button 
                variant="primary" 
                className="w-full justify-start font-semibold"
                onClick={() => navigate('/submit-work')}
              >
                <Upload className="w-4 h-4 mr-2" />
                Submit New Work
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start font-semibold"
                onClick={() => navigate('/payments')}
              >
                <Wallet className="w-4 h-4 mr-2" />
                Update Payment Method
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start font-semibold"
                onClick={() => navigate('/edit-profile')}
              >
                <Settings className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </div>

            {/* Points Info Box */}
            <div className="mt-6 p-4 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-sm font-semibold text-foreground mb-2">Points System:</p>
              <ul className="text-sm text-muted-foreground space-y-1 font-medium">
                <li className="flex items-center gap-2">
                  <Star className="w-3 h-3 text-primary" />
                  PH Approval: +15 pts
                </li>
                <li className="flex items-center gap-2">
                  <Award className="w-3 h-3 text-primary" />
                  Client Acceptance: +40 pts
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
