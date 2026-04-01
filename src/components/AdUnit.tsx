import { useRef } from 'react';
import { useAdsEnabled } from '@/hooks/useAdsEnabled';

interface AdUnitProps {
  slot: string;
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  className?: string;
}

const AdUnit = ({ slot, format = 'auto', className = '' }: AdUnitProps) => {
  const adRef = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);
  const adsEnabled = useAdsEnabled();

  if (!pushed.current && adsEnabled) {
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // AdSense not ready or blocked
    }
  }

  if (!adsEnabled) return null;

  return (
    <div className={`w-full flex justify-center py-6 ${className}`} ref={adRef}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%' }}
        data-ad-client="ca-pub-5179411748802483"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default AdUnit;
