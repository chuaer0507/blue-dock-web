import { QueryClient } from '@tanstack/react-query';

/** 壳层 `QueryClientProvider` 共用实例 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
