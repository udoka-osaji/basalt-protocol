import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deposit } from '@/lib/contracts';
import { vaultKeys } from './useVaultStats';
import { useWallet } from '@/context/WalletContext';

export function useDeposit(vaultName: string) {
  const queryClient = useQueryClient();
  const { refreshBalance } = useWallet();

  return useMutation({
    mutationFn: (amount: bigint) => deposit(vaultName, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vaultKeys.stats(vaultName) });
      queryClient.invalidateQueries({ queryKey: vaultKeys.all });
      refreshBalance();
    },
  });
}
