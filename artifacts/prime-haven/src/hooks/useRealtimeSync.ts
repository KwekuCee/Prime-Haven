import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscribes to Lovable Cloud Realtime (websockets) for the given tables and
 * calls `onChange` whenever a row is inserted, updated or deleted.
 *
 * This gives the same instant-refresh behaviour as a Socket.io server without
 * needing a persistent Node process (this stack is serverless).
 */
export function useRealtimeSync(
  tables: string[],
  onChange: () => void,
  channelName = 'realtime-sync',
) {
  const handler = useRef(onChange);
  handler.current = onChange;

  const key = tables.join('|');

  useEffect(() => {
    if (!key) return;
    const list = key.split('|');
    const channel = supabase.channel(`${channelName}:${key}`);

    list.forEach((table) => {
      channel.on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table },
        () => handler.current(),
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [key, channelName]);
}

export default useRealtimeSync;
