import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useTrackVisitor = () => {
  const { user } = useAuth();

  useEffect(() => {
    const track = async () => {
      try {
        await supabase.functions.invoke('track-visitor', {
          body: {
            page_path: window.location.pathname,
            user_id: user?.id || null,
          },
        });
      } catch {
        // Silent fail - tracking should never break the app
      }
    };

    // Small delay to not block page load
    const timer = setTimeout(track, 2000);
    return () => clearTimeout(timer);
  }, [user?.id]);
};
