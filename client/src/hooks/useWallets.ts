import { useState, useEffect } from 'react';
import { walletManager } from '@/lib/wallet-manager';

type WalletAddresses = {
  tron: string;
  bsc: string;
  ton: string;
};

export function useWallets() {
  const [walletAddresses, setWalletAddresses] = useState<WalletAddresses>(
    walletManager.getWalletAddresses()
  );

  useEffect(() => {
    // Subscribe to wallet address changes
    const unsubscribe = walletManager.subscribe(setWalletAddresses);
    
    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  const updateWalletAddress = (network: keyof WalletAddresses, address: string) => {
    walletManager.updateWalletAddress(network, address);
  };

  const getWalletAddress = (network: keyof WalletAddresses): string => {
    return walletManager.getWalletAddress(network);
  };

  const copyToClipboard = async (network: keyof WalletAddresses): Promise<boolean> => {
    return walletManager.copyToClipboard(network);
  };

  const getNetworkDisplayName = (network: keyof WalletAddresses): string => {
    return walletManager.getNetworkDisplayName(network);
  };

  return {
    walletAddresses,
    updateWalletAddress,
    getWalletAddress,
    copyToClipboard,
    getNetworkDisplayName
  };
}