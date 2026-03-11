import { useWallet } from '@/context/WalletContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatSbtc, truncateAddress } from '@/lib/format';
import { getAddressExplorerUrl } from '@/config/contracts';
import { Copy, ExternalLink, LogOut, Loader2 } from 'lucide-react';

export function ConnectButton() {
  const { address, isConnected, isConnecting, sbtcBalance, connect, disconnect } = useWallet();

  if (isConnecting) {
    return (
      <Button disabled className="h-11 px-5 rounded-lg bg-primary text-primary-foreground font-medium text-[14px]">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Connecting...
      </Button>
    );
  }

  if (!isConnected || !address) {
    return (
      <Button 
        onClick={connect} 
        className="h-11 px-5 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground font-medium text-[14px] transition-colors"
      >
        Connect Wallet
      </Button>
    );
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
  };

  const openExplorer = () => {
    window.open(getAddressExplorerUrl(address), '_blank');
  };

  return (
    <div className="flex items-center gap-3">
      <div className="hidden md:flex items-center">
        <span className="numeric-sm text-foreground">{formatSbtc(sbtcBalance)} sBTC</span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-11 px-4 rounded-lg bg-transparent hover:bg-background-surface-raised text-foreground-secondary hover:text-foreground border border-border transition-colors">
            <div className="w-2 h-2 rounded-full bg-primary mr-2" />
            <span className="font-mono text-sm">{truncateAddress(address)}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-background-surface border-border">
          <DropdownMenuItem onClick={copyAddress} className="cursor-pointer hover:bg-background-surface-raised focus:bg-background-surface-raised">
            <Copy className="w-4 h-4 mr-2" />
            Copy Address
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openExplorer} className="cursor-pointer hover:bg-background-surface-raised focus:bg-background-surface-raised">
            <ExternalLink className="w-4 h-4 mr-2" />
            View on Explorer
          </DropdownMenuItem>
          <DropdownMenuItem onClick={disconnect} className="cursor-pointer text-destructive focus:text-destructive hover:bg-destructive-muted focus:bg-destructive-muted mt-1">
            <LogOut className="w-4 h-4 mr-2" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
