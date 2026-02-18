import { motion } from 'framer-motion';
import { CheckCircle, XCircle, UserPlus, DollarSign, FileCheck, Award, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'submission' | 'approval' | 'rejection' | 'payment' | 'signup' | 'points';
  title: string;
  description: string;
  timestamp: string;
}

interface RecentActivityProps {
  submissions: Array<{
    id: string;
    project_name: string;
    designer_name: string;
    status: string;
    ph_approved: boolean;
    client_accepted: boolean;
    created_at: string;
    updated_at: string;
    points_awarded: number;
  }>;
  payments: Array<{
    id: string;
    user_name: string;
    amount: number;
    status: string;
    created_at: string;
  }>;
  users: Array<{
    id: string;
    full_name: string;
    created_at: string;
  }>;
}

const activityIcons: Record<string, { icon: typeof CheckCircle; color: string }> = {
  submission: { icon: FileCheck, color: 'text-blue-500' },
  approval: { icon: CheckCircle, color: 'text-green-500' },
  rejection: { icon: XCircle, color: 'text-destructive' },
  payment: { icon: DollarSign, color: 'text-emerald-500' },
  signup: { icon: UserPlus, color: 'text-primary' },
  points: { icon: Award, color: 'text-amber-500' },
};

export const RecentActivity = ({ submissions, payments, users }: RecentActivityProps) => {
  // Build activity feed from real data
  const activities: ActivityItem[] = [];

  // Recent submissions
  submissions.slice(0, 10).forEach(s => {
    if (s.client_accepted) {
      activities.push({
        id: `approval-${s.id}`,
        type: 'approval',
        title: `"${s.project_name}" fully approved`,
        description: `${s.designer_name} earned ${s.points_awarded} pts`,
        timestamp: s.updated_at,
      });
    } else if (s.ph_approved) {
      activities.push({
        id: `ph-${s.id}`,
        type: 'approval',
        title: `"${s.project_name}" PH approved`,
        description: `By ${s.designer_name}`,
        timestamp: s.updated_at,
      });
    } else if (s.status === 'rejected') {
      activities.push({
        id: `reject-${s.id}`,
        type: 'rejection',
        title: `"${s.project_name}" rejected`,
        description: `Submitted by ${s.designer_name}`,
        timestamp: s.updated_at,
      });
    } else {
      activities.push({
        id: `sub-${s.id}`,
        type: 'submission',
        title: `New submission: "${s.project_name}"`,
        description: `By ${s.designer_name}`,
        timestamp: s.created_at,
      });
    }
  });

  // Recent payments
  payments.slice(0, 5).forEach(p => {
    activities.push({
      id: `pay-${p.id}`,
      type: 'payment',
      title: `Payment: GH₵${(p.amount / 100).toFixed(2)}`,
      description: `From ${p.user_name} • ${p.status}`,
      timestamp: p.created_at,
    });
  });

  // Recent signups
  users.slice(0, 5).forEach(u => {
    activities.push({
      id: `user-${u.id}`,
      type: 'signup',
      title: `New member joined`,
      description: u.full_name || 'New user',
      timestamp: u.created_at,
    });
  });

  // Sort by timestamp descending
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const displayActivities = activities.slice(0, 8);

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Recent Activity
          </CardTitle>
          <Badge variant="outline" className="text-xs">{activities.length} events</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {displayActivities.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">No recent activity</p>
        ) : (
          displayActivities.map((activity, index) => {
            const { icon: Icon, color } = activityIcons[activity.type] || activityIcons.submission;
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className={`mt-0.5 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{activity.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </span>
              </motion.div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
