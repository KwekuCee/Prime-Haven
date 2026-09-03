import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Save, Loader2, Settings as SettingsIcon, Coins, Percent, DollarSign,
  MessageSquare, Eye, EyeOff, Code2, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import SuperAdminLayout from '@/components/admin/SuperAdminLayout';
import SeoIndexHealth from '@/components/admin/SeoIndexHealth';

type Json = any;

interface SettingRow {
  key: string;
  value: Json;
  description: string | null;
  updated_at: string | null;
}

/** Some settings are stored as `{ "value": n }` and others as a bare scalar. */
const readNumber = (raw: Json, fallback = 0): number => {
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string' && raw.trim() !== '' && !Number.isNaN(Number(raw))) return Number(raw);
  if (typeof raw === 'object' && raw !== null && 'value' in raw) return readNumber(raw.value, fallback);
  return fallback;
};

const readBoolean = (raw: Json, fallback = false): boolean => {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') return raw === 'true';
  if (typeof raw === 'object' && raw !== null && 'value' in raw) return readBoolean(raw.value, fallback);
  return fallback;
};

const readString = (raw: Json, fallback = ''): string => {
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw !== null && 'value' in raw) return readString(raw.value, fallback);
  return raw === null || raw === undefined ? fallback : String(raw);
};

/** Keep the existing shape when writing back so consumers keep working. */
const wrapLike = (previous: Json, next: Json): Json => {
  if (typeof previous === 'object' && previous !== null && !Array.isArray(previous) && 'value' in previous) {
    return { ...previous, value: next };
  }
  return next;
};

const NUMBER_FIELDS: { key: string; label: string; hint: string; suffix?: string }[] = [
  { key: 'ph_approval_points', label: 'Prime Haven approval points', hint: 'Awarded when PH approves a submission.', suffix: 'pts' },
  { key: 'client_acceptance_points', label: 'Client acceptance points', hint: 'Awarded when the client accepts the work.', suffix: 'pts' },
  { key: 'correction_points', label: 'Correction points', hint: 'Awarded for an approved correction/revision.', suffix: 'pts' },
];

const FINANCE_FIELDS: { key: string; label: string; hint: string; suffix?: string }[] = [
  { key: 'revenue_share_percentage', label: 'Designer revenue share', hint: 'Share of the monthly pool paid out to designers.', suffix: '%' },
  { key: 'platform_profit_margin', label: 'Platform profit margin', hint: 'Prime Haven retained margin.', suffix: '%' },
  { key: 'usd_to_ghs_rate', label: 'USD → GH₵ rate', hint: 'Used for dual-currency display across the platform.' },
];

const DISCORD_CATEGORIES = ['graphic-design', 'uiux', 'app-design', 'web-dev', 'smm', 'print'];

const ManageSystemSettings = () => {
  const { isAdmin, checking, user } = useAdminGuard(['superadmin', 'masteradmin']);
  const { toast } = useToast();

  const [rows, setRows] = useState<SettingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const [numbers, setNumbers] = useState<Record<string, string>>({});
  const [adsEnabled, setAdsEnabled] = useState(false);
  const [botToken, setBotToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [channels, setChannels] = useState<Record<string, string>>({});
  const [rawKey, setRawKey] = useState<string>('');
  const [rawValue, setRawValue] = useState<string>('');

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value, description, updated_at')
      .order('key');

    if (error) {
      toast({ title: 'Could not load settings', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    const list = (data || []) as SettingRow[];
    setRows(list);

    const byKey = new Map(list.map((r) => [r.key, r.value]));
    const nextNumbers: Record<string, string> = {};
    [...NUMBER_FIELDS, ...FINANCE_FIELDS].forEach(({ key }) => {
      nextNumbers[key] = String(readNumber(byKey.get(key), 0));
    });
    setNumbers(nextNumbers);
    setAdsEnabled(readBoolean(byKey.get('ads_enabled'), false));
    setBotToken(readString(byKey.get('discord_bot_token'), ''));

    const rawChannels = byKey.get('discord_order_channels');
    const nextChannels: Record<string, string> = {};
    DISCORD_CATEGORIES.forEach((c) => {
      nextChannels[c] = rawChannels && typeof rawChannels === 'object' ? String(rawChannels[c] ?? '') : '';
    });
    setChannels(nextChannels);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (isAdmin) fetchSettings();
  }, [isAdmin, fetchSettings]);

  const persist = async (key: string, value: Json, description?: string) => {
    setSaving(key);
    const { error } = await supabase.from('system_settings').upsert(
      {
        key,
        value,
        ...(description ? { description } : {}),
        updated_at: new Date().toISOString(),
        updated_by: user?.id ?? null,
      },
      { onConflict: 'key' },
    );
    setSaving(null);

    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Saved', description: `${key} updated.` });
    await fetchSettings();
    return true;
  };

  const saveNumber = async (key: string) => {
    const parsed = Number(numbers[key]);
    if (Number.isNaN(parsed)) {
      toast({ title: 'Invalid value', description: 'Please enter a number.', variant: 'destructive' });
      return;
    }
    const previous = rows.find((r) => r.key === key)?.value;
    await persist(key, wrapLike(previous, parsed));
  };

  const saveAds = async (next: boolean) => {
    setAdsEnabled(next);
    const previous = rows.find((r) => r.key === 'ads_enabled')?.value;
    await persist('ads_enabled', wrapLike(previous, next), 'Toggle ad display on the site');
  };

  const saveChannels = async () => {
    const cleaned: Record<string, string> = {};
    Object.entries(channels).forEach(([k, v]) => {
      const trimmed = v.trim();
      if (trimmed) cleaned[k] = trimmed;
    });
    await persist('discord_order_channels', cleaned, 'Discord channel IDs for order notifications by category');
  };

  const saveRaw = async () => {
    const key = rawKey.trim();
    if (!key) {
      toast({ title: 'Missing key', description: 'Pick a setting key first.', variant: 'destructive' });
      return;
    }
    let parsed: Json;
    try {
      parsed = JSON.parse(rawValue);
    } catch {
      toast({ title: 'Invalid JSON', description: 'The value must be valid JSON (e.g. 25, "text", {"a":1}).', variant: 'destructive' });
      return;
    }
    await persist(key, parsed);
  };

  if (checking || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SuperAdminLayout onRefresh={fetchSettings} loading={loading}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <SettingsIcon className="h-6 w-6 text-primary" />
              System Settings
            </h1>
            <p className="text-sm text-muted-foreground">
              Platform-wide configuration for points, finance, ads and Discord notifications.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchSettings} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Reload
          </Button>
        </div>

        {/* Points */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Coins className="h-5 w-5 text-primary" /> Points &amp; Rewards
            </CardTitle>
            <CardDescription>Points awarded at each stage of the submission workflow.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {NUMBER_FIELDS.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <div className="flex gap-2">
                  <Input
                    id={field.key}
                    type="number"
                    value={numbers[field.key] ?? ''}
                    onChange={(e) => setNumbers((p) => ({ ...p, [field.key]: e.target.value }))}
                  />
                  <Button size="icon" onClick={() => saveNumber(field.key)} disabled={saving === field.key}>
                    {saving === field.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {field.hint} {field.suffix ? <Badge variant="secondary" className="ml-1">{field.suffix}</Badge> : null}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Finance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Percent className="h-5 w-5 text-primary" /> Finance &amp; Currency
            </CardTitle>
            <CardDescription>Revenue sharing, retained margin and the exchange rate used site-wide.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {FINANCE_FIELDS.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <div className="flex gap-2">
                  <Input
                    id={field.key}
                    type="number"
                    step="0.01"
                    value={numbers[field.key] ?? ''}
                    onChange={(e) => setNumbers((p) => ({ ...p, [field.key]: e.target.value }))}
                  />
                  <Button size="icon" onClick={() => saveNumber(field.key)} disabled={saving === field.key}>
                    {saving === field.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {field.hint} {field.suffix ? <Badge variant="secondary" className="ml-1">{field.suffix}</Badge> : null}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Site toggles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-primary" /> Monetisation
            </CardTitle>
            <CardDescription>Controls whether ad slots render for visitors.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-xl border p-4">
              <div>
                <p className="font-medium">Ads enabled</p>
                <p className="text-sm text-muted-foreground">
                  Turn off to hide every ad placement across the site immediately.
                </p>
              </div>
              <Switch
                checked={adsEnabled}
                onCheckedChange={saveAds}
                disabled={saving === 'ads_enabled'}
              />
            </div>
          </CardContent>
        </Card>

        {/* Discord */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-primary" /> Discord Notifications
            </CardTitle>
            <CardDescription>Bot credentials and the channel each order category is posted to.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="discord_bot_token">Bot token</Label>
              <div className="flex gap-2">
                <Input
                  id="discord_bot_token"
                  type={showToken ? 'text' : 'password'}
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="Paste the Discord bot token"
                />
                <Button variant="outline" size="icon" onClick={() => setShowToken((s) => !s)} type="button">
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  onClick={() => persist('discord_bot_token', botToken.trim(), 'Discord bot token for posting order notifications')}
                  disabled={saving === 'discord_bot_token'}
                >
                  {saving === 'discord_bot_token' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                The bot needs the “Send Messages” and “Embed Links” permissions in each channel.
              </p>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              {DISCORD_CATEGORIES.map((category) => (
                <div key={category} className="space-y-2">
                  <Label htmlFor={`ch-${category}`} className="capitalize">
                    {category.replace('-', ' ')} channel ID
                  </Label>
                  <Input
                    id={`ch-${category}`}
                    value={channels[category] ?? ''}
                    onChange={(e) => setChannels((p) => ({ ...p, [category]: e.target.value }))}
                    placeholder="e.g. 1470244531680186478"
                  />
                </div>
              ))}
            </div>
            <Button onClick={saveChannels} disabled={saving === 'discord_order_channels'}>
              {saving === 'discord_order_channels'
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <Save className="h-4 w-4 mr-2" />}
              Save channel mapping
            </Button>
          </CardContent>
        </Card>

        {/* Advanced raw editor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Code2 className="h-5 w-5 text-primary" /> Advanced (raw values)
            </CardTitle>
            <CardDescription>
              Edit any setting directly as JSON. Use with care — these values feed live calculations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_2fr]">
              <div className="space-y-2">
                <Label htmlFor="raw-key">Setting key</Label>
                <select
                  id="raw-key"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={rawKey}
                  onChange={(e) => {
                    const key = e.target.value;
                    setRawKey(key);
                    const found = rows.find((r) => r.key === key);
                    setRawValue(found ? JSON.stringify(found.value, null, 2) : '');
                  }}
                >
                  <option value="">Select a key…</option>
                  {rows.map((r) => (
                    <option key={r.key} value={r.key}>{r.key}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="raw-value">JSON value</Label>
                <Textarea
                  id="raw-value"
                  rows={5}
                  value={rawValue}
                  onChange={(e) => setRawValue(e.target.value)}
                  className="font-mono text-xs"
                  placeholder='{"value": 50}'
                />
              </div>
            </div>
            <Button onClick={saveRaw} disabled={!rawKey || saving === rawKey}>
              {saving === rawKey ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save raw value
            </Button>

            <Separator />

            <div className="space-y-1 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Stored settings ({rows.length})</p>
              {rows.map((r) => (
                <p key={r.key} className="font-mono truncate">
                  {r.key} = {JSON.stringify(r.value)}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="mt-6">
          <SeoIndexHealth />
        </div>
      </motion.div>
    </SuperAdminLayout>
  );
};

export default ManageSystemSettings;
