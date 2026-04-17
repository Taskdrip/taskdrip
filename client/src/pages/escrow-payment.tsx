import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWallets } from "@/hooks/useWallets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Copy, Clock, Wallet, CheckCircle, AlertTriangle, Upload, MessageCircle, Phone, Send, ReceiptText, ShieldCheck, Package } from "lucide-react";
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
  network: string;
  paymentScreenshot?: File;
}

interface PaymentNetwork {
  id: string;
  networkKey: string;
  name: string;
  shortName: string;
  network: string;
  walletAddress?: string;
  description?: string;
  isActive: boolean;
}

export default function EscrowPayment() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { walletAddresses, copyToClipboard } = useWallets();
  
  // Extract campaign ID from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get("campaignId");
  
  const [selectedNetwork, setSelectedNetwork] = useState<string>("");
  const [paymentProof, setPaymentProof] = useState<PaymentProof>({
    transactionHash: "",
    network: ""
  });
  const [countdown, setCountdown] = useState<number>(0);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [adminMsgOpen, setAdminMsgOpen] = useState(false);
  const [adminMsgText, setAdminMsgText] = useState("");

  const sendAdminMsgMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/messages/to-admin", {
        subject: "Payment Verification Request",
        content: adminMsgText || `I've submitted payment proof for campaign ID: ${campaignId}. Please verify my payment. Thank you.`,
      }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Message sent!", description: "Admin has been notified and will respond shortly." });
      setAdminMsgOpen(false);
      setAdminMsgText("");
    },
    onError: () => toast({ title: "Failed to send", description: "Please try WhatsApp instead.", variant: "destructive" }),
  });

  // Fetch campaign details for order summary
  const { data: campaignDetails } = useQuery<any>({
    queryKey: ["/api/campaigns", campaignId],
    enabled: !!campaignId,
  });

  // Fetch active payment methods for campaigns (feature-filtered)
  const { data: paymentMethodsRaw = [] } = useQuery<any[]>({
    queryKey: ["/api/payment-methods", "campaigns"],
    queryFn: () => fetch("/api/payment-methods?feature=campaigns", { credentials: "include" }).then(r => r.json()),
  });
  const activeNetworks = paymentMethodsRaw.filter((m: any) => m.type === "crypto" && m.isActive !== false);

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
                {/* Network Selection — dynamic from admin-controlled active networks */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Select Payment Network</Label>
                  {activeNetworks.length === 0 ? (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
                      No crypto payment methods are currently active. Please contact support.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {activeNetworks.map((method: any) => {
                        const networkKey = (method.network || "").toLowerCase();
                        const emojiMap: Record<string, string> = { tron: '🔴', 'trc-20': '🔴', ton: '💎', bsc: '🟡', 'bep-20': '🟡', eth: '🔷', 'erc-20': '🔷', pi: '🟣', btc: '🟠' };
                        const emoji = emojiMap[networkKey] || '🪙';
                        const isSelected = selectedNetwork === method.id || (!selectedNetwork && activeNetworks[0]?.id === method.id);
                        return (
                          <button
                            key={method.id}
                            onClick={() => setSelectedNetwork(method.id)}
                            data-testid={`network-btn-${method.id}`}
                            className={`p-4 border-2 rounded-xl text-center transition-all ${
                              isSelected
                                ? "border-blue-500 bg-blue-50 shadow-md"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className="text-2xl mb-1">{emoji}</div>
                            <div className="font-semibold text-sm">{method.label}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{method.network || method.currency}</div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Wallet Address — from selected payment method */}
                {(() => {
                  const selected = activeNetworks.find((m: any) => m.id === selectedNetwork) || activeNetworks[0];
                  const address = selected?.address || '';
                  return (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <Label className="text-sm font-medium mb-2 block">
                        {selected?.label || 'Crypto'} {selected?.network === 'Pi' || selected?.network === 'pi' ? 'Username / Wallet' : 'Deposit Address'}
                      </Label>
                      {selected?.instructions && (
                        <p className="text-xs text-gray-500 mb-2">{selected.instructions}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <Input
                          value={address || 'Wallet address not configured — contact support'}
                          readOnly
                          className="font-mono text-sm"
                        />
                        {address && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(address);
                              toast({ title: "Copied!", description: "Wallet address copied to clipboard" });
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Submit Payment Proof */}
                <div className="pt-4 border-t">
                  <Button 
                    onClick={() => {
                      const currentNet = activeNetworks.find((m: any) => m.id === selectedNetwork) || activeNetworks[0];
                      setPaymentProof(prev => ({ ...prev, network: currentNet?.id || "" }));
                      setPaymentDialogOpen(true);
                    }}
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

            {/* Order Summary */}
            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ReceiptText className="h-5 w-5 text-gray-600" />
                  Order Summary
                </CardTitle>
                {campaignDetails?.title && (
                  <CardDescription className="text-gray-600 font-medium">{campaignDetails.title}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* What they ordered */}
                <div className="rounded-xl bg-gray-50 p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">What you ordered</p>
                  {campaignDetails && (
                    <div className="space-y-1.5 text-sm">
                      {campaignDetails.title && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Campaign name</span>
                          <span className="font-semibold text-gray-900">{campaignDetails.title}</span>
                        </div>
                      )}
                      {campaignDetails.totalSlots && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Influencer slots</span>
                          <span className="font-semibold text-gray-900">{campaignDetails.totalSlots}</span>
                        </div>
                      )}
                      {campaignDetails.reward && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Per-influencer reward</span>
                          <span className="font-semibold text-gray-900">${Number(campaignDetails.reward).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Charge breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* What you're paying */}
                  <div className="rounded-xl border border-blue-100 bg-blue-50 overflow-hidden">
                    <div className="px-4 py-2 bg-blue-100">
                      <p className="text-xs font-bold text-blue-800 uppercase tracking-wide flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5" /> What You Pay
                      </p>
                    </div>
                    <div className="px-4 py-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-700">Campaign budget</span>
                        <span className="font-semibold text-blue-900">${Number(escrowPayment.amount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Brand platform fee</span>
                        <span className="font-semibold text-emerald-700">$0.00</span>
                      </div>
                      <Separator className="bg-blue-200" />
                      <div className="flex justify-between">
                        <span className="font-bold text-blue-900">Total charged</span>
                        <span className="font-black text-blue-900">${Number(escrowPayment.amount).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Influencer earnings */}
                  <div className="rounded-xl border border-green-100 bg-green-50 overflow-hidden">
                    <div className="px-4 py-2 bg-green-100">
                      <p className="text-xs font-bold text-green-800 uppercase tracking-wide flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5" /> Influencer Earnings
                      </p>
                    </div>
                    <div className="px-4 py-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-green-700">Per-slot reward</span>
                        <span className="font-semibold text-green-900">${campaignDetails ? Number(campaignDetails.reward).toFixed(2) : "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Influencer fee (10%)</span>
                        <span className="font-semibold text-orange-700">−${campaignDetails ? (Number(campaignDetails.reward) * 0.1).toFixed(2) : "—"}</span>
                      </div>
                      <Separator className="bg-green-200" />
                      <div className="flex justify-between">
                        <span className="font-bold text-green-900">Influencer receives</span>
                        <span className="font-black text-green-900">${campaignDetails ? (Number(campaignDetails.reward) * 0.9).toFixed(2) : "—"} per slot</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment details */}
                {((escrowPayment as any).transactionHash || (escrowPayment as any).network) && (
                  <div className="rounded-xl border border-gray-100 bg-white divide-y divide-gray-50">
                    <p className="px-4 pt-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment details</p>
                    {(escrowPayment as any).network && (
                      <div className="flex justify-between items-center px-4 py-2.5 text-sm">
                        <span className="text-gray-500">Network</span>
                        <span className="font-medium uppercase">{(escrowPayment as any).network}</span>
                      </div>
                    )}
                    {(escrowPayment as any).transactionHash && (
                      <div className="flex justify-between items-start px-4 py-2.5 text-sm gap-3">
                        <span className="text-gray-500 shrink-0">Transaction hash</span>
                        <span className="font-mono text-xs text-gray-700 break-all text-right">{(escrowPayment as any).transactionHash}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center px-4 py-2.5 text-sm">
                      <span className="text-gray-500">Submitted</span>
                      <span className="font-medium">{format(new Date(), "MMM d, yyyy · h:mm a")}</span>
                    </div>
                  </div>
                )}
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
                    href="https://wa.me/12016800266"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-3 transition-colors font-medium"
                  >
                    <Phone className="h-5 w-5 flex-shrink-0" />
                    <div>
                      <div className="text-xs opacity-80">WhatsApp</div>
                      <div>+1 201 680 0266</div>
                    </div>
                  </a>
                  <button
                    onClick={() => setAdminMsgOpen(true)}
                    className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-3 transition-colors font-medium text-left"
                    data-testid="button-message-admin"
                  >
                    <MessageCircle className="h-5 w-5 flex-shrink-0" />
                    <div>
                      <div className="text-xs opacity-80">In-App Chat</div>
                      <div>Message Admin</div>
                    </div>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Admin Message Dialog */}
            <Dialog open={adminMsgOpen} onOpenChange={setAdminMsgOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-blue-600" />
                    Message Admin
                  </DialogTitle>
                  <DialogDescription>
                    Send a message directly to our admin team. They'll be notified immediately and reply via in-app chat.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Your Message</Label>
                    <Textarea
                      rows={5}
                      placeholder={`Hi, I've submitted payment proof for campaign ${campaignId}. Please verify my payment. Transaction details: ...`}
                      value={adminMsgText}
                      onChange={e => setAdminMsgText(e.target.value)}
                      className="mt-1.5"
                      data-testid="input-admin-message"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setAdminMsgOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      onClick={() => sendAdminMsgMutation.mutate()}
                      disabled={sendAdminMsgMutation.isPending || !adminMsgText.trim()}
                      data-testid="button-send-admin-message"
                    >
                      {sendAdminMsgMutation.isPending ? (
                        "Sending..."
                      ) : (
                        <><Send className="h-4 w-4 mr-2" /> Send to Admin</>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setLocation("/brand-dashboard")}
                data-testid="button-back-dashboard"
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => setLocation("/my-orders")}
                data-testid="button-view-my-orders"
              >
                <Package className="h-4 w-4 mr-2" /> View My Orders
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
                  placeholder="Enter transaction hash or reference ID"
                  className="font-mono text-sm"
                  data-testid="input-proof-tx-hash"
                />
              </div>
              <div>
                <Label>Payment Network</Label>
                {activeNetworks.length > 0 ? (
                  <select
                    value={paymentProof.network}
                    onChange={(e) => setPaymentProof(prev => ({ ...prev, network: e.target.value }))}
                    className="w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    data-testid="select-proof-network"
                  >
                    <option value="">— Select network —</option>
                    {activeNetworks.map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.label}{m.network ? ` (${m.network})` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={paymentProof.network}
                    onChange={(e) => setPaymentProof(prev => ({ ...prev, network: e.target.value }))}
                    placeholder="e.g. TRC20, BSC, TON, Pi"
                    className="text-sm"
                    data-testid="input-proof-network"
                  />
                )}
                <p className="text-xs text-gray-500 mt-1">Select the network you used to send payment</p>
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
                  data-testid="input-proof-screenshot"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const networkLabel = activeNetworks.find((m: any) => m.id === paymentProof.network)?.label || paymentProof.network;
                    submitProofMutation.mutate({ ...paymentProof, network: networkLabel || paymentProof.network });
                  }}
                  disabled={!paymentProof.transactionHash || submitProofMutation.isPending}
                  className="flex-1"
                  data-testid="button-submit-proof"
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