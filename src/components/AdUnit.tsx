import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdUnitProps {
  slot: string;
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  className?: string;
}

const AdUnit = ({ slot, format = 'auto', className = '' }: AdUnitProps) => {
  const adRef = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);
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

  useEffect(() => {
    if (!adsEnabled || pushed.current) return;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // AdSense not ready or blocked
    }
  }, [adsEnabled]);

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
