import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { VaultConfig } from '@/config/vaults';
import { useVaultStats } from '@/hooks/useVaultStats';
import { useUserPosition } from '@/hooks/useUserPosition';
import { useWallet } from '@/context/WalletContext';
import { formatSbtc, formatShares, calculateTotalReturn, formatApy } from '@/lib/format';
import { Button } from '@/components/ui/button';

interface VaultCardProps {
  config: VaultConfig;
}

export function VaultCard({ config }: VaultCardProps) {
  const navigate = useNavigate();
  const { isConnected, connect } = useWallet();
  const { data: stats, isLoading: statsLoading } = useVaultStats(config.contractName);
  const { data: position, isLoading: positionLoading } = useUserPosition(config.contractName);

  const getBadgeStyle = () => {
    switch (config.badgeColor) {
      case 'orange': return 'bg-accent-muted text-accent border border-accent/20';
      case 'blue': return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
      case 'purple': return 'bg-purple-500/10 text-purple-500 border border-purple-500/20';
      default: return 'bg-background-surface-raised text-foreground-secondary';
    }
  };

  const handleCardClick = () => {
    navigate(`/vault/${config.slug}`);
  };

  return (
    <div onClick={handleCardClick} className="block group cursor-pointer">
      <div className="flex flex-col h-full bg-background-surface border border-border rounded-xl p-7 transition-all duration-200 hover:-translate-y-0.5 hover:bg-background-surface-raised hover:border-border-subtle relative overflow-hidden group-hover:border-foreground-tertiary">
        
        {/* Header */}
        <div className="mb-5">
          <div className="flex justify-between items-start mb-3">
            <span className={`px-2 py-0.5 rounded-full text-[12px] font-medium ${getBadgeStyle()}`}>
              {config.badge}
            </span>
            <ChevronRight className="w-5 h-5 text-foreground-tertiary group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="heading-lg text-foreground mb-1.5">{config.name}</h3>
          <p className="body-sm text-foreground-secondary line-clamp-2">{config.description}</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 py-5 border-y border-border-subtle mb-5 gap-2">
          <div className="flex flex-col gap-1">
            <div className="body-sm text-foreground-tertiary">TVL</div>
            {statsLoading ? (
              <div className="w-20 h-5 rounded bg-background-surface-raised animate-shimmer" />
            ) : (
              <div className="numeric-sm text-foreground">{formatSbtc(stats?.totalAssets || 0n)} sBTC</div>
            )}
          </div>
          <div className="text-center flex flex-col gap-1">
            <div className="body-sm text-foreground-tertiary">Total Return</div>
            {statsLoading ? (
              <div className="w-12 h-5 rounded bg-background-surface-raised animate-shimmer mx-auto" />
            ) : (
              <div className={`numeric-sm ${(stats?.sharePrice || 1) > 1 ? 'text-success' : 'text-foreground-tertiary'}`}>
                {formatApy(calculateTotalReturn(stats?.sharePrice || 1))}
              </div>
            )}
          </div>
          <div className="text-right flex flex-col gap-1">
            <div className="body-sm text-foreground-tertiary">Share Price</div>
            {statsLoading ? (
              <div className="w-24 h-5 rounded bg-background-surface-raised animate-shimmer" />
            ) : (
              <div className="numeric-sm text-foreground">{stats?.sharePrice.toFixed(4)} sBTC</div>
            )}
          </div>
        </div>

        {/* User Position */}
        <div className="mb-6 flex-grow">
          <div className="body-sm text-foreground-secondary mb-2.5 uppercase tracking-wider font-semibold text-[10px]">Your Position</div>
          
          {!isConnected ? (
            <div className="py-2 text-center text-foreground-tertiary body-sm italic">
              Connect wallet to view position
            </div>
          ) : positionLoading ? (
            <div className="flex justify-between py-1">
              <div className="w-16 h-5 rounded bg-background-surface-raised animate-shimmer" />
              <div className="w-24 h-5 rounded bg-background-surface-raised animate-shimmer" />
            </div>
          ) : position?.shares === 0n ? (
            <div className="py-2 text-center">
              <span className="body-sm text-foreground-tertiary">No position</span>
            </div>
          ) : (
            <div className="flex justify-between">
              <span className="numeric-sm text-foreground">{formatShares(position?.shares || 0n)} shares</span>
              <span className="numeric-sm text-foreground">{formatSbtc(position?.value || 0n)} sBTC</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 mt-auto relative z-10" onClick={(e) => e.stopPropagation()}>
          {!isConnected ? (
            <Button onClick={connect} className="col-span-2 bg-background-surface-raised hover:bg-border text-foreground border border-border">
              Connect Wallet
            </Button>
          ) : (
            <>
              <Link to={`/vault/${config.slug}?tab=deposit`} className="w-full">
                <Button className="w-full bg-primary hover:bg-primary-hover text-primary-foreground h-11">
                  Deposit
                </Button>
              </Link>
              <Link to={`/vault/${config.slug}?tab=withdraw`} className="w-full">
                <Button 
                  variant="outline" 
                  disabled={position?.shares === 0n}
                  className="w-full border-border hover:bg-background-surface-raised text-foreground h-11 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  Withdraw
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
