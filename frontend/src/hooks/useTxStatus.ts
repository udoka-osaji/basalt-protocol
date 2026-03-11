import { useQuery } from '@tanstack/react-query';
import { getTxStatus, TxStatus } from '@/lib/tx';

export function useTxStatus(txId: string | null) {
  return useQuery({
    queryKey: ['tx', txId],
    queryFn: async (): Promise<TxStatus> => {
      if (!txId) return 'pending';
      return getTxStatus(txId);
    },
    enabled: !!txId,
    refetchInterval: (query) => {
      // Stop polling when confirmed or failed
      if (query.state.data === 'success' || query.state.data === 'failed') {
        return false;
      }
      return 5000;
    },
  });
}
