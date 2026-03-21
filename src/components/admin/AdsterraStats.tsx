import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, DollarSign, Eye, MousePointer, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, subDays } from 'date-fns';

interface StatRow {
  date?: string;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  revenue: number;
}

const dateRanges = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
];

const AdsterraStats = () => {
  const [stats, setStats] = useState<StatRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState('7');
  const [adsEnabled, setAdsEnabled] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const { toast } = useToast();

  // Load ad display setting
  useEffect(() => {
    const loadAdSetting = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'ads_enabled')
        .maybeSingle();
      if (data) {
        setAdsEnabled(data.value === true || data.value === 'true');
      }
    };
    loadAdSetting();
  }, []);

  const toggleAds = async (enabled: boolean) => {
    setToggleLoading(true);
    try {
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('key', 'ads_enabled')
        .maybeSingle();

      if (existing) {
        await supabase
          .from('system_settings')
          .update({ value: enabled, updated_at: new Date().toISOString() })
          .eq('key', 'ads_enabled');
      } else {
        await supabase
          .from('system_settings')
          .insert({ key: 'ads_enabled', value: enabled, description: 'Toggle ad display on the site' });
      }

      setAdsEnabled(enabled);
      toast({
        title: enabled ? 'Ads enabled' : 'Ads disabled',
        description: enabled ? 'Ads will now be displayed on the site.' : 'All ads have been hidden from the site.',
      });
    } catch (err: any) {
      toast({ title: 'Error updating ad setting', description: err.message, variant: 'destructive' });
    } finally {
      setToggleLoading(false);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const days = parseInt(range);
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      const finishDate = format(new Date(), 'yyyy-MM-dd');

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const url = `https://${projectId}.supabase.co/functions/v1/adsterra-stats?endpoint=stats&start_date=${startDate}&finish_date=${finishDate}&group_by=date`;

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
        },
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to fetch stats');
      }

      const items = Array.isArray(result) ? result : (result.items || []);
      setStats(items);
    } catch (err: any) {
      console.error('Adsterra fetch error:', err);
      toast({ title: 'Error fetching ad stats', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [range]);

  const totals = stats.reduce(
    (acc, row) => ({
      impressions: acc.impressions + (Number(row.impressions) || 0),
      clicks: acc.clicks + (Number(row.clicks) || 0),
      revenue: acc.revenue + (Number(row.revenue) || 0),
    }),
    { impressions: 0, clicks: 0, revenue: 0 }
  );

  const avgCtr = totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Ad Display Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="ads-toggle" className="text-base font-semibold">Ad Display</Label>
              <p className="text-sm text-muted-foreground">
                {adsEnabled ? 'Ads are currently visible on the site' : 'Ads are currently hidden from the site'}
              </p>
            </div>
            <Switch
              id="ads-toggle"
              checked={adsEnabled}
              onCheckedChange={toggleAds}
              disabled={toggleLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Adsterra Ad Revenue
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={range} onValueChange={setRange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dateRanges.map(r => (
                    <SelectItem key={r.days} value={String(r.days)}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchStats} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-muted/50 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <DollarSign className="w-4 h-4" /> Revenue
              </div>
              <p className="text-2xl font-bold text-primary">${totals.revenue.toFixed(2)}</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Eye className="w-4 h-4" /> Impressions
              </div>
              <p className="text-2xl font-bold">{totals.impressions.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <MousePointer className="w-4 h-4" /> Clicks
              </div>
              <p className="text-2xl font-bold">{totals.clicks.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <TrendingUp className="w-4 h-4" /> CTR
              </div>
              <p className="text-2xl font-bold">{avgCtr.toFixed(2)}%</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading stats...</div>
          ) : stats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No data available for this period. Stats may take time to appear after setup.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 px-3 font-semibold">Date</th>
                    <th className="text-right py-2 px-3 font-semibold">Impressions</th>
                    <th className="text-right py-2 px-3 font-semibold">Clicks</th>
                    <th className="text-right py-2 px-3 font-semibold">CTR</th>
                    <th className="text-right py-2 px-3 font-semibold">CPM</th>
                    <th className="text-right py-2 px-3 font-semibold">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((row, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3">{row.date || '-'}</td>
                      <td className="py-2 px-3 text-right">{Number(row.impressions).toLocaleString()}</td>
                      <td className="py-2 px-3 text-right">{Number(row.clicks).toLocaleString()}</td>
                      <td className="py-2 px-3 text-right">{Number(row.ctr).toFixed(2)}%</td>
                      <td className="py-2 px-3 text-right">${Number(row.cpm).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-semibold text-primary">${Number(row.revenue).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdsterraStats;
