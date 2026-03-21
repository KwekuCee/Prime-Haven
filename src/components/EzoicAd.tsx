import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface EzoicAdProps {
  placeholderId: number;
  className?: string;
}

declare global {
  interface Window {
    ezstandalone: {
      cmd: Array<() => void>;
      showAds: (...ids: number[]) => void;
      destroyPlaceholders: (...ids: number[]) => void;
      destroyAll: () => void;
    };
  }
}

const EzoicAd = ({ placeholderId, className = '' }: EzoicAdProps) => {
  const location = useLocation();
  const prevPath = useRef(location.pathname);
  const [adsEnabled, setAdsEnabled] = useState(true);

  useEffect(() => {
    const checkAdSetting = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'ads_enabled')
        .maybeSingle();
      if (data) {
        setAdsEnabled(data.value === true || data.value === 'true');
      }
    };
    checkAdSetting();
  }, []);

  // Show ad on mount
  useEffect(() => {
    if (!adsEnabled) return;
    window.ezstandalone = window.ezstandalone || { cmd: [], showAds: () => {}, destroyPlaceholders: () => {}, destroyAll: () => {} };
    window.ezstandalone.cmd = window.ezstandalone.cmd || [];
    window.ezstandalone.cmd.push(function () {
      window.ezstandalone.showAds(placeholderId);
    });
  }, [placeholderId, adsEnabled]);

  // Refresh ads on route change
  useEffect(() => {
    if (!adsEnabled) return;
    if (prevPath.current !== location.pathname) {
      prevPath.current = location.pathname;
      window.ezstandalone?.cmd?.push(function () {
        window.ezstandalone.showAds();
      });
    }
  }, [location.pathname, adsEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!adsEnabled) return;
      try {
        window.ezstandalone?.cmd?.push(function () {
          window.ezstandalone.destroyPlaceholders(placeholderId);
        });
      } catch {
        // Ezoic not loaded
      }
    };
  }, [placeholderId, adsEnabled]);

  if (!adsEnabled) return null;

  return (
    <div className={`w-full flex justify-center py-4 ${className}`}>
      <div id={`ezoic-pub-ad-placeholder-${placeholderId}`} />
    </div>
  );
};

export default EzoicAd;
