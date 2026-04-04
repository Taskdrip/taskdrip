import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWallets } from "@/hooks/useWallets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Copy, Clock, Wallet, CheckCircle, AlertTriangle, Upload, MessageCircle, Phone, Mail } from "lucide-react";
import { format } from "date-fns";

interface EscrowPayment {
  id: string;
  campaignId: string;
  amount: string;
  status: "pending" | "payment_window" | "verifying" | "completed" | "expired";
  paymentWindow: {
    startTime: string;
    endTime: string;
    remainingMinutes: number;
  };
  walletAddresses: {
    usdtTron: string;
    usdtBsc: string;
    ton: string;
  };
  createdAt: string;
}

interface PaymentProof {
  transactionHash: string;
  network: "tron" | "bsc" | "ton";
  paymentScreenshot?: File;
}

export default function EscrowPayment() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { walletAddresses, copyToClipboard } = useWallets();
  
  // Extract campaign ID from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get("campaignId");
  
  const [selectedNetwork, setSelectedNetwork] = useState<"tron" | "bsc" | "ton">("tron");
  const [paymentProof, setPaymentProof] = useState<PaymentProof>({
    transactionHash: "",
    network: "tron"
  });
  const [countdown, setCountdown] = useState<number>(0);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Fetch escrow payment details
  const { data: escrowPayment, isLoading, refetch } = useQuery<EscrowPayment>({
    queryKey: ["/api/escrow-payment", campaignId],
    enabled: !!campaignId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Submit payment proof mutation
  const submitProofMutation = useMutation({
    mutationFn: async (proof: PaymentProof) => {
      const formData = new FormData();
      formData.append("transactionHash", proof.transactionHash);
      formData.append("network", proof.network);
      formData.append("campaignId", campaignId!);
      
      if (proof.paymentScreenshot) {
        formData.append("paymentScreenshot", proof.paymentScreenshot);
      }

      const res = await fetch("/api/escrow-payment/submit-proof", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        throw new Error(await res.text());
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment proof submitted!",
        description: "Your payment is being verified. You'll be notified once approved.",
      });
      setPaymentDialogOpen(false);
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Countdown timer effect
  useEffect(() => {
    if (escrowPayment?.paymentWindow?.remainingMinutes) {
      const totalSeconds = escrowPayment.paymentWindow.remainingMinutes * 60;
      setCountdown(totalSeconds);

      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            refetch(); // Check if payment window expired
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [escrowPayment, refetch]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };



  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!escrowPayment) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Payment Not Found</h1>
          <p className="text-gray-600 mb-6">The payment session could not be found or may have expired.</p>
          <Button onClick={() => setLocation("/brand-dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Use centralized wallet addresses instead of escrow payment specific ones

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            onClick={() => setLocation("/brand-dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Campaign Escrow Payment</h1>
            <p className="text-gray-600">Secure your campaign with crypto payment</p>
          </div>
        </div>

        {/* Payment Status */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Payment Status
              </CardTitle>
              <Badge variant={
                escrowPayment.status === "completed" ? "default" :
                escrowPayment.status === "expired" ? "destructive" :
                escrowPayment.status === "verifying" ? "secondary" : 
                "outline"
              }>
                {escrowPayment.status === "payment_window" ? "Payment Window Active" : 
                 escrowPayment.status === "completed" ? "Payment Completed" :
                 escrowPayment.status === "expired" ? "Payment Window Expired" :
                 escrowPayment.status === "verifying" ? "Verifying Payment" : 
                 "Pending Payment"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-medium text-gray-600">Payment Amount</Label>
                <p className="text-2xl font-bold text-green-600">${escrowPayment.amount}</p>
              </div>
              {escrowPayment.status === "payment_window" && countdown > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Time Remaining</Label>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <p className="text-2xl font-bold text-orange-600">{formatTime(countdown)}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Instructions */}
        {escrowPayment.status === "payment_window" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Payment Instructions</CardTitle>
              <CardDescription>
                Choose your preferred crypto network and send the exact amount to our escrow wallet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Network Selection */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Select Payment Network</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setSelectedNetwork("tron")}
                      className={`p-4 border rounded-lg text-center transition-colors ${
                        selectedNetwork === "tron" ? "border-blue-500 bg-blue-50" : "border-gray-200"
                      }`}
                    >
                      <div className="font-semibold">USDT (Tron)</div>
                      <div className="text-sm text-gray-600">TRC-20</div>
                    </button>
                    <button
                      onClick={() => setSelectedNetwork("bsc")}
                      className={`p-4 border rounded-lg text-center transition-colors ${
                        selectedNetwork === "bsc" ? "border-blue-500 bg-blue-50" : "border-gray-200"
                      }`}
                    >
                      <div className="font-semibold">USDT (BSC)</div>
                      <div className="text-sm text-gray-600">BEP-20</div>
                    </button>
                    <button
                      onClick={() => setSelectedNetwork("ton")}
                      className={`p-4 border rounded-lg text-center transition-colors ${
                        selectedNetwork === "ton" ? "border-blue-500 bg-blue-50" : "border-gray-200"
                      }`}
                    >
                      <div className="font-semibold">USDT (TON)</div>
                      <div className="text-sm text-gray-600">TON Network</div>
                    </button>
                  </div>
                </div>

                {/* Wallet Address */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <Label className="text-sm font-medium mb-2 block">
                    {selectedNetwork === "tron" ? "USDT (Tron) Wallet Address" :
                     selectedNetwork === "bsc" ? "USDT (BSC) Wallet Address" :
                     "USDT (TON) Wallet Address"}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={
                        selectedNetwork === "tron" ? walletAddresses.tron :
                        selectedNetwork === "bsc" ? walletAddresses.bsc :
                        walletAddresses.ton
                      }
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const address = selectedNetwork === "tron" ? walletAddresses.tron :
                                      selectedNetwork === "bsc" ? walletAddresses.bsc :
                                      walletAddresses.ton;
                        const success = await copyToClipboard(selectedNetwork);
                        if (success) {
                          toast({
                            title: "Copied!",
                            description: "Wallet address copied to clipboard",
                          });
                        }
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Submit Payment Proof */}
                <div className="pt-4 border-t">
                  <Button 
                    onClick={() => setPaymentDialogOpen(true)}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Submit Payment Proof
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Proof Submitted - Beautiful Thank You Page */}
        {(escrowPayment.status === "verifying" || escrowPayment.status === "submitted" || (escrowPayment as any).escrowStatus === "submitted") && (
          <div className="space-y-6">
            {/* Hero thank you card */}
            <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 via-white to-blue-50 overflow-hidden">
              <CardContent className="p-8 text-center">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-green-200 rounded-full blur-xl opacity-40 animate-pulse"></div>
                  <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 rounded-full p-5 inline-flex">
                    <CheckCircle className="h-14 w-14 text-white" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">Proof Submitted!</h2>
                <p className="text-lg text-gray-600 max-w-md mx-auto mb-2">
                  Your payment proof is under review by our team.
                </p>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                  We typically verify payments within <strong>2–6 hours</strong>. Your campaign will be activated as soon as verification is complete.
                </p>
              </CardContent>
            </Card>

            {/* What happens next */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What happens next?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { step: '1', title: 'Payment Verification', desc: 'Our admin team reviews your transaction hash and screenshot.', done: true },
                    { step: '2', title: 'Campaign Activation', desc: 'Once verified, your campaign goes live and influencers can start joining.', done: false },
                    { step: '3', title: 'Email Notification', desc: "You'll receive an email confirmation once your campaign is active.", done: false },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${item.done ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {item.done ? '✓' : item.step}
                      </div>
                      <div>
                        <p className={`font-semibold ${item.done ? 'text-green-700' : 'text-gray-700'}`}>{item.title}</p>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Contact admin card */}
            <Card className="border-blue-100 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-900 text-lg">Need help? Contact us</CardTitle>
                <CardDescription className="text-blue-700">Our team is available to assist with your payment verification</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <a
                    href="https://wa.me/2348036622568"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-3 transition-colors font-medium"
                  >
                    <Phone className="h-5 w-5 flex-shrink-0" />
                    <div>
                      <div className="text-xs opacity-80">WhatsApp</div>
                      <div>+234 803 662 2568</div>
                    </div>
                  </a>
                  <a
                    href="/messages"
                    className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-3 transition-colors font-medium"
                  >
                    <MessageCircle className="h-5 w-5 flex-shrink-0" />
                    <div>
                      <div className="text-xs opacity-80">In-App Chat</div>
                      <div>Message Admin</div>
                    </div>
                  </a>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setLocation("/brand-dashboard")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
              </Button>
            </div>
          </div>
        )}

        {/* Payment Expired */}
        {escrowPayment.status === "expired" && (
          <Card className="border-red-200">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-700 mb-2">Payment Window Expired</h3>
              <p className="text-gray-600 mb-4">
                The 30-minute payment window has expired. Please create a new campaign to restart the payment process.
              </p>
              <Button onClick={() => setLocation("/brand-dashboard")}>
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Payment Completed */}
        {escrowPayment.status === "completed" && (
          <Card className="border-green-200">
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-700 mb-2">Payment Completed!</h3>
              <p className="text-gray-600 mb-4">
                Your payment has been verified and your campaign is now active.
              </p>
              <Button onClick={() => setLocation("/brand-dashboard")}>
                View Campaign
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Payment Proof Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Submit Payment Proof</DialogTitle>
              <DialogDescription>
                Provide your transaction hash and optional screenshot for verification
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Transaction Hash</Label>
                <Input
                  value={paymentProof.transactionHash}
                  onChange={(e) => setPaymentProof(prev => ({ ...prev, transactionHash: e.target.value }))}
                  placeholder="Enter transaction hash"
                />
              </div>
              <div>
                <Label>Network</Label>
                <select
                  value={paymentProof.network}
                  onChange={(e) => setPaymentProof(prev => ({ ...prev, network: e.target.value as any }))}
                  className="w-full p-2 border rounded"
                >
                  <option value="tron">USDT (Tron)</option>
                  <option value="bsc">USDT (BSC)</option>
                  <option value="ton">USDT (TON)</option>
                </select>
              </div>
              <div>
                <Label>Payment Screenshot (Optional)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPaymentProof(prev => ({ ...prev, paymentScreenshot: file }));
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => submitProofMutation.mutate(paymentProof)}
                  disabled={!paymentProof.transactionHash || submitProofMutation.isPending}
                  className="flex-1"
                >
                  {submitProofMutation.isPending ? "Submitting..." : "Submit Proof"}
                </Button>
                <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}