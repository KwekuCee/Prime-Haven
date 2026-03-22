import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, Users, Eye, Clock, Globe, Monitor, Smartphone, Tablet, RefreshCw, LogIn, BarChart3 } from 'lucide-react';

const GA_CLIENT_ID = '1004966852556-7r959ichdi7r702ose65lv6sgaqkokrd.apps.googleusercontent.com';
const GA_PROPERTY_ID = '521223894';
const SCOPES = 'https://www.googleapis.com/auth/analytics.readonly';
const DISCOVERY_DOC = 'https://analyticsdata.googleapis.com/$discovery/rest?version=v1beta';

interface GAReport {
  sessions: number;
  users: number;
  pageviews: number;
  avgSessionDuration: number;
  bounceRate: number;
  newUsers: number;
}

interface DailyData {
  date: string;
  sessions: number;
  users: number;
  pageviews: number;
}

interface PageData {
  page: string;
  views: number;
  users: number;
}

interface SourceData {
  source: string;
  sessions: number;
  percentage: number;
}

interface DeviceData {
  device: string;
  sessions: number;
  percentage: number;
}

interface CountryData {
  country: string;
  sessions: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const GoogleAnalytics = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gapiReady, setGapiReady] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [dateRange, setDateRange] = useState('30daysAgo');
  const [overview, setOverview] = useState<GAReport | null>(null);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [topPages, setTopPages] = useState<PageData[]>([]);
  const [sources, setSources] = useState<SourceData[]>([]);
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [countries, setCountries] = useState<CountryData[]>([]);

  // Load GAPI
  useEffect(() => {
    const script1 = document.createElement('script');
    script1.src = 'https://apis.google.com/js/api.js';
    script1.onload = () => {
      (window as any).gapi.load('client', async () => {
        await (window as any).gapi.client.init({});
        await (window as any).gapi.client.load(DISCOVERY_DOC);
        setGapiReady(true);
      });
    };
    document.head.appendChild(script1);

    const script2 = document.createElement('script');
    script2.src = 'https://accounts.google.com/gsi/client';
    script2.onload = () => setGisReady(true);
    document.head.appendChild(script2);

    return () => {
      script1.remove();
      script2.remove();
    };
  }, []);

  // Init token client once GIS is ready
  useEffect(() => {
    if (!gisReady) return;
    const client = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: GA_CLIENT_ID,
      scope: SCOPES,
      callback: (resp: any) => {
        if (resp.error) {
          console.error('OAuth error:', resp);
          return;
        }
        setIsSignedIn(true);
      },
    });
    setTokenClient(client);
  }, [gisReady]);

  const handleSignIn = () => {
    if (!tokenClient) return;
    tokenClient.requestAccessToken({ prompt: 'consent' });
  };

  const runReport = useCallback(async (request: any) => {
    const gapi = (window as any).gapi;
    const res = await gapi.client.analyticsdata.properties.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      resource: request,
    });
    return JSON.parse(res.body);
  }, []);

  const fetchData = useCallback(async () => {
    if (!isSignedIn || !gapiReady) return;
    setLoading(true);

    try {
      // Overview metrics
      const overviewRes = await runReport({
        dateRanges: [{ startDate: dateRange, endDate: 'today' }],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' },
          { name: 'newUsers' },
        ],
      });

      const row = overviewRes.rows?.[0]?.metricValues || [];
      setOverview({
        sessions: parseInt(row[0]?.value || '0'),
        users: parseInt(row[1]?.value || '0'),
        pageviews: parseInt(row[2]?.value || '0'),
        avgSessionDuration: parseFloat(row[3]?.value || '0'),
        bounceRate: parseFloat(row[4]?.value || '0'),
        newUsers: parseInt(row[5]?.value || '0'),
      });

      // Daily data
      const dailyRes = await runReport({
        dateRanges: [{ startDate: dateRange, endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'screenPageViews' },
        ],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      });

      setDailyData(
        (dailyRes.rows || []).map((r: any) => {
          const d = r.dimensionValues[0].value;
          return {
            date: `${d.slice(4, 6)}/${d.slice(6, 8)}`,
            sessions: parseInt(r.metricValues[0].value),
            users: parseInt(r.metricValues[1].value),
            pageviews: parseInt(r.metricValues[2].value),
          };
        })
      );

      // Top pages
      const pagesRes = await runReport({
        dateRanges: [{ startDate: dateRange, endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 10,
      });

      setTopPages(
        (pagesRes.rows || []).map((r: any) => ({
          page: r.dimensionValues[0].value,
          views: parseInt(r.metricValues[0].value),
          users: parseInt(r.metricValues[1].value),
        }))
      );

      // Traffic sources
      const sourcesRes = await runReport({
        dateRanges: [{ startDate: dateRange, endDate: 'today' }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 6,
      });

      const totalSessions = (sourcesRes.rows || []).reduce(
        (sum: number, r: any) => sum + parseInt(r.metricValues[0].value), 0
      );
      setSources(
        (sourcesRes.rows || []).map((r: any) => {
          const s = parseInt(r.metricValues[0].value);
          return {
            source: r.dimensionValues[0].value,
            sessions: s,
            percentage: totalSessions > 0 ? Math.round((s / totalSessions) * 100) : 0,
          };
        })
      );

      // Devices
      const devicesRes = await runReport({
        dateRanges: [{ startDate: dateRange, endDate: 'today' }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      });

      const totalDevSessions = (devicesRes.rows || []).reduce(
        (sum: number, r: any) => sum + parseInt(r.metricValues[0].value), 0
      );
      setDevices(
        (devicesRes.rows || []).map((r: any) => {
          const s = parseInt(r.metricValues[0].value);
          return {
            device: r.dimensionValues[0].value,
            sessions: s,
            percentage: totalDevSessions > 0 ? Math.round((s / totalDevSessions) * 100) : 0,
          };
        })
      );

      // Countries
      const countriesRes = await runReport({
        dateRanges: [{ startDate: dateRange, endDate: 'today' }],
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 8,
      });

      setCountries(
        (countriesRes.rows || []).map((r: any) => ({
          country: r.dimensionValues[0].value,
          sessions: parseInt(r.metricValues[0].value),
        }))
      );
    } catch (err: any) {
      console.error('GA4 fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, gapiReady, dateRange, runReport]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
  };

  const DeviceIcon = ({ device }: { device: string }) => {
    switch (device.toLowerCase()) {
      case 'desktop': return <Monitor className="w-4 h-4" />;
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      default: return <Globe className="w-4 h-4" />;
    }
  };

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <BarChart3 className="w-8 h-8 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Google Analytics</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Sign in with your Google account to view real-time analytics data from your GA4 property.
          </p>
        </div>
        <Button
          onClick={handleSignIn}
          disabled={!gapiReady || !gisReady}
          className="gap-2"
        >
          <LogIn className="w-4 h-4" />
          {!gapiReady || !gisReady ? 'Loading...' : 'Sign in with Google'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Google Analytics
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Property: {GA_PROPERTY_ID}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="h-8 text-xs w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7daysAgo">Last 7 days</SelectItem>
              <SelectItem value="30daysAgo">Last 30 days</SelectItem>
              <SelectItem value="90daysAgo">Last 90 days</SelectItem>
              <SelectItem value="365daysAgo">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Sessions', value: overview.sessions.toLocaleString(), icon: TrendingUp },
            { label: 'Users', value: overview.users.toLocaleString(), icon: Users },
            { label: 'Pageviews', value: overview.pageviews.toLocaleString(), icon: Eye },
            { label: 'Avg Duration', value: formatDuration(overview.avgSessionDuration), icon: Clock },
            { label: 'Bounce Rate', value: `${(overview.bounceRate * 100).toFixed(1)}%`, icon: TrendingUp },
            { label: 'New Users', value: overview.newUsers.toLocaleString(), icon: Users },
          ].map((kpi) => (
            <Card key={kpi.label} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <kpi.icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground font-medium">{kpi.label}</span>
                </div>
                <p className="text-lg font-bold">{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Traffic Over Time */}
      {dailyData.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Traffic Over Time</CardTitle>
            <CardDescription className="text-xs">Sessions, users & pageviews</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <ReTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area type="monotone" dataKey="pageviews" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.1} strokeWidth={2} name="Pageviews" />
                  <Area type="monotone" dataKey="sessions" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} name="Sessions" />
                  <Area type="monotone" dataKey="users" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.1} strokeWidth={2} name="Users" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Top Pages */}
        {topPages.length > 0 && (
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top Pages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topPages.map((page, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-border/30 last:border-0">
                  <span className="text-muted-foreground truncate max-w-[60%]" title={page.page}>{page.page}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{page.views.toLocaleString()} views</span>
                    <Badge variant="secondary" className="text-[10px]">{page.users} users</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Traffic Sources */}
        {sources.length > 0 && (
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Traffic Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sources}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="sessions"
                      nameKey="source"
                    >
                      {sources.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <ReTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5">
                {sources.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span>{s.source}</span>
                    </div>
                    <span className="text-muted-foreground">{s.percentage}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Devices */}
        {devices.length > 0 && (
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Devices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[180px] mb-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={devices} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="device" tick={{ fontSize: 11 }} width={70} />
                    <ReTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {devices.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <DeviceIcon device={d.device} />
                      <span className="capitalize">{d.device}</span>
                    </div>
                    <span className="font-medium">{d.percentage}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Countries */}
        {countries.length > 0 && (
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top Countries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={countries}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="country" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <ReTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="sessions" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {loading && !overview && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading analytics...</span>
        </div>
      )}
    </div>
  );
};

export default GoogleAnalytics;
