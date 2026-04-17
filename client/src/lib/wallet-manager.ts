// Centralized wallet management for the platform
// This ensures all components use the same wallet addresses

type WalletAddresses = {
  tron: string;
  bsc: string;
  ton: string;
  piNetwork: string;
};

class WalletManager {
  private walletAddresses: WalletAddresses = {
    tron: '',
    bsc: '',
    ton: '',
    piNetwork: '',
  };

  private listeners: Array<(addresses: WalletAddresses) => void> = [];

  // Get current wallet addresses
  getWalletAddresses(): WalletAddresses {
    return { ...this.walletAddresses };
  }

  // Get address for specific network
  getWalletAddress(network: keyof WalletAddresses): string {
    return this.walletAddresses[network];
  }

  // Update wallet address for specific network
  updateWalletAddress(network: keyof WalletAddresses, address: string): void {
    this.walletAddresses[network] = address;
    this.notifyListeners();
    
    // Store in localStorage for persistence
    localStorage.setItem('taskdrip_wallet_addresses', JSON.stringify(this.walletAddresses));
  }

  // Subscribe to wallet address changes
  subscribe(callback: (addresses: WalletAddresses) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners of changes
  private notifyListeners(): void {
    this.listeners.forEach(callback => callback({ ...this.walletAddresses }));
  }

  // Initialize from localStorage
  initialize(): void {
    try {
      const stored = localStorage.getItem('taskdrip_wallet_addresses');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.walletAddresses = { ...this.walletAddresses, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load wallet addresses from localStorage:', error);
    }
  }

  // Copy wallet address to clipboard
  async copyToClipboard(network: keyof WalletAddresses): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(this.walletAddresses[network]);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }

  // Get formatted network display name
  getNetworkDisplayName(network: keyof WalletAddresses): string {
    const networkNames = {
      tron: 'USDT (Tron Network) - TRC-20',
      bsc: 'USDT (BSC Network) - BEP-20',
      ton: 'USDT (TON Network)',
      piNetwork: 'Pi Network',
    };
    return networkNames[network];
  }
}

// Create singleton instance
export const walletManager = new WalletManager();

// Initialize on import
if (typeof window !== 'undefined') {
  walletManager.initialize();
}