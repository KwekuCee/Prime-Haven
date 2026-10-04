import { QueryClient } from '@tanstack/react-query';

/** App-wide data cache. Shared reads (settings, public totals) are fetched once and reused. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
