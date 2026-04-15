import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { NavigationFixed } from '@/components/ui/navigation-fixed';
import { Wallet, Copy, Check, AlertCircle } from 'lucide-react';

const walletSchema = z.object({
  usdtTronWallet: z.string().optional(),
  usdtBscWallet: z.string().optional(),
  usdtEthWallet: z.string().optional(),
  tonWallet: z.string().optional(),
});

type WalletFormData = z.infer<typeof walletSchema>;

export default function WalletSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [directSupportEnabled, setDirectSupportEnabled] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<WalletFormData>({
    resolver: zodResolver(walletSchema),
  });

  // Set initial values from user data
  useEffect(() => {
    if (user) {
      setValue('usdtTronWallet', (user as any).usdtTronWallet || '');
      setValue('usdtBscWallet', (user as any).usdtBscWallet || '');
      setValue('usdtEthWallet', (user as any).usdtEthWallet || '');
      setValue('tonWallet', (user as any).tonWallet || '');
      setDirectSupportEnabled(!!(user as any).directSupportEnabled);
    }
  }, [user, setValue]);

  const updateWalletMutation = useMutation({
    mutationFn: async (data: WalletFormData) => {
      const response = await apiRequest('PATCH', `/api/users/${user?.id}/profile`, { ...data, directSupportEnabled });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Wallet addresses updated",
        description: "Your crypto wallet addresses have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update wallet addresses",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: WalletFormData) => {
    updateWalletMutation.mutate(data);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({
      title: "Copied to clipboard",
      description: "Wallet address copied successfully",
    });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const walletNetworks = [
    {
      name: 'USDT TRC-20',
      key: 'usdtTronWallet' as keyof WalletFormData,
      description: 'USDT on Tron Network (TRC-20)',
      placeholder: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t...',
      color: 'from-red-500 to-red-600',
    },
    {
      name: 'USDT BEP-20',
      key: 'usdtBscWallet' as keyof WalletFormData,
      description: 'USDT on BNB Chain (BEP-20)',
      placeholder: '0x742C4B8d7bBb3B4C6c8c89f5D3e1f4E...',
      color: 'from-yellow-500 to-yellow-600',
    },
    {
      name: 'USDT ERC-20',
      key: 'usdtEthWallet' as keyof WalletFormData,
      description: 'USDT on Ethereum Network (ERC-20)',
      placeholder: '0x4e83362442B8d1beC281594c....',
      color: 'from-indigo-500 to-indigo-600',
    },
    {
      name: 'USDT - TON',
      key: 'tonWallet' as keyof WalletFormData,  
      description: 'USDT on TON Network',
      placeholder: 'EQD5p2L6r4g8J9B3K1r5n6m7c8...',
      color: 'from-blue-500 to-blue-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Wallet className="h-8 w-8 mr-3" />
            Crypto Wallet Settings
          </h1>
          <p className="text-gray-600 mt-2">
            Add your crypto wallet addresses to receive payments for completed tasks
          </p>
        </div>

        {/* Current Balance Card */}
        <Card className="mb-8 bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wallet className="h-5 w-5 mr-2" />
              Available Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${parseFloat(user?.availableBalance || '0').toFixed(2)}
            </div>
            <p className="text-green-100 mt-1">
              Ready for withdrawal • Minimum: $10.00
            </p>
            {parseFloat(user?.availableBalance || '0') >= 10 && (
              <Link href="/payout-requests">
                <Button 
                  variant="secondary" 
                  className="mt-4 bg-white text-green-600 hover:bg-green-50"
                  data-testid="button-wallet-request-payout"
                >
                  Request Payout
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="mb-8 border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-800">Security Notice</h3>
                <p className="text-yellow-700 text-sm mt-1">
                  Only add wallet addresses you control. Payments are processed manually by admins. 
                  Double-check your addresses before saving - incorrect addresses may result in lost funds.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8 border-emerald-200 bg-emerald-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-emerald-900">Direct Wallet Support</h3>
                <p className="text-emerald-700 text-sm mt-1">Allow users to support you directly through your saved crypto wallets.</p>
              </div>
              <Switch checked={directSupportEnabled} onCheckedChange={setDirectSupportEnabled} data-testid="switch-wallet-direct-support" />
            </div>
            <p className="text-xs text-emerald-700 mt-3">Current status: {directSupportEnabled ? 'On' : 'Off'}</p>
          </CardContent>
        </Card>

        {/* Wallet Forms */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {walletNetworks.map((network) => (
            <Card key={network.key}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${network.color} mr-3`}></div>
                  {network.name}
                </CardTitle>
                <CardDescription>{network.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor={network.key}>Wallet Address</Label>
                    <div className="flex space-x-2">
                      <Input
                        id={network.key}
                        placeholder={network.placeholder}
                        {...register(network.key)}
                        className="flex-1"
                      />
                      {user?.[network.key] && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(user[network.key] || '', network.key)}
                        >
                          {copiedField === network.key ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                    {errors[network.key] && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors[network.key]?.message}
                      </p>
                    )}
                  </div>
                  
                  {user?.[network.key] && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-800">
                        ✓ Address saved: {user[network.key]?.slice(0, 10)}...{user[network.key]?.slice(-6)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardContent className="pt-6">
              <Button
                type="submit"
                className="w-full bg-black text-white hover:bg-gray-800"
                disabled={updateWalletMutation.isPending}
              >
                {updateWalletMutation.isPending ? 'Saving...' : 'Save Wallet Addresses'}
              </Button>
            </CardContent>
          </Card>
        </form>

        {/* Payment Management */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Payment Management</CardTitle>
            <CardDescription>Request payouts and view transaction history</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {parseFloat(user?.availableBalance || '0') >= 10 ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-green-900">Ready for Withdrawal</h3>
                    <p className="text-green-700 text-sm">You can request a payout to your crypto wallets</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-800">
                      ${parseFloat(user?.availableBalance || '0').toFixed(2)}
                    </div>
                    <p className="text-green-600 text-sm">Available</p>
                  </div>
                </div>
                {(user?.usdtTronWallet || user?.usdtBscWallet || user?.tonWallet) ? (
                  <Link href="/payout-requests">
                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white" data-testid="button-payment-request-payout">
                      Request Payout
                    </Button>
                  </Link>
                ) : (
                  <div className="text-center">
                    <p className="text-yellow-800 text-sm mb-2">Add at least one wallet address to request payouts</p>
                    <Button variant="outline" className="border-green-600 text-green-600">
                      Add Wallet Address
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <h3 className="font-semibold text-gray-900 mb-2">Minimum Payout Not Reached</h3>
                <p className="text-gray-600 text-sm mb-4">
                  You need at least $10.00 to request a payout. Keep completing tasks to reach the minimum!
                </p>
                <div className="bg-white rounded-lg p-3 border">
                  <div className="flex justify-between text-sm">
                    <span>Current Balance:</span>
                    <span className="font-medium">${parseFloat(user?.availableBalance || '0').toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Needed for payout:</span>
                    <span>${(10 - parseFloat(user?.availableBalance || '0')).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <Link href="/ledger">
                <Button variant="outline" className="w-full justify-start" data-testid="button-wallet-open-ledger">
                  View escrow ledger
                </Button>
              </Link>
              <Link href="/payout-requests">
                <Button variant="outline" className="w-full justify-start" data-testid="button-wallet-open-payouts">
                  Manage payout requests
                </Button>
              </Link>
              <div>
                <h4 className="font-semibold text-gray-900">Supported Networks</h4>
                <ul className="text-gray-600 mt-1 space-y-1">
                  <li>• USDT TRC-20 (Tron Network)</li>
                  <li>• USDT BEP-20 (BNB Chain)</li>
                  <li>• USDT ERC-20 (Ethereum Network)</li>
                  <li>• USDT - TON (TON Network)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Payment Schedule</h4>
                <ul className="text-gray-600 mt-1 space-y-1">
                  <li>• Minimum payout: $10.00</li>
                  <li>• Processing: 1-3 business days</li>
                  <li>• Manual verification required</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}