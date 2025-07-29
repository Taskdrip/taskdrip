import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { Navigation } from '@/components/ui/navigation';
import { Wallet, Copy, Check, AlertCircle } from 'lucide-react';

const walletSchema = z.object({
  usdtTronWallet: z.string().optional(),
  usdtBscWallet: z.string().optional(),
  tonWallet: z.string().optional(),
});

type WalletFormData = z.infer<typeof walletSchema>;

export default function WalletSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);

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
      setValue('usdtTronWallet', user.usdtTronWallet || '');
      setValue('usdtBscWallet', user.usdtBscWallet || '');
      setValue('tonWallet', user.tonWallet || '');
    }
  }, [user, setValue]);

  const updateWalletMutation = useMutation({
    mutationFn: async (data: WalletFormData) => {
      const response = await apiRequest('PATCH', `/api/users/${user?.id}/profile`, data);
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
      name: 'USDT (Tron Network)',
      key: 'usdtTronWallet' as keyof WalletFormData,
      description: 'TRC-20 USDT on Tron blockchain',
      placeholder: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t...',
      color: 'from-red-500 to-red-600',
    },
    {
      name: 'USDT (BSC Network)', 
      key: 'usdtBscWallet' as keyof WalletFormData,
      description: 'BEP-20 USDT on Binance Smart Chain',
      placeholder: '0x742C4B8d7bBb3B4C6c8c89f5D3e1f4E...',
      color: 'from-yellow-500 to-yellow-600',
    },
    {
      name: 'TON Wallet',
      key: 'tonWallet' as keyof WalletFormData,  
      description: 'The Open Network native wallet',
      placeholder: 'EQD5p2L6r4g8J9B3K1r5n6m7c8...',
      color: 'from-blue-500 to-blue-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
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
              <Button 
                variant="secondary" 
                className="mt-4 bg-white text-green-600 hover:bg-green-50"
              >
                Request Payout
              </Button>
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

        {/* Payment Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-gray-900">Supported Networks</h4>
                <ul className="text-gray-600 mt-1 space-y-1">
                  <li>• USDT on Tron (TRC-20)</li>
                  <li>• USDT on BSC (BEP-20)</li>
                  <li>• TON Network</li>
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