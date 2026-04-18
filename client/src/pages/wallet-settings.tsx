import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
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
import { Wallet, Copy, Check, AlertCircle, Coins, ArrowUpRight, ShieldCheck, ShoppingBag, Rocket, Gift, Send } from 'lucide-react';

const walletSchema = z.object({
  usdtTronWallet: z.string().optional(),
  usdtBscWallet: z.string().optional(),
  usdtEthWallet: z.string().optional(),
  tonWallet: z.string().optional(),
  piWallet: z.string().optional(),
});

type WalletFormData = z.infer<typeof walletSchema>;

export default function WalletSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [directSupportEnabled, setDirectSupportEnabled] = useState(false);
  const { data: pointsData } = useQuery<{ total: number; recent: any[] }>({
    queryKey: ['/api/points/me'],
    retry: false,
  });
  const tdripPoints = Number(pointsData?.total ?? (user as any)?.totalPoints ?? 0);
  const tdripUsdValue = tdripPoints / 100;

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
      setValue('piWallet', (user as any).piWallet || '');
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
    {
      name: 'Pi Network',
      key: 'piWallet' as keyof WalletFormData,
      description: 'Pi Network username or wallet address',
      placeholder: '@yourPiUsername or Pi wallet address...',
      color: 'from-purple-500 to-purple-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-[2rem] bg-slate-950 text-white overflow-hidden mb-8 shadow-2xl shadow-violet-100">
          <div className="p-6 md:p-8 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.55),transparent_35%),linear-gradient(135deg,#020617,#111827_50%,#312e81)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-100 mb-4">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Two-wallet Taskdrip account
                </div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tight">Wallet Center</h1>
                <p className="text-white/65 mt-3 max-w-2xl">
                  Keep cash earnings separate from $TDRIP activity points. Funds are for real payments and withdrawals; $TDRIP powers airdrop eligibility and micro add-on task rewards.
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 border border-white/15 p-4 min-w-[220px]">
                <p className="text-xs text-white/50">Combined value snapshot</p>
                <p className="text-3xl font-black" data-testid="text-wallet-combined-value">
                  ${(parseFloat(user?.availableBalance || '0') + tdripUsdValue).toFixed(2)}
                </p>
                <p className="text-xs text-white/50 mt-1">Funds + $TDRIP point value</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card className="overflow-hidden border-0 shadow-xl">
            <CardContent className="p-0">
              <div className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-emerald-50">Funds Wallet</p>
                    <p className="text-4xl font-black mt-2" data-testid="text-funds-wallet-balance">${parseFloat(user?.availableBalance || '0').toFixed(2)}</p>
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Wallet className="h-7 w-7" />
                  </div>
                </div>
                <p className="text-emerald-50 text-sm mt-4">Stores campaign earnings, brand payments, giveaway wins, and spendable marketplace balance.</p>
              </div>
              <div className="p-5 grid grid-cols-2 gap-3">
                <Link href="/campaigns">
                  <Button variant="outline" className="w-full justify-start" data-testid="button-wallet-launch-campaign">
                    <Rocket className="h-4 w-4 mr-2" /> Launch campaigns
                  </Button>
                </Link>
                <Link href="/shop">
                  <Button variant="outline" className="w-full justify-start" data-testid="button-wallet-buy-products">
                    <ShoppingBag className="h-4 w-4 mr-2" /> Buy products
                  </Button>
                </Link>
                <Link href="/payout-requests">
                  <Button className="w-full justify-start bg-emerald-600 hover:bg-emerald-700" data-testid="button-wallet-request-payout">
                    <ArrowUpRight className="h-4 w-4 mr-2" /> Request withdrawal
                  </Button>
                </Link>
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-800">
                  Minimum withdrawal: $10
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-0 shadow-xl">
            <CardContent className="p-0">
              <div className="p-6 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-indigo-700 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-violet-100">$TDRIP Points Wallet</p>
                    <p className="text-4xl font-black mt-2" data-testid="text-tdrip-points">{tdripPoints.toLocaleString()} $TDRIP</p>
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Coins className="h-7 w-7" />
                  </div>
                </div>
                <p className="text-violet-100 text-sm mt-4">Earned from platform activity, used for future airdrop eligibility and micro add-on campaign rewards.</p>
              </div>
              <div className="p-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-violet-50 border border-violet-100 p-3">
                  <p className="text-xs text-violet-500">Point value</p>
                  <p className="text-2xl font-black text-violet-900" data-testid="text-tdrip-usdt-value">${tdripUsdValue.toFixed(2)}</p>
                  <p className="text-xs text-violet-500">100 $TDRIP = $1</p>
                </div>
                <div className="rounded-xl bg-fuchsia-50 border border-fuchsia-100 p-3">
                  <p className="text-xs text-fuchsia-500">Airdrop status</p>
                  <p className="text-lg font-black text-fuchsia-900" data-testid="text-tdrip-launch-note">Active user pool</p>
                  <p className="text-xs text-fuchsia-500">Token launch ready</p>
                </div>
                <Link href="/shop">
                  <Button className="w-full justify-start bg-violet-600 hover:bg-violet-700" data-testid="button-buy-tdrip">
                    <Coins className="h-4 w-4 mr-2" /> Buy $TDRIP
                  </Button>
                </Link>
                <Link href="/tasks">
                  <Button variant="outline" className="w-full justify-start" data-testid="button-wallet-use-micro-tasks">
                    <Send className="h-4 w-4 mr-2" /> Run micro tasks
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-800">Security Notice</h3>
                  <p className="text-yellow-700 text-sm mt-1">
                    Only add wallet addresses you control. Double-check every address before saving.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Gift className="h-5 w-5 text-emerald-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-emerald-900">Direct Wallet Support</h3>
                    <p className="text-emerald-700 text-sm mt-1">Allow users to support you directly through your saved crypto wallets.</p>
                  </div>
                </div>
                <Switch checked={directSupportEnabled} onCheckedChange={setDirectSupportEnabled} data-testid="switch-wallet-direct-support" />
              </div>
              <p className="text-xs text-emerald-700 mt-3">Current status: {directSupportEnabled ? 'On' : 'Off'}</p>
            </CardContent>
          </Card>
        </div>

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
                {(user?.usdtTronWallet || user?.usdtBscWallet || user?.tonWallet || (user as any)?.piWallet) ? (
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