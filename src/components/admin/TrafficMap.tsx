import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Globe, MapPin, Users, Eye, ChevronLeft, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface VisitorData {
  country: string | null;
  country_code: string | null;
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  is_registered_user: boolean;
  created_at: string;
  page_path: string;
}

interface CountryData {
  country: string;
  country_code: string;
  count: number;
  registered: number;
  cities: { city: string; region: string; count: number; lat: number; lng: number }[];
}

// Simple world map SVG paths for major countries/regions
const COUNTRY_COORDS: Record<string, { x: number; y: number }> = {
  US: { x: 150, y: 180 }, CA: { x: 150, y: 130 }, MX: { x: 130, y: 220 },
  BR: { x: 250, y: 310 }, AR: { x: 230, y: 380 }, CO: { x: 200, y: 260 },
  GB: { x: 395, y: 145 }, FR: { x: 410, y: 170 }, DE: { x: 425, y: 155 },
  ES: { x: 390, y: 185 }, IT: { x: 430, y: 180 }, NL: { x: 415, y: 150 },
  SE: { x: 435, y: 115 }, NO: { x: 425, y: 105 }, FI: { x: 460, y: 110 },
  PL: { x: 450, y: 150 }, UA: { x: 475, y: 155 }, RU: { x: 550, y: 120 },
  TR: { x: 485, y: 185 }, EG: { x: 475, y: 220 }, ZA: { x: 470, y: 370 },
  NG: { x: 420, y: 260 }, GH: { x: 400, y: 260 }, KE: { x: 500, y: 280 },
  ET: { x: 500, y: 260 }, TZ: { x: 500, y: 300 }, MA: { x: 390, y: 210 },
  IN: { x: 580, y: 230 }, CN: { x: 630, y: 190 }, JP: { x: 700, y: 185 },
  KR: { x: 680, y: 185 }, AU: { x: 700, y: 370 }, NZ: { x: 750, y: 400 },
  SA: { x: 510, y: 225 }, AE: { x: 530, y: 225 }, PK: { x: 560, y: 210 },
  BD: { x: 595, y: 225 }, TH: { x: 625, y: 240 }, VN: { x: 640, y: 240 },
  PH: { x: 670, y: 245 }, ID: { x: 660, y: 280 }, SG: { x: 640, y: 265 },
  MY: { x: 640, y: 255 }, IL: { x: 485, y: 200 },
};

const getHeatColor = (intensity: number): string => {
  if (intensity >= 0.8) return 'hsl(var(--primary))';
  if (intensity >= 0.6) return 'hsl(var(--primary) / 0.8)';
  if (intensity >= 0.4) return 'hsl(var(--primary) / 0.6)';
  if (intensity >= 0.2) return 'hsl(var(--primary) / 0.4)';
  return 'hsl(var(--primary) / 0.25)';
};

const TrafficMap = () => {
  const [visitors, setVisitors] = useState<VisitorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);

  const loadVisitors = async () => {
    setLoading(true);
    const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data } = await supabase
      .from('visitor_analytics')
      .select('country, country_code, city, region, latitude, longitude, is_registered_user, created_at, page_path')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1000);

    setVisitors((data as VisitorData[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadVisitors(); }, [timeRange]);

  const countryData = useMemo(() => {
    const map = new Map<string, CountryData>();
    visitors.forEach(v => {
      if (!v.country || !v.country_code) return;
      const key = v.country_code;
      if (!map.has(key)) {
        map.set(key, { country: v.country, country_code: key, count: 0, registered: 0, cities: [] });
      }
      const cd = map.get(key)!;
      cd.count++;
      if (v.is_registered_user) cd.registered++;
      if (v.city) {
        const existing = cd.cities.find(c => c.city === v.city);
        if (existing) {
          existing.count++;
        } else {
          cd.cities.push({ city: v.city, region: v.region || '', count: 1, lat: v.latitude || 0, lng: v.longitude || 0 });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [visitors]);

  const maxCount = countryData.length > 0 ? countryData[0].count : 1;
  const totalVisitors = visitors.length;
  const uniqueCountries = countryData.length;
  const registeredVisitors = visitors.filter(v => v.is_registered_user).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold">Traffic Overview</h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="h-7 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24 hours</SelectItem>
              <SelectItem value="7d">7 days</SelectItem>
              <SelectItem value="30d">30 days</SelectItem>
              <SelectItem value="90d">90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={loadVisitors}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Visitors', value: totalVisitors, icon: Eye, color: 'text-primary' },
          { label: 'Countries', value: uniqueCountries, icon: Globe, color: 'text-emerald-500' },
          { label: 'Registered', value: registeredVisitors, icon: Users, color: 'text-purple-500' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-border/50 bg-card/80 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{s.label}</span>
            </div>
            <div className="text-xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Map or Country Detail */}
      {selectedCountry ? (
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSelectedCountry(null)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <MapPin className="w-4 h-4 text-primary" />
                {selectedCountry.country} — {selectedCountry.count} visits
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">{selectedCountry.registered} registered</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {selectedCountry.cities.sort((a, b) => b.count - a.count).map((city, i) => {
                const intensity = city.count / (selectedCountry.cities[0]?.count || 1);
                return (
                  <div key={`${city.city}-${i}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: getHeatColor(intensity) }}
                      />
                      <div>
                        <span className="text-sm font-medium">{city.city}</span>
                        {city.region && <span className="text-[10px] text-muted-foreground ml-1.5">{city.region}</span>}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-primary">{city.count}</span>
                  </div>
                );
              })}
              {selectedCountry.cities.length === 0 && (
                <p className="text-center py-6 text-xs text-muted-foreground">No city-level data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">World Traffic Map</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            {/* SVG World Map */}
            <div className="relative w-full overflow-hidden rounded-lg bg-background/50 border border-border/30">
              <svg viewBox="0 0 800 450" className="w-full h-auto" style={{ minHeight: 200 }}>
                {/* World outline - simplified continents */}
                <defs>
                  <radialGradient id="dot-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Background grid */}
                {Array.from({ length: 9 }, (_, i) => (
                  <line key={`h${i}`} x1="0" y1={i * 50} x2="800" y2={i * 50} stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3" />
                ))}
                {Array.from({ length: 17 }, (_, i) => (
                  <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="450" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3" />
                ))}

                {/* Simplified continent outlines */}
                {/* North America */}
                <path d="M60,80 L200,70 L220,120 L230,180 L200,220 L170,240 L110,220 L80,180 L60,120Z" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.4" />
                {/* South America */}
                <path d="M180,250 L260,240 L280,280 L270,340 L250,400 L220,410 L200,380 L190,320 L180,280Z" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.4" />
                {/* Europe */}
                <path d="M370,100 L470,90 L480,140 L460,180 L420,190 L380,180 L370,140Z" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.4" />
                {/* Africa */}
                <path d="M380,200 L500,190 L520,250 L510,330 L480,380 L440,390 L410,360 L390,300 L380,240Z" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.4" />
                {/* Asia */}
                <path d="M480,80 L700,70 L720,140 L710,200 L660,240 L600,250 L540,230 L500,200 L480,150Z" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.4" />
                {/* Australia */}
                <path d="M650,320 L740,310 L760,360 L740,400 L690,410 L650,390 L640,350Z" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.4" />

                {/* Country dots */}
                {countryData.map(cd => {
                  const coords = COUNTRY_COORDS[cd.country_code];
                  if (!coords) return null;
                  const intensity = cd.count / maxCount;
                  const radius = Math.max(4, Math.min(18, 4 + intensity * 14));
                  return (
                    <g key={cd.country_code} className="cursor-pointer" onClick={() => setSelectedCountry(cd)}>
                      {/* Glow */}
                      <circle cx={coords.x} cy={coords.y} r={radius * 2} fill="url(#dot-glow)" opacity={intensity * 0.5} />
                      {/* Dot */}
                      <circle
                        cx={coords.x} cy={coords.y} r={radius}
                        fill={getHeatColor(intensity)}
                        stroke="hsl(var(--primary))"
                        strokeWidth="1"
                        opacity="0.9"
                      />
                      {/* Label for high-traffic */}
                      {intensity >= 0.3 && (
                        <text x={coords.x} y={coords.y + radius + 12} textAnchor="middle" fontSize="9" fill="hsl(var(--foreground))" opacity="0.7">
                          {cd.country_code}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* No data message */}
                {countryData.length === 0 && !loading && (
                  <text x="400" y="225" textAnchor="middle" fontSize="14" fill="hsl(var(--muted-foreground))">
                    No traffic data yet
                  </text>
                )}
              </svg>

              {/* Legend */}
              <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-card/90 backdrop-blur-sm rounded-md px-2 py-1 border border-border/50">
                <span className="text-[9px] text-muted-foreground">Low</span>
                {[0.2, 0.4, 0.6, 0.8, 1].map(v => (
                  <div key={v} className="w-3 h-3 rounded-full" style={{ backgroundColor: getHeatColor(v) }} />
                ))}
                <span className="text-[9px] text-muted-foreground">High</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Countries List */}
      {!selectedCountry && countryData.length > 0 && (
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Countries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {countryData.slice(0, 15).map((cd, i) => {
                const barWidth = (cd.count / maxCount) * 100;
                return (
                  <div
                    key={cd.country_code}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedCountry(cd)}
                  >
                    <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-medium truncate">{cd.country}</span>
                        <span className="text-xs font-bold text-primary ml-2">{cd.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%`, backgroundColor: 'hsl(var(--primary))' }}
                        />
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[9px] shrink-0">
                      {cd.registered} users
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TrafficMap;
