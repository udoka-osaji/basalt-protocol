import { useQuery } from '@tanstack/react-query';
import { getShareBalance } from '@/lib/contracts';
import { DEPLOYER } from '@/config/contracts';
import { useWallet } from '@/context/WalletContext';
import { vaultKeys, useVaultStats } from './useVaultStats';

export interface UserPosition {
  shares: bigint;
  value: bigint;
}

export function useUserPosition(vaultName: string) {
  const { address, isConnected } = useWallet();
  const { data: stats } = useVaultStats(vaultName);

  return useQuery({
    queryKey: vaultKeys.userPosition(vaultName, address || ''),
    queryFn: async (): Promise<UserPosition> => {
      if (!address) {
        return { shares: 0n, value: 0n };
      }

      const sender = address || DEPLOYER;
      const shares = await getShareBalance(vaultName, address, sender);

      // Calculate value based on share price
      const value =
        stats && stats.totalShares > 0n
          ? (shares * stats.totalAssets) / stats.totalShares
          : shares;

      return { shares, value };
    },
    enabled: isConnected && !!address,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
