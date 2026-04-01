import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

let globalAdsEnabled = true;
const listeners = new Set<(v: boolean) => void>();

const notify = (val: boolean) => {
  globalAdsEnabled = val;
  listeners.forEach(fn => fn(val));
};

// Initial fetch + realtime subscription (singleton)
let initialized = false;
const init = () => {
  if (initialized) return;
  initialized = true;

  supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'ads_enabled')
    .maybeSingle()
    .then(({ data }) => {
      if (data) {
        notify(data.value === true || data.value === 'true');
      }
    });

  supabase
    .channel('ads-enabled-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'system_settings', filter: 'key=eq.ads_enabled' },
      (payload) => {
        const val = (payload.new as any)?.value;
        if (val !== undefined) {
          notify(val === true || val === 'true');
        }
      }
    )
    .subscribe();
};

export const useAdsEnabled = () => {
  const [adsEnabled, setAdsEnabled] = useState(globalAdsEnabled);

  useEffect(() => {
    init();
    setAdsEnabled(globalAdsEnabled);
    listeners.add(setAdsEnabled);
    return () => { listeners.delete(setAdsEnabled); };
  }, []);

  return adsEnabled;
};

/** Call this from admin to update the setting */
export const setAdsEnabledSetting = async (enabled: boolean) => {
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

  // Immediately notify all listeners (don't wait for realtime)
  notify(enabled);
};
