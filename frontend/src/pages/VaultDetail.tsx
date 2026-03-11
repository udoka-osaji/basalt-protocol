import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getVaultBySlug } from '@/config/vaults';
import { useVaultStats } from '@/hooks/useVaultStats';
import { useUserPosition } from '@/hooks/useUserPosition';
import { formatSbtc, formatShares, calculateEstimatedApy, formatApy } from '@/lib/format';
import { TransactionPanel } from '@/components/transaction/TransactionPanel';
import { FlowDiagram } from '@/components/vault/FlowDiagram';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" as const, delay },
});
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export default function VaultDetail() {
  const { slug } = useParams<{ slug: string }>();
  const config = getVaultBySlug(slug || '');
  
  const { data: stats, isLoading: statsLoading } = useVaultStats(config?.contractName || '');
  const { data: position, isLoading: positionLoading } = useUserPosition(config?.contractName || '');

  if (!config) {
    return (
      <div className="container mx-auto py-16 text-center">
        <h1 className="heading-lg text-foreground mb-4">Vault not found</h1>
        <Link to="/">
          <button className="text-primary hover:text-primary-hover transition-colors">
            Return to Dashboard
          </button>
        </Link>
      </div>
    );
  }

  const getBadgeStyle = () => {
    switch (config.badgeColor) {
      case 'orange': return 'bg-accent-muted text-accent border border-accent/20';
      case 'blue': return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
      case 'purple': return 'bg-purple-500/10 text-purple-500 border border-purple-500/20';
      default: return 'bg-background-surface-raised text-foreground-secondary';
    }
  };

  const hasPosition = position && position.shares > 0n;

  return (
    <div className="container mx-auto py-10 max-w-7xl">
      {/* Breadcrumb */}
      <motion.div {...fadeUp(0)}>
        <Breadcrumb className="mb-8">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="text-foreground-secondary hover:text-foreground">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-foreground">{config.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column - Info & Stats */}
        <div className="lg:col-span-7 flex flex-col gap-10">
          
          {/* Header Area */}
          <motion.div {...fadeUp(0.1)}>
            <div className="flex items-center gap-4 mb-4">
              <h1 className="display-md text-foreground">{config.name}</h1>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getBadgeStyle()}`}>
                {config.badge}
              </span>
            </div>
            <p className="body-lg text-foreground-secondary leading-relaxed max-w-2xl">
              {config.longDescription}
            </p>
          </motion.div>

          {/* Vault Stats */}
          <motion.div {...fadeUp(0.2)}>
            <div className="body-sm text-foreground-tertiary uppercase tracking-wider font-semibold text-[10px] mb-3">Vault Stats</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 p-6 rounded-xl border border-border bg-background-surface">
              <div className="flex flex-col gap-1.5">
                <div className="body-sm text-foreground-tertiary font-medium">Total Value Locked</div>
                {statsLoading ? (
                  <div className="w-24 h-7 rounded bg-background-surface-raised animate-shimmer" />
                ) : (
                  <div className="numeric-md text-foreground">{formatSbtc(stats?.totalAssets || 0n)} sBTC</div>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="body-sm text-foreground-tertiary font-medium">Total Shares</div>
                {statsLoading ? (
                  <div className="w-24 h-7 rounded bg-background-surface-raised animate-shimmer" />
                ) : (
                  <div className="numeric-md text-foreground">{formatShares(stats?.totalShares || 0n)}</div>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="body-sm text-foreground-tertiary font-medium">Share Price</div>
                {statsLoading ? (
                  <div className="w-24 h-7 rounded bg-background-surface-raised animate-shimmer" />
                ) : (
                  <div className="numeric-md text-foreground">{stats?.sharePrice.toFixed(4)} sBTC</div>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="body-sm text-foreground-tertiary font-medium">Estimated APY</div>
                {statsLoading ? (
                  <div className="w-16 h-7 rounded bg-background-surface-raised animate-shimmer" />
                ) : (
                  <div className={`numeric-md ${(stats?.sharePrice || 1) > 1 ? 'text-success' : 'text-foreground-secondary'}`}>
                    {formatApy(calculateEstimatedApy(stats?.sharePrice || 1))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Your Position */}
          <motion.div {...fadeUp(0.3)}>
            <div className="body-sm text-foreground-tertiary uppercase tracking-wider font-semibold text-[10px] mb-3">Your Position</div>
            {positionLoading ? (
              <div className="grid grid-cols-2 gap-6 p-6 rounded-xl border border-border bg-background-surface">
                <div className="flex flex-col gap-1.5">
                  <div className="body-sm text-foreground-tertiary font-medium">Your Shares</div>
                  <div className="w-20 h-7 rounded bg-background-surface-raised animate-shimmer" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="body-sm text-foreground-tertiary font-medium">Position Value</div>
                  <div className="w-28 h-7 rounded bg-background-surface-raised animate-shimmer" />
                </div>
              </div>
            ) : hasPosition ? (
              <div className="grid grid-cols-2 gap-6 p-6 rounded-xl border border-border bg-background-surface border-l-2 border-l-primary">
                <div className="flex flex-col gap-1.5">
                  <div className="body-sm text-foreground-tertiary font-medium">Your Shares</div>
                  <div className="numeric-md text-primary">{formatShares(position.shares)}</div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="body-sm text-foreground-tertiary font-medium">Position Value</div>
                  <div className="numeric-md text-primary">{formatSbtc(position.value)} sBTC</div>
                </div>
              </div>
            ) : (
              <div className="py-3 px-1">
                <span className="body-sm text-foreground-tertiary">No active position in this vault</span>
              </div>
            )}
          </motion.div>

          {/* Flow Diagram */}
          <motion.div {...fadeUp(0.4)}>
            <h3 className="heading-sm text-foreground mb-4">Yield Strategy</h3>
            <FlowDiagram steps={config.flowSteps} />
          </motion.div>
        </div>

        {/* Right Column - Transaction Panel (Sticky) */}
        <motion.div className="lg:col-span-5 relative" {...fadeUp(0.2)}>
          <div className="sticky top-24">
            <TransactionPanel config={config} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
