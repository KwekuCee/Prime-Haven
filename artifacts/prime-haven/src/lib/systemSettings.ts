import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/lib/queryClient';

export interface SettingRow { key: string; value: unknown }

export const SYSTEM_SETTINGS_KEY = ['system_settings'] as const;

/**
 * Cached read of all system settings. Returns the same `{ data, error }` shape
 * as a direct query so it can replace `supabase.from('system_settings').select('key, value')`.
 * Many screens load settings on mount; this collapses them into one request per minute.
 */
export const fetchSystemSettings = async (): Promise<{ data: SettingRow[] | null; error: Error | null }> => {
  try {
    const data = await queryClient.fetchQuery({
      queryKey: SYSTEM_SETTINGS_KEY,
      staleTime: 60_000,
      queryFn: async () => {
        const { data, error } = await supabase.from('system_settings').select('key, value');
        if (error) throw error;
        return (data ?? []) as SettingRow[];
      },
    });
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
};

/** Call after any settings write so every screen sees fresh values. */
export const invalidateSystemSettings = () => queryClient.invalidateQueries({ queryKey: SYSTEM_SETTINGS_KEY });
