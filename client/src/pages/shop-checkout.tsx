import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { 
  ArrowLeft, ShoppingCart, CreditCard, Shield, Copy, 
  CheckCircle, ExternalLink, Package, Clock, AlertCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import type { ShopProduct } from "@shared/schema";

export default function ShopCheckout() {
  const [, params] = useRoute("/shop/checkout/:id");
  const { user } = useAuth();
  const { toast } = useToast();
  const [paymentProof, setPaymentProof] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [paymentNetwork, setPaymentNetwork] = useState("tron");
  const [isProcessing, setIsProcessing] = useState(false);

  const productId = params?.id;

  const { data: product, isLoading } = useQuery<ShopProduct>({
    queryKey: ["/api/shop/products", productId],
    enabled: !!productId,
  });

  const createPurchaseMutation = useMutation({
    mutationFn: async (purchaseData: any) => {
      const response = await apiRequest("POST", "/api/shop/purchase", purchaseData);
      return response.json();
    },
    onSuccess: (purchase) => {
      toast({
        title: "Purchase submitted successfully!",
        description: "Your payment will be verified by our team. You'll receive download links once confirmed.",
      });
      // Redirect to thank you page or purchase confirmation
      window.location.href = `/shop/purchase/${purchase.id}`;
    },
    onError: (error: Error) => {
      toast({
        title: "Purchase failed",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  const handleSubmitPurchase = () => {
    if (!user) {
      toast({
        title: "Please log in to make a purchase",
        variant: "destructive",
      });
      return;
    }

    if (product?.isFree) {
      // Handle free product
      createPurchaseMutation.mutate({
        productId: product.id,
        amount: "0",
        currency: "USDT",
        network: "free",
        paymentProof: "FREE_PRODUCT",
        transactionHash: "",
      });
    } else {
      if (!paymentProof.trim()) {
        toast({
          title: "Payment proof required",
          description: "Please provide payment proof URL or transaction details",
          variant: "destructive",
        });
        return;
      }

      setIsProcessing(true);
      createPurchaseMutation.mutate({
        productId: product?.id,
        amount: product?.price,
        currency: "USDT",
        network: paymentNetwork,
        paymentProof: paymentProof.trim(),
        transactionHash: transactionHash.trim(),
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard!" });
  };

  // Wallet addresses for different networks
  const walletAddresses = {
    tron: "TQrZ9dD3vCCHiJ3RSRcBVErK6rNs9Kg2qc",
    bsc: "0x742d35Cc64C0532925EF2A8B3F3a3b5e9f3d4e2c",
    ton: "EQD1vP2q3kJ8B2nL6vK8H9xR7tG5rNqF4sP8cQ1xZ3yT2rV9"
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-96 bg-gray-200 rounded"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Product not found</h2>
          <p className="text-gray-600 mb-6">The product you're trying to purchase doesn't exist.</p>
          <Link href="/shop">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Shop
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/shop/product/${product.id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Product
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
            <p className="text-gray-600">Complete your purchase</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  {product.featuredImage ? (
                    <img
                      src={product.featuredImage}
                      alt={product.title}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{product.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">{product.category}</Badge>
                      <Badge variant="outline">{product.type}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {product.shortDescription || product.description}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Price</span>
                    <span className="font-semibold">
                      {product.isFree ? "Free" : `$${product.price} USDT`}
                    </span>
                  </div>
                  {product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Original Price</span>
                      <span className="line-through">${product.originalPrice}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span>Processing Fee</span>
                    <span>$0.00</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-green-600">
                    {product.isFree ? "FREE" : `$${product.price} USDT`}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* What You'll Get */}
            <Card>
              <CardHeader>
                <CardTitle>What You'll Get</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Instant access to download</span>
                  </div>
                  {product.downloadUrl && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span>Direct download link</span>
                    </div>
                  )}
                  {product.documentationUrl && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span>Complete documentation</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Lifetime access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-500" />
                    <span>Secure payment processing</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Details */}
          <div className="space-y-6">
            {product.isFree ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    Free Product
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <h3 className="font-semibold text-green-800 mb-2">This product is free!</h3>
                    <p className="text-green-700 text-sm">
                      Click the button below to get instant access to this product.
                    </p>
                  </div>
                  <Button 
                    onClick={handleSubmitPurchase}
                    disabled={isProcessing || createPurchaseMutation.isPending}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    {isProcessing || createPurchaseMutation.isPending ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Getting Access...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Get Free Access
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Payment Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Payment Network Selection */}
                  <div className="space-y-3">
                    <Label>Select Payment Network</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(walletAddresses).map(([network, address]) => (
                        <Button
                          key={network}
                          variant={paymentNetwork === network ? "default" : "outline"}
                          onClick={() => setPaymentNetwork(network)}
                          className="p-3"
                        >
                          {network.toUpperCase()}
                          {network === "bsc" && " (BSC)"}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Wallet Address */}
                  <div className="space-y-2">
                    <Label>Send Payment To</Label>
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{paymentNetwork.toUpperCase()} Address:</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(walletAddresses[paymentNetwork as keyof typeof walletAddresses])}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </Button>
                      </div>
                      <code className="text-sm font-mono break-all">
                        {walletAddresses[paymentNetwork as keyof typeof walletAddresses]}
                      </code>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium mb-1">Payment Instructions:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Send exactly ${product.price} USDT to the address above</li>
                            <li>Use the {paymentNetwork.toUpperCase()} network only</li>
                            <li>Double-check the address before sending</li>
                            <li>Keep your transaction hash for verification</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Hash */}
                  <div className="space-y-2">
                    <Label htmlFor="transactionHash">Transaction Hash (Optional)</Label>
                    <Input
                      id="transactionHash"
                      placeholder="Enter transaction hash if available"
                      value={transactionHash}
                      onChange={(e) => setTransactionHash(e.target.value)}
                    />
                  </div>

                  {/* Payment Proof */}
                  <div className="space-y-2">
                    <Label htmlFor="paymentProof">Payment Proof *</Label>
                    <Textarea
                      id="paymentProof"
                      placeholder="Provide transaction hash, screenshot URL, or other payment proof"
                      rows={3}
                      value={paymentProof}
                      onChange={(e) => setPaymentProof(e.target.value)}
                    />
                    <p className="text-sm text-gray-600">
                      Please provide proof of payment for verification. This can be a transaction hash, 
                      screenshot URL, or detailed transaction information.
                    </p>
                  </div>

                  <Button 
                    onClick={handleSubmitPurchase}
                    disabled={isProcessing || createPurchaseMutation.isPending}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    size="lg"
                  >
                    {isProcessing || createPurchaseMutation.isPending ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Processing Purchase...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Complete Purchase
                      </>
                    )}
                  </Button>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-gray-900 mb-1">Secure Payment</p>
                        <p className="text-gray-600">
                          Your payment will be manually verified by our team. 
                          You'll receive download access once payment is confirmed.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}