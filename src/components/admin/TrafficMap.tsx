import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Globe, MapPin, Users, Eye, ChevronLeft, RefreshCw, ZoomIn, ZoomOut, Maximize2, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';

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

// Mercator projection helpers
const lonToX = (lon: number, width: number) => ((lon + 180) / 360) * width;
const latToY = (lat: number, height: number) => {
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  return (height / 2) - (height * mercN) / (2 * Math.PI);
};

// Expanded country coordinates (lat/lng based)
const COUNTRY_GEO: Record<string, { lat: number; lng: number; name: string }> = {
  US: { lat: 39.8, lng: -98.5, name: 'United States' },
  CA: { lat: 56.1, lng: -106.3, name: 'Canada' },
  MX: { lat: 23.6, lng: -102.5, name: 'Mexico' },
  BR: { lat: -14.2, lng: -51.9, name: 'Brazil' },
  AR: { lat: -38.4, lng: -63.6, name: 'Argentina' },
  CO: { lat: 4.5, lng: -74.2, name: 'Colombia' },
  CL: { lat: -35.6, lng: -71.5, name: 'Chile' },
  PE: { lat: -9.2, lng: -75.0, name: 'Peru' },
  VE: { lat: 6.4, lng: -66.5, name: 'Venezuela' },
  GB: { lat: 55.3, lng: -3.4, name: 'United Kingdom' },
  FR: { lat: 46.2, lng: 2.2, name: 'France' },
  DE: { lat: 51.1, lng: 10.4, name: 'Germany' },
  ES: { lat: 40.4, lng: -3.7, name: 'Spain' },
  IT: { lat: 41.8, lng: 12.5, name: 'Italy' },
  NL: { lat: 52.1, lng: 5.2, name: 'Netherlands' },
  BE: { lat: 50.5, lng: 4.4, name: 'Belgium' },
  CH: { lat: 46.8, lng: 8.2, name: 'Switzerland' },
  AT: { lat: 47.5, lng: 14.5, name: 'Austria' },
  SE: { lat: 60.1, lng: 18.6, name: 'Sweden' },
  NO: { lat: 60.4, lng: 8.4, name: 'Norway' },
  FI: { lat: 61.9, lng: 25.7, name: 'Finland' },
  DK: { lat: 56.2, lng: 9.5, name: 'Denmark' },
  PL: { lat: 51.9, lng: 19.1, name: 'Poland' },
  UA: { lat: 48.3, lng: 31.1, name: 'Ukraine' },
  RU: { lat: 61.5, lng: 105.3, name: 'Russia' },
  TR: { lat: 38.9, lng: 35.2, name: 'Turkey' },
  GR: { lat: 39.0, lng: 21.8, name: 'Greece' },
  PT: { lat: 39.3, lng: -8.2, name: 'Portugal' },
  IE: { lat: 53.4, lng: -8.2, name: 'Ireland' },
  CZ: { lat: 49.8, lng: 15.4, name: 'Czech Republic' },
  RO: { lat: 45.9, lng: 24.9, name: 'Romania' },
  HU: { lat: 47.1, lng: 19.5, name: 'Hungary' },
  EG: { lat: 26.8, lng: 30.8, name: 'Egypt' },
  ZA: { lat: -30.5, lng: 22.9, name: 'South Africa' },
  NG: { lat: 9.0, lng: 8.6, name: 'Nigeria' },
  GH: { lat: 7.9, lng: -1.0, name: 'Ghana' },
  KE: { lat: -0.02, lng: 37.9, name: 'Kenya' },
  ET: { lat: 9.1, lng: 40.4, name: 'Ethiopia' },
  TZ: { lat: -6.3, lng: 34.8, name: 'Tanzania' },
  MA: { lat: 31.7, lng: -7.0, name: 'Morocco' },
  DZ: { lat: 28.0, lng: 1.6, name: 'Algeria' },
  TN: { lat: 33.8, lng: 9.5, name: 'Tunisia' },
  SN: { lat: 14.4, lng: -14.4, name: 'Senegal' },
  CI: { lat: 7.5, lng: -5.5, name: 'Ivory Coast' },
  CM: { lat: 7.3, lng: 12.3, name: 'Cameroon' },
  UG: { lat: 1.3, lng: 32.3, name: 'Uganda' },
  RW: { lat: -1.9, lng: 29.8, name: 'Rwanda' },
  AO: { lat: -11.2, lng: 17.8, name: 'Angola' },
  MZ: { lat: -18.6, lng: 35.5, name: 'Mozambique' },
  IN: { lat: 20.5, lng: 78.9, name: 'India' },
  CN: { lat: 35.8, lng: 104.1, name: 'China' },
  JP: { lat: 36.2, lng: 138.2, name: 'Japan' },
  KR: { lat: 35.9, lng: 127.7, name: 'South Korea' },
  AU: { lat: -25.2, lng: 133.7, name: 'Australia' },
  NZ: { lat: -40.9, lng: 174.8, name: 'New Zealand' },
  SA: { lat: 23.8, lng: 45.0, name: 'Saudi Arabia' },
  AE: { lat: 23.4, lng: 53.8, name: 'UAE' },
  PK: { lat: 30.3, lng: 69.3, name: 'Pakistan' },
  BD: { lat: 23.6, lng: 90.3, name: 'Bangladesh' },
  TH: { lat: 15.8, lng: 100.9, name: 'Thailand' },
  VN: { lat: 14.0, lng: 108.2, name: 'Vietnam' },
  PH: { lat: 12.8, lng: 121.7, name: 'Philippines' },
  ID: { lat: -0.7, lng: 113.9, name: 'Indonesia' },
  SG: { lat: 1.3, lng: 103.8, name: 'Singapore' },
  MY: { lat: 4.2, lng: 101.9, name: 'Malaysia' },
  IL: { lat: 31.0, lng: 34.8, name: 'Israel' },
  IQ: { lat: 33.2, lng: 43.6, name: 'Iraq' },
  IR: { lat: 32.4, lng: 53.6, name: 'Iran' },
  AF: { lat: 33.9, lng: 67.7, name: 'Afghanistan' },
  MM: { lat: 21.9, lng: 95.9, name: 'Myanmar' },
  KH: { lat: 12.5, lng: 104.9, name: 'Cambodia' },
  LK: { lat: 7.8, lng: 80.7, name: 'Sri Lanka' },
  NP: { lat: 28.3, lng: 84.1, name: 'Nepal' },
  QA: { lat: 25.3, lng: 51.1, name: 'Qatar' },
  KW: { lat: 29.3, lng: 47.4, name: 'Kuwait' },
  JM: { lat: 18.1, lng: -77.2, name: 'Jamaica' },
  TT: { lat: 10.6, lng: -61.2, name: 'Trinidad' },
  CU: { lat: 21.5, lng: -77.7, name: 'Cuba' },
  DO: { lat: 18.7, lng: -70.1, name: 'Dominican Republic' },
  PR: { lat: 18.2, lng: -66.5, name: 'Puerto Rico' },
  GT: { lat: 15.7, lng: -90.2, name: 'Guatemala' },
  CR: { lat: 9.7, lng: -83.7, name: 'Costa Rica' },
  PA: { lat: 8.5, lng: -80.7, name: 'Panama' },
  EC: { lat: -1.8, lng: -78.1, name: 'Ecuador' },
  UY: { lat: -32.5, lng: -55.7, name: 'Uruguay' },
  PY: { lat: -23.4, lng: -58.4, name: 'Paraguay' },
  BO: { lat: -16.2, lng: -63.5, name: 'Bolivia' },
};

// Simplified world land paths for SVG (Mercator projected, viewBox 0 0 1000 500)
const LAND_PATHS = [
  // North America
  "M65,95 L75,80 L120,65 L175,60 L215,70 L240,90 L250,120 L248,155 L235,180 L215,195 L200,210 L185,220 L170,215 L140,205 L120,195 L100,190 L85,170 L70,145 L65,120Z",
  // Central America
  "M140,205 L165,215 L170,225 L155,235 L145,230 L135,215Z",
  // South America
  "M195,240 L230,230 L260,235 L280,250 L290,275 L285,310 L275,345 L260,370 L240,385 L225,380 L215,360 L210,330 L200,300 L195,270Z",
  // Europe
  "M430,75 L465,70 L490,72 L510,80 L520,95 L530,115 L520,135 L510,150 L495,155 L480,150 L465,155 L450,150 L440,140 L435,120 L430,100Z",
  // UK/Ireland
  "M420,85 L430,78 L435,90 L428,100 L420,95Z M415,82 L420,80 L420,90 L415,88Z",
  // Scandinavia
  "M460,40 L475,35 L485,45 L490,65 L480,75 L465,70 L455,55Z",
  // Africa
  "M440,165 L470,160 L500,165 L530,175 L545,195 L550,225 L545,260 L535,295 L520,325 L500,345 L480,350 L460,340 L445,315 L438,285 L435,250 L432,220 L435,190Z",
  // Middle East
  "M530,135 L560,130 L580,140 L590,155 L580,170 L560,175 L540,170 L530,155Z",
  // Asia
  "M550,50 L620,35 L700,40 L760,55 L790,80 L800,110 L790,140 L770,165 L740,180 L700,185 L660,195 L630,190 L600,180 L570,165 L555,140 L545,110 L548,80Z",
  // India/SE Asia
  "M600,180 L630,175 L650,185 L660,200 L660,220 L645,235 L625,225 L610,215 L600,200Z",
  // SE Asia islands
  "M660,215 L690,210 L710,220 L720,235 L700,245 L680,240 L665,230Z",
  // Japan
  "M770,110 L780,100 L785,115 L778,125 L772,120Z",
  // Australia
  "M720,305 L770,295 L800,310 L810,335 L795,360 L770,370 L745,365 L725,345 L720,325Z",
  // New Zealand
  "M825,355 L832,345 L838,355 L835,370 L828,375 L825,365Z",
];

const getHeatColor = (intensity: number): string => {
  if (intensity >= 0.8) return 'hsl(var(--primary))';
  if (intensity >= 0.6) return 'hsl(var(--primary) / 0.8)';
  if (intensity >= 0.4) return 'hsl(var(--primary) / 0.6)';
  if (intensity >= 0.2) return 'hsl(var(--primary) / 0.4)';
  return 'hsl(var(--primary) / 0.25)';
};

const MAP_W = 1000;
const MAP_H = 500;

const TrafficMap = () => {
  const [visitors, setVisitors] = useState<VisitorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<{ data: CountryData; x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [liveCount, setLiveCount] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

    // Count last 15 min for "live"
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('visitor_analytics')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', fifteenMinAgo);
    setLiveCount(count || 0);
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
        if (existing) existing.count++;
        else cd.cities.push({ city: v.city, region: v.region || '', count: 1, lat: v.latitude || 0, lng: v.longitude || 0 });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [visitors]);

  const maxCount = countryData.length > 0 ? countryData[0].count : 1;
  const totalVisitors = visitors.length;
  const uniqueCountries = countryData.length;
  const registeredVisitors = visitors.filter(v => v.is_registered_user).length;

  // Page distribution
  const pageStats = useMemo(() => {
    const pages: Record<string, number> = {};
    visitors.forEach(v => { pages[v.page_path] = (pages[v.page_path] || 0) + 1; });
    return Object.entries(pages).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [visitors]);

  // Pan & Zoom handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setZoom(z => Math.max(1, Math.min(5, z + delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [zoom, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    const maxPan = ((zoom - 1) * MAP_W) / 2;
    const maxPanY = ((zoom - 1) * MAP_H) / 2;
    setPan({
      x: Math.max(-maxPan, Math.min(maxPan, e.clientX - panStart.x)),
      y: Math.max(-maxPanY, Math.min(maxPanY, e.clientY - panStart.y)),
    });
  }, [isPanning, panStart, zoom]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);
  const resetView = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  // Project country dots to SVG coordinates
  const projectedDots = useMemo(() => {
    return countryData.map(cd => {
      const geo = COUNTRY_GEO[cd.country_code];
      if (!geo) return null;
      const x = lonToX(geo.lng, MAP_W);
      const y = latToY(geo.lat, MAP_H);
      const intensity = cd.count / maxCount;
      const radius = Math.max(3, Math.min(16, 3 + intensity * 13));
      return { cd, x, y, intensity, radius };
    }).filter(Boolean) as { cd: CountryData; x: number; y: number; intensity: number; radius: number }[];
  }, [countryData, maxCount]);

  // Pulse animation dots for recent visitors
  const recentDots = useMemo(() => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return visitors
      .filter(v => new Date(v.created_at).getTime() > oneHourAgo && v.latitude && v.longitude)
      .slice(0, 20)
      .map(v => ({
        x: lonToX(v.longitude!, MAP_W),
        y: latToY(v.latitude!, MAP_H),
        key: v.created_at + v.city,
      }));
  }, [visitors]);

  const viewBox = useMemo(() => {
    const w = MAP_W / zoom;
    const h = MAP_H / zoom;
    const cx = MAP_W / 2 - pan.x / zoom;
    const cy = MAP_H / 2 - pan.y / zoom;
    return `${cx - w / 2} ${cy - h / 2} ${w} ${h}`;
  }, [zoom, pan]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold">Traffic Overview</h2>
          {liveCount > 0 && (
            <Badge variant="outline" className="text-[10px] gap-1 border-emerald-500/50 text-emerald-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {liveCount} live
            </Badge>
          )}
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Visitors', value: totalVisitors, icon: Eye, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Countries', value: uniqueCountries, icon: Globe, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Registered', value: registeredVisitors, icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { label: 'Live (15m)', value: liveCount, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        ].map(s => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border/50 bg-card/80 p-3 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{s.label}</span>
              <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Map or Country Detail */}
      <AnimatePresence mode="wait">
        {selectedCountry ? (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSelectedCountry(null)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <MapPin className="w-4 h-4 text-primary" />
                    {selectedCountry.country}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className="text-[10px] bg-primary/10 text-primary border-0">{selectedCountry.count} visits</Badge>
                    <Badge variant="outline" className="text-[10px]">{selectedCountry.registered} registered</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                  {selectedCountry.cities.sort((a, b) => b.count - a.count).map((city, i) => {
                    const intensity = city.count / (selectedCountry.cities[0]?.count || 1);
                    const barW = intensity * 100;
                    return (
                      <motion.div
                        key={`${city.city}-${i}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-all group"
                      >
                        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <span className="text-sm font-medium">{city.city}</span>
                              {city.region && <span className="text-[10px] text-muted-foreground ml-1.5">{city.region}</span>}
                            </div>
                            <span className="text-sm font-bold text-primary">{city.count}</span>
                          </div>
                          <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: 'hsl(var(--primary))' }}
                              initial={{ width: 0 }}
                              animate={{ width: `${barW}%` }}
                              transition={{ duration: 0.5, delay: i * 0.03 }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  {selectedCountry.cities.length === 0 && (
                    <p className="text-center py-8 text-xs text-muted-foreground">No city-level data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="border-border/50 bg-card/80 overflow-hidden">
              <CardHeader className="pb-1 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">World Traffic Map</CardTitle>
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setZoom(z => Math.min(5, z + 0.5))}>
                          <ZoomIn className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-[10px]">Zoom in</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setZoom(z => Math.max(1, z - 0.5))}>
                          <ZoomOut className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-[10px]">Zoom out</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={resetView}>
                          <Maximize2 className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-[10px]">Reset view</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {zoom > 1 && (
                    <Badge variant="outline" className="text-[9px] ml-1">{zoom.toFixed(1)}x</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-1.5 pt-0">
                <div
                  ref={containerRef}
                  className="relative w-full overflow-hidden rounded-lg bg-background/60 border border-border/30 select-none"
                  style={{ cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
                  onWheel={handleWheel}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={() => { setIsPanning(false); setHoveredCountry(null); }}
                >
                  <svg
                    ref={svgRef}
                    viewBox={viewBox}
                    className="w-full h-auto transition-[viewBox] duration-150"
                    style={{ minHeight: 260 }}
                  >
                    <defs>
                      <radialGradient id="dot-glow-2" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                      </radialGradient>
                      <radialGradient id="pulse-glow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                      </radialGradient>
                      <filter id="glow-filter">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Grid */}
                    {Array.from({ length: 11 }, (_, i) => (
                      <line key={`h${i}`} x1="0" y1={i * 50} x2={MAP_W} y2={i * 50} stroke="hsl(var(--border))" strokeWidth="0.3" opacity="0.2" />
                    ))}
                    {Array.from({ length: 21 }, (_, i) => (
                      <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2={MAP_H} stroke="hsl(var(--border))" strokeWidth="0.3" opacity="0.2" />
                    ))}

                    {/* Land masses */}
                    {LAND_PATHS.map((d, i) => (
                      <path key={i} d={d} fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.35" />
                    ))}

                    {/* Connection lines between top countries */}
                    {projectedDots.length > 1 && projectedDots.slice(0, 5).map((dot, i) => {
                      if (i === 0) return null;
                      const from = projectedDots[0];
                      const midX = (from.x + dot.x) / 2;
                      const midY = Math.min(from.y, dot.y) - 30;
                      return (
                        <path
                          key={`line-${i}`}
                          d={`M${from.x},${from.y} Q${midX},${midY} ${dot.x},${dot.y}`}
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeWidth="0.5"
                          opacity="0.15"
                          strokeDasharray="4 4"
                        />
                      );
                    })}

                    {/* Pulse rings for recent visitors */}
                    {recentDots.map((dot, i) => (
                      <circle
                        key={`pulse-${dot.key}-${i}`}
                        cx={dot.x}
                        cy={dot.y}
                        r="8"
                        fill="none"
                        stroke="hsl(var(--primary))"
                        strokeWidth="1"
                        opacity="0.4"
                      >
                        <animate attributeName="r" values="4;16" dur="2s" repeatCount="indefinite" begin={`${i * 0.3}s`} />
                        <animate attributeName="opacity" values="0.5;0" dur="2s" repeatCount="indefinite" begin={`${i * 0.3}s`} />
                      </circle>
                    ))}

                    {/* Country dots */}
                    {projectedDots.map(({ cd, x, y, intensity, radius }) => (
                      <g
                        key={cd.country_code}
                        className="cursor-pointer"
                        onClick={() => setSelectedCountry(cd)}
                        onMouseEnter={(e) => {
                          const rect = containerRef.current?.getBoundingClientRect();
                          if (rect) {
                            setHoveredCountry({
                              data: cd,
                              x: e.clientX - rect.left,
                              y: e.clientY - rect.top,
                            });
                          }
                        }}
                        onMouseLeave={() => setHoveredCountry(null)}
                      >
                        {/* Outer glow */}
                        <circle cx={x} cy={y} r={radius * 2.5} fill="url(#dot-glow-2)" opacity={intensity * 0.4} />
                        {/* Main dot */}
                        <circle
                          cx={x} cy={y} r={radius}
                          fill={getHeatColor(intensity)}
                          stroke="hsl(var(--primary))"
                          strokeWidth={intensity >= 0.5 ? 1.5 : 0.8}
                          opacity="0.9"
                          filter={intensity >= 0.6 ? 'url(#glow-filter)' : undefined}
                          style={{ transition: 'r 0.3s, opacity 0.3s' }}
                        />
                        {/* Inner bright core */}
                        <circle cx={x} cy={y} r={Math.max(1.5, radius * 0.3)} fill="hsl(var(--primary-foreground))" opacity="0.6" />
                        {/* Label */}
                        {(intensity >= 0.2 || zoom >= 2) && (
                          <text
                            x={x}
                            y={y + radius + 10}
                            textAnchor="middle"
                            fontSize={zoom >= 2 ? "7" : "8"}
                            fontWeight="600"
                            fill="hsl(var(--foreground))"
                            opacity="0.7"
                          >
                            {cd.country_code}
                          </text>
                        )}
                      </g>
                    ))}

                    {/* No data */}
                    {countryData.length === 0 && !loading && (
                      <text x={MAP_W / 2} y={MAP_H / 2} textAnchor="middle" fontSize="14" fill="hsl(var(--muted-foreground))">
                        No traffic data yet — visitors will appear here
                      </text>
                    )}
                  </svg>

                  {/* Hover tooltip */}
                  <AnimatePresence>
                    {hoveredCountry && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute pointer-events-none z-50 bg-card/95 backdrop-blur-md border border-border rounded-xl px-3 py-2.5 shadow-xl"
                        style={{
                          left: Math.min(hoveredCountry.x + 12, (containerRef.current?.clientWidth || 300) - 180),
                          top: hoveredCountry.y - 10,
                        }}
                      >
                        <div className="text-xs font-bold mb-1">{hoveredCountry.data.country}</div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{hoveredCountry.data.count} visits</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{hoveredCountry.data.registered} users</span>
                        </div>
                        <div className="text-[9px] text-muted-foreground mt-1">
                          {hoveredCountry.data.cities.length} {hoveredCountry.data.cities.length === 1 ? 'city' : 'cities'} · Click to explore
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Legend */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-card/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-border/50">
                    <span className="text-[9px] text-muted-foreground">Low</span>
                    {[0.2, 0.4, 0.6, 0.8, 1].map(v => (
                      <div key={v} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getHeatColor(v) }} />
                    ))}
                    <span className="text-[9px] text-muted-foreground">High</span>
                  </div>

                  {/* Zoom hint */}
                  {zoom <= 1 && countryData.length > 0 && (
                    <div className="absolute bottom-2 right-2 text-[9px] text-muted-foreground bg-card/80 backdrop-blur-sm rounded px-2 py-1 border border-border/30">
                      Scroll to zoom · Click country to drill down
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom section: Top Countries + Top Pages side by side */}
      {!selectedCountry && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top Countries */}
          {countryData.length > 0 && (
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  Top Countries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                  {countryData.slice(0, 10).map((cd, i) => {
                    const barWidth = (cd.count / maxCount) * 100;
                    return (
                      <motion.div
                        key={cd.country_code}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-all cursor-pointer group"
                        onClick={() => setSelectedCountry(cd)}
                      >
                        <span className="text-[10px] font-bold text-muted-foreground w-4 text-right">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">{cd.country}</span>
                            <span className="text-xs font-bold text-primary ml-2">{cd.count}</span>
                          </div>
                          <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: 'hsl(var(--primary))' }}
                              initial={{ width: 0 }}
                              animate={{ width: `${barWidth}%` }}
                              transition={{ duration: 0.6, delay: i * 0.04 }}
                            />
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[9px] shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                          {cd.registered} <Users className="w-2.5 h-2.5 ml-0.5" />
                        </Badge>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Pages */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Top Pages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {pageStats.map(([page, count], i) => {
                  const barW = (count / (pageStats[0]?.[1] || 1)) * 100;
                  return (
                    <motion.div
                      key={page}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-[10px] font-bold text-muted-foreground w-4 text-right">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm font-medium truncate font-mono">{page}</span>
                          <span className="text-xs font-bold text-primary ml-2">{count}</span>
                        </div>
                        <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: 'hsl(var(--primary))' }}
                            initial={{ width: 0 }}
                            animate={{ width: `${barW}%` }}
                            transition={{ duration: 0.6, delay: i * 0.05 }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                {pageStats.length === 0 && (
                  <p className="text-center py-8 text-xs text-muted-foreground">No page data yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TrafficMap;
