import { motion } from 'framer-motion';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface Designer {
  id: string;
  full_name: string;
  email: string;
  designer_details?: {
    total_points: number;
    monthly_points: number;
    professional_title: string;
    profile_photo_url: string;
  };
}

interface TopDesignersProps {
  users: Designer[];
}

const rankIcons = [
  { icon: Trophy, color: 'text-amber-400' },
  { icon: Medal, color: 'text-slate-400' },
  { icon: Medal, color: 'text-amber-700' },
];

export const TopDesigners = ({ users }: TopDesignersProps) => {
  const designers = users
    .filter(u => u.designer_details && (u.designer_details.total_points || 0) > 0)
    .sort((a, b) => (b.designer_details?.total_points || 0) - (a.designer_details?.total_points || 0))
    .slice(0, 5);

  const maxPoints = designers[0]?.designer_details?.total_points || 1;

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            Top Designers
          </CardTitle>
          <Badge variant="outline" className="text-xs">By Points</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {designers.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">No designers with points yet</p>
        ) : (
          designers.map((designer, index) => {
            const points = designer.designer_details?.total_points || 0;
            const monthlyPts = designer.designer_details?.monthly_points || 0;
            const progress = (points / maxPoints) * 100;
            const RankIcon = rankIcons[index]?.icon || Award;
            const rankColor = rankIcons[index]?.color || 'text-muted-foreground';

            return (
              <motion.div
                key={designer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className={`flex-shrink-0 ${rankColor}`}>
                  <RankIcon className="w-5 h-5" />
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  {designer.designer_details?.profile_photo_url ? (
                    <img
                      src={designer.designer_details.profile_photo_url}
                      alt={designer.full_name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold text-primary">
                      {(designer.full_name?.charAt(0) || '?').toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold truncate">{designer.full_name || 'Unknown'}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold">{points}</span>
                      {monthlyPts > 0 && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-green-500 border-green-500">
                          <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                          +{monthlyPts}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              </motion.div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
