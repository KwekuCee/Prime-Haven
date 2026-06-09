import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useTheme } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UserSettings {
  theme: string;
  currency: string;
  profile_visibility: string;
  show_earnings: boolean;
  allow_messages: boolean;
  data_sharing: boolean;
  email_notifications: boolean;
  project_updates: boolean;
  payment_alerts: boolean;
  marketing_emails: boolean;
  push_notifications: boolean;
}

const defaultSettings: UserSettings = {
  theme: 'dark',
  currency: 'ghs',
  profile_visibility: 'public',
  show_earnings: false,
  allow_messages: true,
  data_sharing: false,
  email_notifications: true,
  project_updates: true,
  payment_alerts: true,
  marketing_emails: false,
  push_notifications: true,
};

interface UserSettingsContextType {
  settings: UserSettings;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  saveSettings: () => Promise<void>;
  loading: boolean;
  formatCurrency: (amount: number) => string;
  exchangeRate: number;
}

const UserSettingsContext = createContext<UserSettingsContextType | undefined>(undefined);



export const UserSettingsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { setTheme } = useTheme();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [hasRecord, setHasRecord] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(10); // Default to user requested 10

  useEffect(() => {
    const loadSettings = async () => {
      // Fetch exchange rate first (system setting)
      try {
        const { data: rateData } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'usd_to_ghs_rate')
          .maybeSingle();

        if (rateData && typeof rateData.value === 'number') {
          setExchangeRate(rateData.value);
        } else if (rateData && typeof rateData.value === 'string') {
          setExchangeRate(parseFloat(rateData.value) || 10);
        } else if (rateData && typeof rateData.value === 'object' && (rateData.value as any).rate) {
          setExchangeRate(parseFloat((rateData.value as any).rate) || 10);
        }
      } catch (err) {
        console.error('Error fetching exchange rate:', err);
      }

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data) {
          setHasRecord(true);
          const loaded: UserSettings = {
            theme: data.theme || 'dark',
            currency: data.currency || 'ghs',
            profile_visibility: data.profile_visibility || 'public',
            show_earnings: data.show_earnings ?? false,
            allow_messages: data.allow_messages ?? true,
            data_sharing: data.data_sharing ?? false,
            email_notifications: data.email_notifications ?? true,
            project_updates: data.project_updates ?? true,
            payment_alerts: data.payment_alerts ?? true,
            marketing_emails: data.marketing_emails ?? false,
            push_notifications: data.push_notifications ?? true,
          };
          setSettings(loaded);
          setTheme(loaded.theme);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user, setTheme]);

  const updateSetting = useCallback(<K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    if (key === 'theme') {
      setTheme(value as string);
    }
  }, [setTheme]);

  const saveSettings = useCallback(async () => {
    if (!user) return;

    const payload = {
      user_id: user.id,
      ...settings,
      updated_at: new Date().toISOString(),
    };

    if (hasRecord) {
      await supabase.from('user_settings').update(payload).eq('user_id', user.id);
    } else {
      await supabase.from('user_settings').insert(payload);
      setHasRecord(true);
    }
  }, [user, settings, hasRecord]);

  const formatCurrency = useCallback((amountInGhs: number) => {
    if (settings.currency === 'usd') {
      const ghsToUsd = 1 / exchangeRate;
      return `$${(amountInGhs * ghsToUsd).toFixed(2)}`;
    }
    return `GH₵${amountInGhs.toFixed(2)}`;
  }, [settings.currency, exchangeRate]);

  return (
    <UserSettingsContext.Provider value={{ settings, updateSetting, saveSettings, loading, formatCurrency, exchangeRate }}>
      {children}
    </UserSettingsContext.Provider>
  );
};

export const useUserSettings = () => {
  const context = useContext(UserSettingsContext);
  if (!context) {
    throw new Error('useUserSettings must be used within a UserSettingsProvider');
  }
  return context;
};
