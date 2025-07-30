import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Eye, Star, Package, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ShopProduct } from "@shared/schema";

const productSchema = z.object({
  title: z.string().min(1, "Title is required"),
  shortDescription: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  price: z.number().min(0, "Price must be non-negative"),
  originalPrice: z.number().optional(),
  category: z.string().min(1, "Category is required"),
  type: z.string().min(1, "Type is required"),
  featuredImage: z.string().optional(),
  galleryImages: z.array(z.string()).default([]),
  downloadUrl: z.string().optional(),
  demoUrl: z.string().optional(),
  documentationUrl: z.string().optional(),
  features: z.array(z.string()).default([]),
  requirements: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isFree: z.boolean().default(false),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function AdminProducts() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ShopProduct | null>(null);
  const [newFeature, setNewFeature] = useState("");
  const [newRequirement, setNewRequirement] = useState("");
  const [newTag, setNewTag] = useState("");
  const [newGalleryImage, setNewGalleryImage] = useState("");

  const { data: products = [], isLoading } = useQuery<ShopProduct[]>({
    queryKey: ["/api/admin/shop/products"],
  });

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: "",
      shortDescription: "",
      description: "",
      price: 0,
      originalPrice: undefined,
      category: "",
      type: "",
      featuredImage: "",
      galleryImages: [],
      downloadUrl: "",
      demoUrl: "",
      documentationUrl: "",
      features: [],
      requirements: [],
      tags: [],
      isActive: true,
      isFeatured: false,
      isFree: false,
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const response = await apiRequest("POST", "/api/admin/shop/products", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/products"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({ title: "Product created successfully!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProductFormData> }) => {
      const response = await apiRequest("PUT", `/api/admin/shop/products/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/products"] });
      setEditingProduct(null);
      form.reset();
      toast({ title: "Product updated successfully!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/shop/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/products"] });
      toast({ title: "Product deleted successfully!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ProductFormData) => {
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data });
    } else {
      createProductMutation.mutate(data);
    }
  };

  const handleEdit = (product: ShopProduct) => {
    setEditingProduct(product);
    form.reset({
      title: product.title,
      shortDescription: product.shortDescription || "",
      description: product.description,
      price: parseFloat(product.price),
      originalPrice: product.originalPrice ? parseFloat(product.originalPrice) : undefined,
      category: product.category,
      type: product.type,
      featuredImage: product.featuredImage || "",
      galleryImages: product.galleryImages || [],
      downloadUrl: product.downloadUrl || "",
      demoUrl: product.demoUrl || "",
      documentationUrl: product.documentationUrl || "",
      features: product.features || [],
      requirements: product.requirements || [],
      tags: product.tags || [],
      isActive: product.isActive ?? true,
      isFeatured: product.isFeatured ?? false,
      isFree: product.isFree ?? false,
    });
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      const currentFeatures = form.getValues("features");
      form.setValue("features", [...currentFeatures, newFeature.trim()]);
      setNewFeature("");
    }
  };

  const removeFeature = (index: number) => {
    const currentFeatures = form.getValues("features");
    form.setValue("features", currentFeatures.filter((_, i) => i !== index));
  };

  const addRequirement = () => {
    if (newRequirement.trim()) {
      const currentRequirements = form.getValues("requirements");
      form.setValue("requirements", [...currentRequirements, newRequirement.trim()]);
      setNewRequirement("");
    }
  };

  const removeRequirement = (index: number) => {
    const currentRequirements = form.getValues("requirements");
    form.setValue("requirements", currentRequirements.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (newTag.trim()) {
      const currentTags = form.getValues("tags");
      form.setValue("tags", [...currentTags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (index: number) => {
    const currentTags = form.getValues("tags");
    form.setValue("tags", currentTags.filter((_, i) => i !== index));
  };

  const addGalleryImage = () => {
    if (newGalleryImage.trim()) {
      const currentImages = form.getValues("galleryImages");
      form.setValue("galleryImages", [...currentImages, newGalleryImage.trim()]);
      setNewGalleryImage("");
    }
  };

  const removeGalleryImage = (index: number) => {
    const currentImages = form.getValues("galleryImages");
    form.setValue("galleryImages", currentImages.filter((_, i) => i !== index));
  };

  const filteredProducts = products.filter((product: ShopProduct) => {
    const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(products.map((p: ShopProduct) => p.category)));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Product Management</h1>
          <p className="text-gray-600">Manage your shop products</p>
        </div>
        <Dialog open={isCreateDialogOpen || !!editingProduct} onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingProduct(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Create New Product"}</DialogTitle>
              <DialogDescription>
                {editingProduct ? "Update product details" : "Add a new product to your shop"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter product title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="software">Software</SelectItem>
                            <SelectItem value="template">Template</SelectItem>
                            <SelectItem value="course">Course</SelectItem>
                            <SelectItem value="ebook">E-book</SelectItem>
                            <SelectItem value="tool">Tool</SelectItem>
                            <SelectItem value="service">Service</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="shortDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Brief description for listings" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detailed product description"
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="originalPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Original Price ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="digital">Digital</SelectItem>
                            <SelectItem value="physical">Physical</SelectItem>
                            <SelectItem value="service">Service</SelectItem>
                            <SelectItem value="subscription">Subscription</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="featuredImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Featured Image URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="downloadUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Download URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="demoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Demo URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Gallery Images */}
                <div className="space-y-2">
                  <FormLabel>Gallery Images</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Image URL"
                      value={newGalleryImage}
                      onChange={(e) => setNewGalleryImage(e.target.value)}
                    />
                    <Button type="button" onClick={addGalleryImage}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.watch("galleryImages").map((image, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {image.substring(0, 30)}...
                        <button type="button" onClick={() => removeGalleryImage(index)}>×</button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2">
                  <FormLabel>Features</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add feature"
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                    />
                    <Button type="button" onClick={addFeature}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.watch("features").map((feature, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {feature}
                        <button type="button" onClick={() => removeFeature(index)}>×</button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Requirements */}
                <div className="space-y-2">
                  <FormLabel>Requirements</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add requirement"
                      value={newRequirement}
                      onChange={(e) => setNewRequirement(e.target.value)}
                    />
                    <Button type="button" onClick={addRequirement}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.watch("requirements").map((requirement, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {requirement}
                        <button type="button" onClick={() => removeRequirement(index)}>×</button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <FormLabel>Tags</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add tag"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                    />
                    <Button type="button" onClick={addTag}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.watch("tags").map((tag, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {tag}
                        <button type="button" onClick={() => removeTag(index)}>×</button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active</FormLabel>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isFeatured"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Featured</FormLabel>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isFree"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Free</FormLabel>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={createProductMutation.isPending || updateProductMutation.isPending}>
                    {createProductMutation.isPending || updateProductMutation.isPending ? "Saving..." : 
                     editingProduct ? "Update Product" : "Create Product"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
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
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product: ShopProduct) => (
            <Card key={product.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-1">{product.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{product.category}</Badge>
                      {product.isFeatured && <Star className="w-4 h-4 text-yellow-500" />}
                      {!product.isActive && <Badge variant="secondary">Inactive</Badge>}
                    </div>
                  </div>
                  {product.featuredImage && (
                    <img
                      src={product.featuredImage}
                      alt={product.title}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {product.shortDescription || product.description}
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg font-bold text-green-600">
                    {product.isFree ? "Free" : `$${product.price}`}
                  </span>
                  {product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
                    <span className="text-sm text-gray-500 line-through">${product.originalPrice}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Package className="w-4 h-4" />
                  <span>{product.salesCount || 0} sales</span>
                  <span>•</span>
                  <span>Rating: {product.rating || "0.0"} ({product.reviewCount || 0})</span>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/shop/product/${product.id}`, '_blank')}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(product)}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this product?")) {
                      deleteProductMutation.mutate(product.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {filteredProducts.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || selectedCategory !== "all" 
              ? "Try adjusting your search or filters" 
              : "Get started by adding your first product"}
          </p>
          {!searchTerm && selectedCategory === "all" && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Product
            </Button>
          )}
        </div>
      )}
    </div>
  );
}