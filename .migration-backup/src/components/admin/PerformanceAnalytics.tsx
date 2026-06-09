import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Target, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const PerformanceAnalytics = () => {
  const [submissionsByType, setSubmissionsByType] = useState<any[]>([]);
  const [approvalRates, setApprovalRates] = useState<any[]>([]);
  const [topPerformers, setTopPerformers] = useState<any[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    const [{ data: subs }, { data: designers }, { data: profiles }] = await Promise.all([
      supabase.from('submissions').select('id, service_type, status, created_at, designer_id, points_awarded'),
      supabase.from('designer_details').select('user_id, total_points, monthly_points, professional_title'),
      supabase.from('profiles').select('id, full_name'),
    ]);

    if (!subs) return;
    const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

    // Submissions by type
    const typeCount: Record<string, number> = {};
    subs.forEach(s => { typeCount[s.service_type] = (typeCount[s.service_type] || 0) + 1; });
    setSubmissionsByType(Object.entries(typeCount).map(([name, value]) => ({ name, value })));

    // Approval rates
    const statusCount: Record<string, number> = {};
    subs.forEach(s => { statusCount[s.status || 'pending'] = (statusCount[s.status || 'pending'] || 0) + 1; });
    setApprovalRates(Object.entries(statusCount).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value })));

    // Top performers
    const sorted = (designers || [])
      .map(d => ({ ...d, name: profileMap.get(d.user_id) || 'Unknown' }))
      .sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
      .slice(0, 8);
    setTopPerformers(sorted);

    // Weekly trend (last 8 weeks)
    const weeks: Record<string, number> = {};
    const now = Date.now();
    subs.forEach(s => {
      const weeksAgo = Math.floor((now - new Date(s.created_at).getTime()) / (7 * 24 * 60 * 60 * 1000));
      if (weeksAgo < 8) {
        const label = weeksAgo === 0 ? 'This Week' : `${weeksAgo}w ago`;
        weeks[label] = (weeks[label] || 0) + 1;
      }
    });
    setWeeklyTrend(
      Array.from({ length: 8 }, (_, i) => {
        const label = i === 0 ? 'This Week' : `${i}w ago`;
        return { week: label, submissions: weeks[label] || 0 };
      }).reverse()
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h2 className="text-base font-bold">Performance Analytics</h2>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="h-8 gap-0.5">
          <TabsTrigger value="overview" className="text-xs h-6">Overview</TabsTrigger>
          <TabsTrigger value="trends" className="text-xs h-6">Trends</TabsTrigger>
          <TabsTrigger value="performers" className="text-xs h-6">Top Performers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Submissions by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={submissionsByType}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 11, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={approvalRates} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {approvalRates.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 11, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="mt-0">
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Weekly Submission Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 11, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Line type="monotone" dataKey="submissions" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--primary))' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performers" className="mt-0">
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Trophy className="w-4 h-4 text-yellow-500" />Top Performers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topPerformers.map((p, i) => (
                  <div key={p.user_id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/30 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      #{i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.professional_title || 'Designer'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{p.total_points || 0}</p>
                      <p className="text-[10px] text-muted-foreground">+{p.monthly_points || 0} this month</p>
                    </div>
                  </div>
                ))}
                {topPerformers.length === 0 && (
                  <p className="text-center py-8 text-xs text-muted-foreground">No data yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceAnalytics;
