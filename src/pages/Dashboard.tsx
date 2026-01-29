import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  TrendingUp,
  Award,
  Clock,
  FileCheck,
  Upload,
  Wallet,
  Settings,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

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
}

interface Submission {
  id: string;
  project_name: string;
  status: string;
  points_awarded: number;
  client_preference: boolean;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [designer, setDesigner] = useState<DesignerData | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState({
    totalPoints: 0,
    monthlyRank: 0,
    totalDesigners: 0,
    estSalary: 0,
    totalSubmissions: 0,
    approvedSubmissions: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    const loadDashboardData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Load profile, designer details, and submissions in parallel
        const [profileResult, designerResult, submissionsResult] = await Promise.all([
          supabase.from('profiles').select('full_name, email_verified, registration_fee_paid').eq('id', user.id).maybeSingle(),
          supabase.from('designer_details').select('total_points, monthly_points, salary_estimated, professional_title').eq('user_id', user.id).maybeSingle(),
          supabase.from('submissions').select('*').eq('designer_id', user.id).order('created_at', { ascending: false }).limit(10)
        ]);

        if (profileResult.data) {
          setProfile(profileResult.data);
        }

        if (designerResult.data) {
          setDesigner(designerResult.data);
        }

        if (submissionsResult.data) {
          setSubmissions(submissionsResult.data);
          
          // Calculate stats
          const approvedCount = submissionsResult.data.filter(s => s.status === 'approved').length;
          setStats({
            totalPoints: designerResult.data?.total_points || 0,
            monthlyRank: 0, // Would need to query all designers to calculate
            totalDesigners: 0,
            estSalary: designerResult.data?.salary_estimated || 0,
            totalSubmissions: submissionsResult.data.length,
            approvedSubmissions: approvedCount,
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
    if (submission.client_preference) return 'preference';
    if (submission.status === 'approved') return 'approved';
    if (submission.status === 'revision') return 'revision';
    return 'submitted';
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
      value: `GH₵${stats.estSalary.toFixed(2)}`, 
      icon: Wallet, 
      trend: 'Based on current points' 
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
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-heading font-bold mb-2">
            Welcome back, <span className="text-gradient">{getFirstName()}</span>
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your performance this month.
          </p>
        </motion.div>

        {/* Verification Alerts */}
        {profile && (!profile.email_verified || !profile.registration_fee_paid) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30"
          >
            <p className="text-sm font-medium text-amber-500 mb-2">Action Required:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {!profile.email_verified && (
                <li>• Please verify your email address to unlock all features</li>
              )}
              {!profile.registration_fee_paid && (
                <li>• Complete your registration fee payment (GH₵50.00) to start submitting work</li>
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
              <p className="text-muted-foreground text-sm">{stat.label}</p>
              <p className="text-xs text-primary mt-2">{stat.trend}</p>
            </motion.div>
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    <div key={submission.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          activityType === 'approved' ? 'bg-green-500' :
                          activityType === 'preference' ? 'bg-primary' :
                          activityType === 'revision' ? 'bg-yellow-500' :
                          'bg-muted-foreground'
                        }`} />
                        <div>
                          <p className="font-medium text-sm">{submission.project_name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{activityType}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {submission.points_awarded > 0 && (
                          <p className="text-sm text-primary font-medium">+{submission.points_awarded} pts</p>
                        )}
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getTimeAgo(submission.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No submissions yet</p>
                <p className="text-sm text-muted-foreground">Start by submitting your first work!</p>
              </div>
            )}
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass rounded-2xl p-6"
          >
            <h2 className="text-xl font-heading font-bold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Button 
                variant="primary" 
                className="w-full justify-start"
                onClick={() => navigate('/submit-work')}
              >
                <Upload className="w-4 h-4 mr-2" />
                Submit New Work
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/payments')}
              >
                <Wallet className="w-4 h-4 mr-2" />
                Update Payment Method
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/edit-profile')}
              >
                <Settings className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Points System:</strong><br />
                • Submission: +15 pts<br />
                • Client Preference: +40 pts<br />
                • Revision: +5 pts
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
