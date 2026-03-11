import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  connect as stacksConnect,
  disconnect as stacksDisconnect,
  isConnected as stacksIsConnected,
  getLocalStorage,
} from '@stacks/connect';
import { getSbtcBalance } from '@/lib/contracts';
import { NETWORK } from '@/config/contracts';

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  sbtcBalance: bigint;
  connect: () => void;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

function getStxAddress(): string | null {
  const data = getLocalStorage();
  if (!data?.addresses?.stx?.length) return null;
  return data.addresses.stx[0].address ?? null;
}

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [address, setAddress] = useState<string | null>(() => {
    // Restore from localStorage on mount
    return stacksIsConnected() ? getStxAddress() : null;
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [sbtcBalance, setSbtcBalance] = useState<bigint>(0n);

  const isConnected = !!address;

  const refreshBalance = useCallback(async () => {
    if (address) {
      const balance = await getSbtcBalance(address);
      setSbtcBalance(balance);
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      refreshBalance();
      const interval = setInterval(refreshBalance, 30000);
      return () => clearInterval(interval);
    }
  }, [address, refreshBalance]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const result = await stacksConnect({ network: NETWORK });
      // Find STX address from the returned addresses
      const stxEntry = result.addresses.find((a) => a.symbol === 'STX');
      if (stxEntry) {
        setAddress(stxEntry.address);
      }
    } catch {
      // User cancelled or wallet error
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    stacksDisconnect();
    setAddress(null);
    setSbtcBalance(0n);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected,
        isConnecting,
        sbtcBalance,
        connect,
        disconnect,
        refreshBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextType {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
