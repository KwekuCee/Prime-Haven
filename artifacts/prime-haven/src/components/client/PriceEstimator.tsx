import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { getUsdToGhsRate, usdToGhs } from '@/lib/currency';

interface PriceRow { service_type: string; service_label: string; tier: string; price: number; description: string | null }

const CONSULT_ONLY = ['web-development', 'mobile-app-development'];
const TIER_ORDER = ['basic', 'standard', 'premium'];
const cleanLabel = (l: string) => l.replace(/^App\s*\/\s*/i, '');

const PriceEstimator = () => {
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [service, setService] = useState('');
  const [tier, setTier] = useState('standard');
  const [qty, setQty] = useState(1);
  const [rate, setRate] = useState<number | null>(null);

  useEffect(() => {
    supabase.from('service_pricing').select('service_type, service_label, tier, price, description').eq('is_active', true)
      .then(({ data }) => setRows((data || []) as PriceRow[]));
    getUsdToGhsRate().then((r) => setRate(r.rate)).catch(() => setRate(null));
  }, []);

  const services = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => m.set(r.service_type, cleanLabel(r.service_label)));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const tiers = useMemo(() => rows.filter((r) => r.service_type === service)
    .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier)), [rows, service]);

  useEffect(() => { if (tiers.length && !tiers.some((t) => t.tier === tier)) setTier(tiers[0].tier); }, [tiers, tier]);

  const selected = tiers.find((t) => t.tier === tier);
  const consult = CONSULT_ONLY.includes(service);
  const total = selected ? Number(selected.price) * qty : 0;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Calculator className="w-4 h-4 text-primary" />
        <h2 className="text-base font-heading font-bold">Price estimator</h2>
      </div>
      <p className="text-xs text-muted-foreground mt-1">See what a job costs before you start a project.</p>

      <div className="grid sm:grid-cols-3 gap-4 mt-5">
        <div className="space-y-1.5">
          <Label htmlFor="est-service">Service</Label>
          <Select value={service} onValueChange={setService}>
            <SelectTrigger id="est-service"><SelectValue placeholder="Choose a service" /></SelectTrigger>
            <SelectContent>{services.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {!consult && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="est-tier">Package</Label>
              <Select value={tier} onValueChange={setTier} disabled={!service}>
                <SelectTrigger id="est-tier"><SelectValue /></SelectTrigger>
                <SelectContent>{tiers.map((t) => <SelectItem key={t.tier} value={t.tier} className="capitalize">{t.tier}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="est-qty">How many</Label>
              <Input id="est-qty" type="number" min={1} max={50} value={qty}
                onChange={(e) => setQty(Math.min(50, Math.max(1, Number(e.target.value) || 1)))} />
            </div>
          </>
        )}
      </div>

      {service && consult && (
        <div className="mt-5 rounded-xl bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-foreground flex items-start gap-2"><CalendarClock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            Website and app prices depend on your requirements, so we price them after a free consultation.</p>
          <Button asChild size="sm" className="rounded-full"><Link to="/client/start-project">Book a consultation</Link></Button>
        </div>
      )}

      {selected && !consult && (
        <div className="mt-5 rounded-xl bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Estimated cost</p>
            <p className="text-2xl font-heading font-black text-foreground">${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            {rate && <p className="text-xs text-muted-foreground">about GH₵{usdToGhs(total, rate).toLocaleString(undefined, { maximumFractionDigits: 2 })} at today's rate</p>}
            {selected.description && <p className="text-xs text-muted-foreground mt-2 max-w-md">{selected.description}</p>}
          </div>
          <Button asChild size="sm" className="rounded-full"><Link to="/client/start-project">Start this project</Link></Button>
        </div>
      )}
    </div>
  );
};

export default PriceEstimator;
