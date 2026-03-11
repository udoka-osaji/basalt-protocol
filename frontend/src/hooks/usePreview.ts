import { useQuery } from '@tanstack/react-query';
import { previewDeposit, previewWithdraw } from '@/lib/contracts';
import { DEPLOYER } from '@/config/contracts';
import { useWallet } from '@/context/WalletContext';
import { vaultKeys } from './useVaultStats';
import { useDebounce } from './useDebounce';

export function usePreviewDeposit(vaultName: string, amount: bigint) {
  const { address } = useWallet();
  const debouncedAmount = useDebounce(amount.toString(), 300);

  return useQuery({
    queryKey: vaultKeys.preview(vaultName, 'deposit', debouncedAmount),
    queryFn: async () => {
      const sender = address || DEPLOYER;
      const amountBigInt = BigInt(debouncedAmount);
      if (amountBigInt <= 0n) return 0n;
      return previewDeposit(vaultName, amountBigInt, sender);
    },
    enabled: BigInt(debouncedAmount) > 0n,
    staleTime: 10_000,
  });
}

export function usePreviewWithdraw(vaultName: string, shares: bigint) {
  const { address } = useWallet();
  const debouncedShares = useDebounce(shares.toString(), 300);

  return useQuery({
    queryKey: vaultKeys.preview(vaultName, 'withdraw', debouncedShares),
    queryFn: async () => {
      const sender = address || DEPLOYER;
      const sharesBigInt = BigInt(debouncedShares);
      if (sharesBigInt <= 0n) return 0n;
      return previewWithdraw(vaultName, sharesBigInt, sender);
    },
    enabled: BigInt(debouncedShares) > 0n,
    staleTime: 10_000,
  });
}
