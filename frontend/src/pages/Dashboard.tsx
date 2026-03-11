import { motion } from 'framer-motion';
import { VAULTS } from '@/config/vaults';
import { VaultCard } from '@/components/vault/VaultCard';
import { useVaultStats } from '@/hooks/useVaultStats';
import { formatSbtc } from '@/lib/format';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" as const, delay },
});

function ProtocolStatsBar() {
  const basaltStats = useVaultStats('basalt-vault');
  const lendingStats = useVaultStats('lending-strategy-vault');
  const yieldStats = useVaultStats('sbtc-yield-vault');

  const isLoading = basaltStats.isLoading || lendingStats.isLoading || yieldStats.isLoading;

  const totalAssets =
    (basaltStats.data?.totalAssets || 0n) +
    (lendingStats.data?.totalAssets || 0n) +
    (yieldStats.data?.totalAssets || 0n);

  const totalShares =
    (basaltStats.data?.totalShares || 0n) +
    (lendingStats.data?.totalShares || 0n) +
    (yieldStats.data?.totalShares || 0n);

  const prices = [
    basaltStats.data?.sharePrice || 1,
    lendingStats.data?.sharePrice || 1,
    yieldStats.data?.sharePrice || 1,
  ];

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  const priceRange =
    minPrice === maxPrice
      ? `${minPrice.toFixed(4)} sBTC`
      : `${minPrice.toFixed(4)} — ${maxPrice.toFixed(4)} sBTC`;

  return (
    <div className="bg-background-surface border border-border rounded-xl p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:border-r border-border-subtle md:pr-6">
          <div className="body-sm text-foreground-tertiary mb-1.5">Total Value Locked</div>
          {isLoading ? (
            <div className="w-32 h-8 rounded bg-background-surface-raised animate-shimmer" />
          ) : (
            <div className="numeric-lg text-foreground">{formatSbtc(totalAssets)} sBTC</div>
          )}
        </div>

        <div className="md:border-r border-border-subtle md:pr-6">
          <div className="body-sm text-foreground-tertiary mb-1.5">Total Shares Minted</div>
          {isLoading ? (
            <div className="w-24 h-8 rounded bg-background-surface-raised animate-shimmer" />
          ) : (
            <div className="numeric-md text-foreground">{Number(totalShares).toLocaleString('en-US')}</div>
          )}
        </div>

        <div>
          <div className="body-sm text-foreground-tertiary mb-1.5">Share Price Range</div>
          {isLoading ? (
            <div className="w-40 h-8 rounded bg-background-surface-raised animate-shimmer" />
          ) : (
            <div className="numeric-md text-foreground">{priceRange}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="container mx-auto py-10 max-w-7xl">
      {/* Hero */}
      <motion.div className="mb-8" {...fadeUp(0)}>
        <h1 className="display-lg text-foreground mb-2">Basalt Protocol</h1>
        <p className="body-lg text-foreground-secondary max-w-xl">
          Earn yield on sBTC through composable vault strategies on Stacks.
        </p>
      </motion.div>

      <motion.div className="mb-10" {...fadeUp(0.15)}>
        <ProtocolStatsBar />
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {VAULTS.map((vault, index) => (
          <motion.div key={vault.slug} {...fadeUp(0.3 + index * 0.1)}>
            <VaultCard config={vault} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
