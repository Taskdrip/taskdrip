import { useEffect, useState } from "react";
import { Navigation } from "@/components/ui/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaymentModal } from "@/components/ui/payment-modal";
import { Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { ShopProduct } from "@shared/schema";

export default function Shop() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["/api/shop"],
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const handlePurchase = (product: ShopProduct) => {
    setSelectedProduct(product);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (formData: FormData) => {
    try {
      await apiRequest('POST', '/api/purchases', formData);
      toast({
        title: "Purchase Submitted",
        description: "Your payment proof has been submitted. You'll receive access once verified.",
      });
    } catch (error) {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to submit purchase. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'course':
        return 'bg-blue-100 text-blue-800';
      case 'software':
        return 'bg-purple-100 text-purple-800';
      case 'templates':
        return 'bg-green-100 text-green-800';
      case 'crypto course':
        return 'bg-yellow-100 text-yellow-800';
      case 'analytics tool':
        return 'bg-blue-100 text-blue-800';
      case 'equipment guide':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">Digital Marketplace</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Access premium tools, courses, and resources to boost your creator journey and maximize your earnings.
            </p>
          </div>

          {productsLoading ? (
            <div className="text-center">
              <p className="text-gray-600">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center">
              <p className="text-gray-600">No products available at the moment.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((product: ShopProduct) => (
                <div key={product.id} className="bg-gray-50 rounded-xl overflow-hidden hover:shadow-md transition-shadow duration-200">
                  {product.featuredImage && (
                    <img 
                      src={product.featuredImage} 
                      alt={product.title} 
                      className="w-full h-48 object-cover" 
                    />
                  )}
                  <div className="p-6">
                    <div className="flex items-center space-x-2 mb-3">
                      <Badge className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getCategoryColor(product.category)}`}>
                        {product.category}
                      </Badge>
                      {product.isFree && (
                        <Badge className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                          Free
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-xl font-semibold text-black mb-3">{product.title}</h3>
                    <p className="text-gray-600 mb-4 text-sm line-clamp-3">{product.description}</p>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        {product.isFree ? (
                          <span className="text-2xl font-bold text-success">FREE</span>
                        ) : (
                          <>
                            <span className="text-2xl font-bold text-black">${product.price}</span>
                            {product.originalPrice && (
                              <span className="text-sm text-gray-600 line-through ml-2">
                                ${product.originalPrice}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="flex text-yellow-400">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-4 h-4 ${i < Math.floor(parseFloat(product.rating || "0")) ? 'fill-current' : ''}`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-600">({product.reviewCount})</span>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => handlePurchase(product)}
                      className={`w-full font-semibold py-3 rounded-lg transition-colors duration-200 ${
                        product.isFree
                          ? "bg-success text-white hover:bg-green-700"
                          : "bg-accent text-white hover:bg-blue-700"
                      }`}
                    >
                      {product.isFree ? "Download Free" : "Purchase Now"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        product={selectedProduct}
        onSubmit={handlePaymentSubmit}
      />
    </div>
  );
}
