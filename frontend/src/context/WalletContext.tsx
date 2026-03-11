import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { getSbtcBalance } from '@/lib/contracts';

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

const appConfig = new AppConfig(['store_write']);
const userSession = new UserSession({ appConfig });

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [address, setAddress] = useState<string | null>(null);
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
    try {
      if (userSession.isUserSignedIn()) {
        const userData = userSession.loadUserData();
        const stxAddress = userData.profile?.stxAddress?.testnet;
        if (stxAddress) {
          setAddress(stxAddress);
        }
      }
    } catch {
      // Clear corrupted session data
      userSession.signUserOut();
      console.warn('Cleared invalid Stacks session data');
    }
  }, []);

  useEffect(() => {
    if (address) {
      refreshBalance();
      // Poll balance every 30 seconds
      const interval = setInterval(refreshBalance, 30000);
      return () => clearInterval(interval);
    }
  }, [address, refreshBalance]);

  const connect = useCallback(() => {
    setIsConnecting(true);
    showConnect({
      appDetails: {
        name: 'Basalt Protocol',
        icon: window.location.origin + '/basalt-icon.png',
      },
      onFinish: () => {
        const userData = userSession.loadUserData();
        const stxAddress = userData.profile?.stxAddress?.testnet;
        if (stxAddress) {
          setAddress(stxAddress);
        }
        setIsConnecting(false);
      },
      onCancel: () => {
        setIsConnecting(false);
      },
      userSession,
    });
  }, []);

  const disconnect = useCallback(() => {
    userSession.signUserOut();
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
