import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const SERVICE_LABELS: Record<string, string> = {
  logo: 'Logo', branding: 'Brand', uiux: 'UI/UX', web: 'Web', print: 'Print', flyer: 'Flyer',
};

interface EarningsChartProps {
  userId: string;
}

const EarningsChart = ({ userId }: EarningsChartProps) => {
  const [byType, setByType] = useState<any[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;
    loadData();
  }, [userId]);

  const loadData = async () => {
    const { data: subs } = await supabase
      .from('submissions')
      .select('service_type, points_awarded, created_at, status')
      .eq('designer_id', userId);

    if (!subs) return;

    // Points by service type
    const typePoints: Record<string, number> = {};
    subs.forEach(s => {
      if (s.points_awarded && s.points_awarded > 0) {
        const key = SERVICE_LABELS[s.service_type] || s.service_type;
        typePoints[key] = (typePoints[key] || 0) + s.points_awarded;
      }
    });
    setByType(Object.entries(typePoints).map(([name, points]) => ({ name, points })));

    // Monthly trend (last 6 months)
    const months: Record<string, number> = {};
    subs.forEach(s => {
      if (s.points_awarded && s.points_awarded > 0) {
        const d = new Date(s.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months[key] = (months[key] || 0) + s.points_awarded;
      }
    });
    const sorted = Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, points]) => {
        const [y, m] = month.split('-');
        const label = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en', { month: 'short' });
        return { month: label, points };
      });
    setMonthlyTrend(sorted);
  };

  if (byType.length === 0 && monthlyTrend.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <DollarSign className="w-4 h-4 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-sm font-heading font-bold">Earnings Breakdown</h2>
          <p className="text-[10px] text-muted-foreground">Points earned by service type</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {byType.length > 0 && (
          <div>
            <p className="text-[11px] text-muted-foreground mb-2 font-medium">By Service Type</p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byType} cx="50%" cy="50%" innerRadius={34} outerRadius={58} dataKey="points" stroke="rgba(255,255,255,0.05)" strokeWidth={2}
                    label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''} labelLine={false}>
                    {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} className="hover:opacity-80 transition-opacity drop-shadow-md" />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      fontSize: 11,
                      background: 'rgba(20, 20, 25, 0.7)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px'
                    }}
                    itemStyle={{ fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {monthlyTrend.length > 0 && (
          <div>
            <p className="text-[11px] text-muted-foreground mb-2 font-medium">Monthly Points</p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      fontSize: 11,
                      background: 'rgba(20, 20, 25, 0.7)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px'
                    }}
                    itemStyle={{ color: 'hsl(var(--primary))', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="points" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorPoints)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EarningsChart;
