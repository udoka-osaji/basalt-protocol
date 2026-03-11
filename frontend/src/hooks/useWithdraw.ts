import { useMutation, useQueryClient } from '@tanstack/react-query';
import { withdraw } from '@/lib/contracts';
import { vaultKeys } from './useVaultStats';
import { useWallet } from '@/context/WalletContext';

export function useWithdraw(vaultName: string) {
  const queryClient = useQueryClient();
  const { refreshBalance } = useWallet();

  return useMutation({
    mutationFn: (shares: bigint) => withdraw(vaultName, shares),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vaultKeys.stats(vaultName) });
      queryClient.invalidateQueries({ queryKey: vaultKeys.all });
      refreshBalance();
    },
  });
}
