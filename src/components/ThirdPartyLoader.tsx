import { useEffect, useCallback, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAdsEnabled } from '@/hooks/useAdsEnabled';

// Loads third-party scripts lazily after user interaction or a short timeout.
export default function ThirdPartyLoader() {
  const isMobile = useIsMobile();
  const adsEnabled = useAdsEnabled();
  const [loaded, setLoaded] = useState(false);

  const insertScript = useCallback((attrs: { src: string; async?: boolean; defer?: boolean; crossorigin?: string; dataset?: Record<string, string> }) => {
    const s = document.createElement('script');
    s.src = attrs.src;
    if (attrs.async) s.async = true;
    if (attrs.defer) s.defer = true;
    if (attrs.crossorigin) s.crossOrigin = attrs.crossorigin as any;
    if (attrs.dataset) {
      Object.entries(attrs.dataset).forEach(([k, v]) => s.setAttribute(`data-${k}`, v));
    }
    document.body.appendChild(s);
  }, []);

  const loadAll = useCallback(() => {
    if (loaded) return;

    // Only load ad-related scripts when ads are enabled
    if (adsEnabled) {
      // Adsterra (load asynchronously)
      insertScript({ src: 'https://pl28947943.profitablecpmratenetwork.com/ec/f3/2c/ecf32c359875e5dc9c20bd2c30ec567f.js', async: true });

      // Ezoic - consent managers + analytics (load async)
      insertScript({ src: 'https://cmp.gatekeeperconsent.com/min.js', async: true, dataset: { cfasync: 'false' } });
      insertScript({ src: 'https://the.gatekeeperconsent.com/cmp.min.js', async: true, dataset: { cfasync: 'false' } });
      insertScript({ src: '//www.ezojs.com/ezoic/sa.min.js', async: true });
      insertScript({ src: '//ezoicanalytics.com/analytics.js', async: true });
    }

    setLoaded(true);
  }, [adsEnabled, insertScript, isMobile, loaded]);

  useEffect(() => {
    // Load critical payment scripts immediately
    insertScript({ src: 'https://korablobstorage.blob.core.windows.net/modal-bucket/korapay-collections.min.js', async: false });
    insertScript({ src: 'https://js.paystack.co/v1/inline.js', async: false });

    // Load other third-party scripts after short idle period
    const timer = window.setTimeout(() => loadAll(), 2500);



    // Or load immediately on first user interaction
    const onInteraction = () => {
      loadAll();
      window.removeEventListener('scroll', onInteraction);
      window.removeEventListener('pointerdown', onInteraction);
      window.removeEventListener('touchstart', onInteraction);
    };

    window.addEventListener('scroll', onInteraction, { passive: true });
    window.addEventListener('pointerdown', onInteraction);
    window.addEventListener('touchstart', onInteraction);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', onInteraction);
      window.removeEventListener('pointerdown', onInteraction);
      window.removeEventListener('touchstart', onInteraction);
    };
  }, [loadAll]);

  return null;
}
