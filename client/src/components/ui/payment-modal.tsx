import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CloudUpload, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ShopProduct } from "@shared/schema";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ShopProduct | null;
  onSubmit: (data: any) => void;
}

export function PaymentModal({ isOpen, onClose, product, onSubmit }: PaymentModalProps) {
  const [selectedPayment, setSelectedPayment] = useState("USDT");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const { toast } = useToast();

  const walletAddresses = {
    BTC: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    BNB: "bnb1grpf0955h0ykzq3ar5nmum7y6gdfl6lxfn46h2",
    SOL: "DQyrAcCrDXQ7NeoqGgDCZwBveBXbQmy3qz9Mh8VCMXeJ",
    USDT: "TXFBqBbqJtZ8jVhD5sV5VY9rdnzhTtAATz",
  };

  const paymentMethods = [
    { code: "BTC", name: "Bitcoin", icon: "₿", color: "text-yellow-500" },
    { code: "BNB", name: "BNB", icon: "B", color: "text-yellow-600" },
    { code: "SOL", name: "Solana", icon: "◎", color: "text-purple-500" },
    { code: "USDT", name: "USDT", icon: "$", color: "text-green-500" },
  ];

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddresses[selectedPayment as keyof typeof walletAddresses]);
    toast({
      title: "Address Copied",
      description: "Wallet address has been copied to clipboard",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentProof) {
      toast({
        title: "Error",
        description: "Please upload payment proof",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('productId', product?.id || '');
    formData.append('amount', product?.price || '');
    formData.append('paymentMethod', selectedPayment);
    formData.append('paymentProof', paymentProof);

    onSubmit(formData);
    handleClose();
  };

  const handleClose = () => {
    setSelectedPayment("USDT");
    setPaymentProof(null);
    onClose();
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Complete Payment</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Product Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-black">{product.title}</h4>
            <p className="text-2xl font-bold text-accent mt-2">${product.price}</p>
          </div>

          {/* Payment Instructions */}
          <div>
            <h4 className="font-semibold text-black mb-3">Payment Instructions</h4>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800 flex items-start">
                <span className="mr-2">ℹ️</span>
                Send the exact amount to the wallet address below. Your purchase will be activated after payment confirmation.
              </p>
            </div>
            
            {/* Payment Method Selection */}
            <div className="space-y-3">
              <Label>Select Payment Method</Label>
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map((method) => (
                  <button
                    key={method.code}
                    type="button"
                    onClick={() => setSelectedPayment(method.code)}
                    className={`p-3 border rounded-lg transition-colors duration-200 text-center ${
                      selectedPayment === method.code
                        ? "border-accent bg-blue-50"
                        : "border-gray-300 hover:border-accent"
                    }`}
                  >
                    <div className={`text-xl mb-1 ${method.color}`}>{method.icon}</div>
                    <div className="text-sm font-medium">{method.code}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Wallet Address */}
            <div className="mt-4">
              <Label className="block text-sm font-medium text-black mb-2">
                Send {selectedPayment} to:
              </Label>
              <div className="bg-gray-100 p-3 rounded-lg border">
                <div className="flex items-center justify-between">
                  <code className="text-sm font-mono text-black break-all pr-2">
                    {walletAddresses[selectedPayment as keyof typeof walletAddresses]}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyAddress}
                    className="text-accent hover:text-blue-700 flex-shrink-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Amount: <span className="font-semibold">${product.price} {selectedPayment}</span>
              </p>
            </div>
          </div>

          {/* Upload Proof */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Upload Payment Proof</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <CloudUpload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Upload transaction screenshot or hash</p>
                <Input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => setPaymentProof(e.target.files?.[0] || null)}
                  className="hidden"
                  id="payment-proof"
                />
                <Label htmlFor="payment-proof" className="cursor-pointer">
                  <Button type="button" variant="outline" className="mt-2">
                    Choose File
                  </Button>
                </Label>
              </div>
              {paymentProof && (
                <p className="text-sm text-gray-600 mt-2">
                  Selected: {paymentProof.name}
                </p>
              )}
            </div>

            {/* Submit */}
            <Button 
              type="submit" 
              className="w-full bg-accent text-white hover:bg-blue-700"
              disabled={!paymentProof}
            >
              Submit Payment Proof
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
