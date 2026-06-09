import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

let globalAdsEnabled = true;
const listeners = new Set<(v: boolean) => void>();

const notify = (val: boolean) => {
  globalAdsEnabled = val;
  listeners.forEach(fn => fn(val));
};

// Initial fetch + polling (singleton) — no realtime since system_settings is admin-only
let initialized = false;
let pollInterval: ReturnType<typeof setInterval> | null = null;

const fetchAdsEnabled = async () => {
  const { data } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'ads_enabled')
    .maybeSingle();

  if (data) {
    notify(data.value === true || data.value === 'true');
  }
};

const init = () => {
  if (initialized) return;
  initialized = true;

  fetchAdsEnabled();

  // Poll every 30 seconds for changes (replaces realtime which was a security risk)
  pollInterval = setInterval(fetchAdsEnabled, 30000);
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

  // Immediately notify all listeners
  notify(enabled);
};
