import { useQuery } from '@tanstack/react-query';
import { getTotalAssets, getTotalShares } from '@/lib/contracts';
import { DEPLOYER } from '@/config/contracts';
import { useWallet } from '@/context/WalletContext';
import { calculateSharePrice } from '@/lib/format';

export interface VaultStats {
  totalAssets: bigint;
  totalShares: bigint;
  sharePrice: number;
}

export const vaultKeys = {
  all: ['vaults'] as const,
  stats: (vault: string) => ['vaults', vault, 'stats'] as const,
  userPosition: (vault: string, user: string) =>
    ['vaults', vault, 'user', user] as const,
  preview: (vault: string, type: string, amount: string) =>
    ['vaults', vault, 'preview', type, amount] as const,
};

export function useVaultStats(vaultName: string) {
  const { address } = useWallet();

  return useQuery({
    queryKey: vaultKeys.stats(vaultName),
    queryFn: async (): Promise<VaultStats> => {
      const sender = address || DEPLOYER;
      const [totalAssets, totalShares] = await Promise.all([
        getTotalAssets(vaultName, sender),
        getTotalShares(vaultName, sender),
      ]);

      const sharePrice = calculateSharePrice(totalAssets, totalShares);

      return { totalAssets, totalShares, sharePrice };
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
