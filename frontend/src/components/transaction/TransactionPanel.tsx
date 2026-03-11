import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import { VaultConfig } from '@/config/vaults';
import { useWallet } from '@/context/WalletContext';
import { useVaultStats } from '@/hooks/useVaultStats';
import { useUserPosition } from '@/hooks/useUserPosition';
import { useDeposit } from '@/hooks/useDeposit';
import { useWithdraw } from '@/hooks/useWithdraw';
import { usePreviewDeposit, usePreviewWithdraw } from '@/hooks/usePreview';
import { useTxStatus } from '@/hooks/useTxStatus';
import { formatSbtc, formatShares, parseInputToRaw } from '@/lib/format';
import { getErrorMessage, getExplorerUrl } from '@/config/contracts';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, ExternalLink, Loader2, Wallet } from 'lucide-react';

interface TransactionPanelProps {
  config: VaultConfig;
}

export function TransactionPanel({ config }: TransactionPanelProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'withdraw' ? 'withdraw' : 'deposit';
  
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>(initialTab);
  const [amount, setAmount] = useState('');
  const [txState, setTxState] = useState<'idle' | 'confirming' | 'broadcasting' | 'confirmed' | 'failed'>('idle');
  const [activeTxId, setActiveTxId] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const { isConnected, sbtcBalance, connect } = useWallet();
  const { data: stats } = useVaultStats(config.contractName);
  const { data: position } = useUserPosition(config.contractName);
  
  const depositMutation = useDeposit(config.contractName);
  const withdrawMutation = useWithdraw(config.contractName);
  const { data: txStatusData } = useTxStatus(activeTxId);

  // Derived values
  const rawAmount = parseInputToRaw(amount);
  const isDeposit = activeTab === 'deposit';
  
  const previewDepositData = usePreviewDeposit(config.contractName, isDeposit ? rawAmount : 0n);
  const previewWithdrawData = usePreviewWithdraw(config.contractName, !isDeposit ? rawAmount : 0n);
  
  const isPreviewLoading = isDeposit ? previewDepositData.isLoading : previewWithdrawData.isLoading;
  const previewValue = isDeposit ? previewDepositData.data : previewWithdrawData.data;

  // Validation
  const hasInsufficientBalance = isDeposit 
    ? rawAmount > sbtcBalance 
    : position ? rawAmount > position.shares : true;
    
  const isInputValid = rawAmount > 0n && !hasInsufficientBalance;

  // Update URL on tab change
  useEffect(() => {
    setSearchParams({ tab: activeTab }, { replace: true });
    setAmount('');
    if (txState !== 'idle') {
      resetState();
    }
  }, [activeTab, setSearchParams]);

  // Track transaction status
  useEffect(() => {
    if (txState === 'broadcasting' && txStatusData) {
      if (txStatusData === 'success') {
        setTxState('confirmed');
        toast.success(isDeposit ? 'Deposit confirmed!' : 'Withdrawal confirmed!', {
          description: isDeposit
            ? `Deposited ${amount} sBTC for shares.`
            : `Withdrew ${amount} shares for sBTC.`,
        });
      } else if (txStatusData === 'failed') {
        setTxState('failed');
        setTxError('Transaction was rejected by the network');
        toast.error('Transaction failed', {
          description: 'The transaction was rejected by the network.',
        });
      }
    }
  }, [txStatusData, txState]);

  const handleMaxClick = () => {
    if (isDeposit) {
      setAmount((Number(sbtcBalance) / 1e8).toString());
    } else if (position) {
      setAmount((Number(position.shares) / 1e8).toString());
    }
  };

  const resetState = () => {
    setTxState('idle');
    setActiveTxId(null);
    setTxError(null);
    setAmount('');
  };

  const handleSubmit = async () => {
    if (!isInputValid) return;
    
    setTxState('confirming');
    
    try {
      const mutation = isDeposit ? depositMutation : withdrawMutation;
      const txId = await mutation.mutateAsync(rawAmount);
      
      setActiveTxId(txId);
      setTxState('broadcasting');
    } catch (err: any) {
      setTxState('failed');
      
      // Check if it's a known contract error
      const errString = err.toString();
      const match = errString.match(/error: (\d+)/);
      if (match) {
        setTxError(getErrorMessage(parseInt(match[1])));
      } else {
        setTxError(err.message || 'Transaction failed or was rejected');
      }
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-background-surface border border-border rounded-xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
        <div className="w-16 h-16 rounded-full bg-background-surface-raised flex items-center justify-center mb-6">
          <Wallet className="w-7 h-7 text-foreground-tertiary" />
        </div>
        <h3 className="heading-md text-foreground mb-2">Wallet Not Connected</h3>
        <p className="body-md text-foreground-secondary mb-8">Connect your Stacks wallet to interact with this vault.</p>
        <Button onClick={connect} className="w-full max-w-xs h-12 text-base font-medium">
          Connect Wallet
        </Button>
      </div>
    );
  }

  // Success State View
  if (txState === 'confirmed') {
    return (
      <div className="bg-background-surface border border-border rounded-xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
        <CheckCircle2 className="w-16 h-16 text-success mb-6" />
        <h3 className="heading-md text-foreground mb-2">Transaction Confirmed</h3>
        <p className="body-md text-foreground-secondary mb-8">
          {isDeposit 
            ? `Deposited ${amount} sBTC for shares.` 
            : `Withdrew ${amount} shares for sBTC.`}
        </p>
        <Button onClick={resetState} className="w-full h-12 text-base font-medium bg-background-surface-raised text-foreground hover:bg-border border border-border">
          Done
        </Button>
      </div>
    );
  }

  // Failed State View
  if (txState === 'failed') {
    return (
      <div className="bg-background-surface border border-border rounded-xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
        <XCircle className="w-16 h-16 text-destructive mb-6" />
        <h3 className="heading-md text-foreground mb-2">Transaction Failed</h3>
        <p className="body-md text-destructive max-w-sm mb-8">{txError}</p>
        <Button onClick={resetState} className="w-full h-12 text-base font-medium">
          Try Again
        </Button>
      </div>
    );
  }

  // Active Transaction Form
  return (
    <div className="bg-background-surface border border-border rounded-xl overflow-hidden flex flex-col h-full">
      {/* Pill-style Tabs */}
      <div className="p-4 pb-0">
        <div className="flex w-full bg-background rounded-lg p-1 gap-1">
          <button 
            className={`flex-1 py-2.5 rounded-md text-center font-medium text-sm transition-all duration-200 ${activeTab === 'deposit' ? 'bg-background-surface-raised text-foreground shadow-sm' : 'text-foreground-tertiary hover:text-foreground-secondary'}`}
            onClick={() => setActiveTab('deposit')}
            disabled={txState !== 'idle'}
          >
            Deposit
          </button>
          <button 
            className={`flex-1 py-2.5 rounded-md text-center font-medium text-sm transition-all duration-200 ${activeTab === 'withdraw' ? 'bg-background-surface-raised text-foreground shadow-sm' : 'text-foreground-tertiary hover:text-foreground-secondary'}`}
            onClick={() => setActiveTab('withdraw')}
            disabled={txState !== 'idle'}
          >
            Withdraw
          </button>
        </div>
      </div>

      <div className="p-6 flex flex-col gap-6 flex-grow">
        {/* Input Area */}
        <div>
          <div className="flex justify-between items-end mb-2">
            <label className="body-sm text-foreground-secondary font-medium">
              {isDeposit ? 'Amount' : 'Shares'}
            </label>
            <div className="body-sm text-foreground-tertiary text-right">
              Balance: {isDeposit ? `${formatSbtc(sbtcBalance)} sBTC` : `${formatShares(position?.shares || 0n)} shares`}
            </div>
          </div>
          
          <div className={`relative flex items-center bg-background-surface-input border rounded-lg h-16 px-4 focus-within:ring-1 transition-all ${hasInsufficientBalance ? 'border-destructive focus-within:ring-destructive/30' : 'border-border focus-within:border-primary focus-within:ring-primary/30'}`}>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={txState !== 'idle'}
              className="w-full bg-transparent border-none outline-none numeric-md text-foreground placeholder:text-foreground-disabled disabled:opacity-50 h-full"
              step="any"
              min="0"
            />
            <div className="flex items-center gap-3 ml-4 shrink-0">
              <span className="font-sans font-medium text-foreground-secondary">
                {isDeposit ? 'sBTC' : 'Shares'}
              </span>
              <button 
                onClick={handleMaxClick}
                disabled={txState !== 'idle'}
                className="px-2 py-1 text-xs font-semibold rounded bg-background-surface border border-border text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                MAX
              </button>
            </div>
          </div>
          {hasInsufficientBalance && (
            <p className="text-destructive body-sm mt-2">Exceeds available balance</p>
          )}
        </div>

        {/* Preview Area */}
        <div className="bg-background rounded-lg border border-border-subtle p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="body-sm text-foreground-secondary">You will receive</span>
            {rawAmount > 0n && isPreviewLoading ? (
              <div className="w-20 h-5 rounded bg-background-surface-raised animate-shimmer" />
            ) : (
              <span className="numeric-sm text-foreground font-medium">
                {rawAmount > 0n 
                  ? (isDeposit ? `${formatShares(previewValue || 0n)} shares` : `${formatSbtc(previewValue || 0n)} sBTC`)
                  : '0'}
              </span>
            )}
          </div>
          
          <div className="flex justify-between items-center border-t border-border-subtle pt-3">
            <span className="body-sm text-foreground-secondary">Share price</span>
            <span className="numeric-sm text-foreground-secondary">
              {stats?.sharePrice.toFixed(8)} sBTC per share
            </span>
          </div>
        </div>

        {/* Action Button Area */}
        <div className="mt-auto pt-4">
          {txState === 'idle' ? (
            <Button 
              className="w-full h-14 text-[16px] font-medium transition-transform active:scale-[0.98]"
              disabled={!isInputValid}
              onClick={handleSubmit}
            >
              {isDeposit ? 'Deposit sBTC' : 'Withdraw sBTC'}
            </Button>
          ) : (
            <div className="flex flex-col gap-3">
              <Button disabled className="w-full h-14 text-[16px] font-medium opacity-100 bg-background-surface-raised border border-border">
                <Loader2 className="w-5 h-5 mr-3 animate-spin text-primary" />
                {txState === 'confirming' ? 'Confirm in Wallet...' : 'Broadcasting...'}
              </Button>
              
              <div className="text-center">
                {txState === 'confirming' ? (
                  <p className="body-sm text-foreground-tertiary">Approve the transaction in your wallet extension.</p>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <p className="body-sm text-foreground-tertiary">Transaction submitted. Waiting for confirmation.</p>
                    {activeTxId && (
                      <a 
                        href={getExplorerUrl(activeTxId)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-primary hover:text-primary-hover font-mono text-xs transition-colors"
                      >
                        {activeTxId.substring(0, 6)}...{activeTxId.substring(activeTxId.length - 4)}
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
