import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAdsEnabled } from '@/hooks/useAdsEnabled';

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
  const adsEnabled = useAdsEnabled();

  useEffect(() => {
    if (!adsEnabled) return;
    window.ezstandalone = window.ezstandalone || { cmd: [], showAds: () => {}, destroyPlaceholders: () => {}, destroyAll: () => {} };
    window.ezstandalone.cmd = window.ezstandalone.cmd || [];
    window.ezstandalone.cmd.push(function () {
      window.ezstandalone.showAds(placeholderId);
    });
  }, [placeholderId, adsEnabled]);

  useEffect(() => {
    if (!adsEnabled) return;
    if (prevPath.current !== location.pathname) {
      prevPath.current = location.pathname;
      window.ezstandalone?.cmd?.push(function () {
        window.ezstandalone.showAds();
      });
    }
  }, [location.pathname, adsEnabled]);

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
