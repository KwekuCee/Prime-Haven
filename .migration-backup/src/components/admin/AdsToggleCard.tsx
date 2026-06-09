import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Megaphone, Loader2 } from 'lucide-react';
import { useAdsEnabled, setAdsEnabledSetting } from '@/hooks/useAdsEnabled';
import { toast } from 'sonner';

export default function AdsToggleCard() {
  const adsEnabled = useAdsEnabled();
  const [saving, setSaving] = useState(false);

  const handleToggle = async (next: boolean) => {
    setSaving(true);
    try {
      await setAdsEnabledSetting(next);
      toast.success(next ? 'Ads enabled across the platform' : 'Ads disabled across the platform');
    } catch (e) {
      toast.error('Failed to update ad setting');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            Platform Ads
          </CardTitle>
          <CardDescription className="text-xs">
            Disables Adsterra, AdSense and Ezoic for every visitor and user.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          <Switch
            checked={adsEnabled}
            onCheckedChange={handleToggle}
            disabled={saving}
            aria-label="Toggle platform ads"
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground">
          Status:{' '}
          <span className={adsEnabled ? 'text-emerald-500 font-medium' : 'text-destructive font-medium'}>
            {adsEnabled ? 'Ads ON' : 'Ads OFF'}
          </span>
          {' '}· Changes propagate to all clients within ~30 seconds.
        </p>
      </CardContent>
    </Card>
  );
}
