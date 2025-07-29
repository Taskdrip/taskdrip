import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Clock, Wallet, Copy, CheckCircle, Upload, ArrowLeft } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AdminWallet {
  id: string;
  walletName: string;
  walletAddress: string;
  network: string;
  currency: string;
  qrCodePath?: string;
}

interface PaymentTimer {
  minutes: number;
  seconds: number;
  expired: boolean;
}

export default function PaymentDeposit() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedNetwork, setSelectedNetwork] = useState<string>("");
  const [selectedWallet, setSelectedWallet] = useState<AdminWallet | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [transactionHash, setTransactionHash] = useState("");
  const [notes, setNotes] = useState("");
  const [timer, setTimer] = useState<PaymentTimer>({ minutes: 30, seconds: 0, expired: false });

  // Get campaign info from URL parameters
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const campaignId = searchParams.get('campaignId');
  const amount = searchParams.get('amount');
  const campaignTitle = searchParams.get('title');

  // Fetch available admin wallets for escrow
  const { data: adminWallets = [], isLoading: walletsLoading } = useQuery<AdminWallet[]>({
    queryKey: ["/api/admin/wallets/escrow"],
    retry: false,
  });

  // Timer countdown effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev.minutes === 0 && prev.seconds === 0) {
          return { ...prev, expired: true };
        }
        
        if (prev.seconds === 0) {
          return { minutes: prev.minutes - 1, seconds: 59, expired: false };
        }
        
        return { ...prev, seconds: prev.seconds - 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Submit payment proof mutation
  const submitProofMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch('/api/payment-deposits', {
        method: 'POST',
        body: data
      });
      if (!res.ok) throw new Error('Failed to submit payment proof');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment Proof Submitted",
        description: "Your payment proof has been submitted for admin review. You'll be notified once approved.",
      });
      setLocation('/brand-dashboard');
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmitProof = () => {
    if (!selectedWallet || !proofFile || !transactionHash) {
      toast({
        title: "Missing Information",
        description: "Please select a wallet, upload proof, and enter transaction hash.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('campaignId', campaignId || '');
    formData.append('amount', amount || '');
    formData.append('network', selectedWallet.network);
    formData.append('walletAddress', selectedWallet.walletAddress);
    formData.append('transactionHash', transactionHash);
    formData.append('notes', notes);
    formData.append('paymentProof', proofFile);

    submitProofMutation.mutate(formData);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Wallet address copied to clipboard",
    });
  };

  if (!campaignId || !amount) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600">Invalid payment request</p>
            <Button onClick={() => setLocation('/brand-dashboard')} className="mt-4">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={() => setLocation('/brand-dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Campaign Payment Deposit</h1>
            <p className="text-gray-600 mt-1">Complete your payment to activate the campaign</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Campaign Details */}
            <Card>
              <CardHeader>
                <CardTitle>Campaign Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="font-medium">Campaign:</span>
                    <span>{campaignTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Total Budget:</span>
                    <span className="text-lg font-bold text-green-600">${amount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Network Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Payment Network</CardTitle>
                <CardDescription>Choose your preferred cryptocurrency network</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tron">USDT (Tron Network)</SelectItem>
                    <SelectItem value="bsc">USDT (BSC Network)</SelectItem>
                    <SelectItem value="ton">TON Network</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Wallet Selection */}
            {selectedNetwork && (
              <Card>
                <CardHeader>
                  <CardTitle>Select Payment Wallet</CardTitle>
                  <CardDescription>Choose the admin wallet for your payment</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {adminWallets
                      .filter(wallet => wallet.network === selectedNetwork)
                      .map((wallet) => (
                        <div
                          key={wallet.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedWallet?.id === wallet.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedWallet(wallet)}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-medium">{wallet.walletName}</h4>
                              <p className="text-sm text-gray-600">{wallet.currency} - {wallet.network}</p>
                            </div>
                            <Badge variant={selectedWallet?.id === wallet.id ? "default" : "secondary"}>
                              {selectedWallet?.id === wallet.id ? "Selected" : "Select"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Wallet Address Display */}
            {selectedWallet && (
              <Card>
                <CardHeader>
                  <CardTitle>Payment Address</CardTitle>
                  <CardDescription>Send your payment to this wallet address</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
                      <Wallet className="h-5 w-5 text-gray-600" />
                      <code className="flex-1 text-sm">{selectedWallet.walletAddress}</code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(selectedWallet.walletAddress)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {selectedWallet.qrCodePath && (
                      <div className="text-center">
                        <img
                          src={selectedWallet.qrCodePath}
                          alt="QR Code"
                          className="mx-auto w-48 h-48 border rounded-lg"
                        />
                        <p className="text-sm text-gray-600 mt-2">Scan QR code to pay</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Proof Upload */}
            {selectedWallet && (
              <Card>
                <CardHeader>
                  <CardTitle>Submit Payment Proof</CardTitle>
                  <CardDescription>Upload proof of your payment transaction</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="transactionHash">Transaction Hash</Label>
                    <Input
                      id="transactionHash"
                      placeholder="Enter transaction hash/ID"
                      value={transactionHash}
                      onChange={(e) => setTransactionHash(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="proofFile">Payment Screenshot</Label>
                    <Input
                      id="proofFile"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Additional Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any additional information about the payment"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  <Button
                    onClick={handleSubmitProof}
                    disabled={submitProofMutation.isPending || timer.expired}
                    className="w-full"
                  >
                    {submitProofMutation.isPending ? (
                      "Submitting..."
                    ) : timer.expired ? (
                      "Payment Window Expired"
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Submit Payment Proof
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Timer Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Payment Timer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className={`text-4xl font-bold mb-2 ${
                    timer.expired ? 'text-red-600' : timer.minutes < 5 ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {timer.expired ? "EXPIRED" : `${timer.minutes.toString().padStart(2, '0')}:${timer.seconds.toString().padStart(2, '0')}`}
                  </div>
                  <p className="text-sm text-gray-600">
                    {timer.expired ? "Payment window has expired" : "Time remaining to complete payment"}
                  </p>
                  
                  {timer.expired && (
                    <Button 
                      variant="outline" 
                      onClick={() => setLocation('/brand-dashboard')}
                      className="mt-4 w-full"
                    >
                      Return to Dashboard
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Instructions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">1</div>
                  <p>Select your preferred payment network</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">2</div>
                  <p>Choose an admin wallet address</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">3</div>
                  <p>Send the exact amount to the wallet</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">4</div>
                  <p>Upload proof and transaction hash</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">5</div>
                  <p>Wait for admin approval</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}