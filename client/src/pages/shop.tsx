import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, Star, ShoppingCart, Eye, Tag, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import type { ShopProduct } from "@shared/schema";

export default function Shop() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const { data: products = [], isLoading } = useQuery<ShopProduct[]>({
    queryKey: ["/api/shop/products"],
  });

  const { data: featuredProducts = [] } = useQuery<ShopProduct[]>({
    queryKey: ["/api/shop/products/featured"],
  });

  const filteredProducts = products.filter((product: ShopProduct) => {
    const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.tags || []).some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return parseFloat(a.price) - parseFloat(b.price);
      case "price-high":
        return parseFloat(b.price) - parseFloat(a.price);
      case "rating":
        return parseFloat(b.rating || "0") - parseFloat(a.rating || "0");
      case "popular":
        return (b.salesCount || 0) - (a.salesCount || 0);
      case "newest":
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const categories = Array.from(new Set(products.map((p: ShopProduct) => p.category)));

  const ProductCard = ({ product }: { product: ShopProduct }) => (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <CardHeader className="p-4">
        <div className="relative">
          {product.featuredImage ? (
            <img
              src={product.featuredImage}
              alt={product.title}
              className="w-full h-48 object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center">
              <Package className="w-16 h-16 text-gray-400" />
            </div>
          )}
          <div className="absolute top-2 right-2 flex gap-2">
            {product.isFree && (
              <Badge className="bg-green-500 text-white">Free</Badge>
            )}
            {product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
              <Badge variant="destructive">Sale</Badge>
            )}
          </div>
        </div>
        <CardTitle className="text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
          {product.title}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{product.category}</Badge>
          <Badge variant="outline">{product.type}</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        <p className="text-sm text-gray-600 line-clamp-3 mb-4">
          {product.shortDescription || product.description}
        </p>
        
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < Math.floor(parseFloat(product.rating || "0"))
                    ? "text-yellow-500 fill-current"
                    : "text-gray-300"
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-gray-500">
            {product.rating || "0.0"} ({product.reviewCount || 0})
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-green-600">
              {product.isFree ? "Free" : `$${product.price}`}
            </span>
            {product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
              <span className="text-lg text-gray-500 line-through">${product.originalPrice}</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <ShoppingCart className="w-4 h-4" />
            <span>{product.salesCount || 0}</span>
          </div>
        </div>

        {product.tags && product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {product.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                <Tag className="w-3 h-3 mr-1" />
                {tag}
              </Badge>
            ))}
            {product.tags.length > 3 && (
              <span className="text-xs text-gray-500">+{product.tags.length - 3} more</span>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <div className="flex gap-2 w-full">
          <Link href={`/shop/product/${product.id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </Button>
          </Link>
          <Link href={`/shop/checkout/${product.id}`} className="flex-1">
            <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <ShoppingCart className="w-4 h-4 mr-2" />
              {product.isFree ? "Get Free" : "Buy Now"}
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Digital Products Store
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              Discover premium software, templates, courses and digital tools
            </p>
            <div className="max-w-md mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 py-3 text-lg bg-white/10 border-white/20 text-white placeholder:text-gray-300"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6 text-center">Featured Products</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProducts.slice(0, 3).map((product: ShopProduct) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* Filters and Sorting */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-gray-600">
            {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
          </div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-48 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-16 bg-gray-200 rounded mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sortedProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedProducts.map((product: ShopProduct) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || selectedCategory !== "all" 
                ? "Try adjusting your search or filters" 
                : "Check back soon for new products"}
            </p>
            {(searchTerm || selectedCategory !== "all") && (
              <Button 
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("all");
                }}
                variant="outline"
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}