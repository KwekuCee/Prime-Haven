import { useState, useEffect } from 'react';
import { Target, Save, Trophy, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface GoalTrackerProps {
  userId: string;
  currentPoints: number;
  currentSubmissions: number;
}

const GoalTracker = ({ userId, currentPoints, currentSubmissions }: GoalTrackerProps) => {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [goals, setGoals] = useState({ pointsGoal: 200, submissionsGoal: 10 });
  const [tempGoals, setTempGoals] = useState({ pointsGoal: '200', submissionsGoal: '10' });

  useEffect(() => {
    const stored = localStorage.getItem(`goals_${userId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setGoals(parsed);
        setTempGoals({ pointsGoal: String(parsed.pointsGoal), submissionsGoal: String(parsed.submissionsGoal) });
      } catch {}
    }
  }, [userId]);

  const saveGoals = () => {
    const pts = parseInt(tempGoals.pointsGoal) || 200;
    const subs = parseInt(tempGoals.submissionsGoal) || 10;
    const newGoals = { pointsGoal: pts, submissionsGoal: subs };
    setGoals(newGoals);
    localStorage.setItem(`goals_${userId}`, JSON.stringify(newGoals));
    setEditing(false);
    toast({ title: 'Goals Updated', description: 'Keep pushing!' });
  };

  const pointsProgress = Math.min(100, (currentPoints / goals.pointsGoal) * 100);
  const subsProgress = Math.min(100, (currentSubmissions / goals.submissionsGoal) * 100);

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Target className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h2 className="text-sm font-heading font-bold">Monthly Goals</h2>
            <p className="text-[10px] text-muted-foreground">Track your targets</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setEditing(!editing)}>
          {editing ? 'Cancel' : 'Edit'}
        </Button>
      </div>

      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Points Target</label>
            <Input type="number" value={tempGoals.pointsGoal} onChange={e => setTempGoals(p => ({ ...p, pointsGoal: e.target.value }))} className="h-8 mt-1" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Submissions Target</label>
            <Input type="number" value={tempGoals.submissionsGoal} onChange={e => setTempGoals(p => ({ ...p, submissionsGoal: e.target.value }))} className="h-8 mt-1" />
          </div>
          <Button size="sm" className="w-full h-8 text-xs" onClick={saveGoals}>
            <Save className="w-3 h-3 mr-1.5" />Save Goals
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium flex items-center gap-1.5">
                <Flame className="w-3 h-3 text-primary" />Points
              </span>
              <span className="text-xs font-bold text-primary">{currentPoints}/{goals.pointsGoal}</span>
            </div>
            <Progress value={pointsProgress} className="h-2" />
            {pointsProgress >= 100 && (
              <p className="text-[10px] text-emerald-500 font-medium mt-1 flex items-center gap-1">
                <Trophy className="w-3 h-3" />Goal reached!
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium flex items-center gap-1.5">
                <Target className="w-3 h-3 text-amber-500" />Submissions
              </span>
              <span className="text-xs font-bold text-amber-500">{currentSubmissions}/{goals.submissionsGoal}</span>
            </div>
            <Progress value={subsProgress} className="h-2" />
            {subsProgress >= 100 && (
              <p className="text-[10px] text-emerald-500 font-medium mt-1 flex items-center gap-1">
                <Trophy className="w-3 h-3" />Goal reached!
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalTracker;
