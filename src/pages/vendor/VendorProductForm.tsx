import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import VendorLayout from '@/components/vendor/VendorLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, ArrowLeft, Loader2, Info } from 'lucide-react';

const VendorProductForm = () => {
  const navigate = useNavigate();
  const { id: productId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { vendorProfile } = useAuth();
  const isEditMode = !!productId;

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    brand: '',
    description: '',
    category_id: '',
    location_id: '',
    features: [''],
    images: [''],
    specifications: {} as Record<string, string>,
    tags: [''],
    in_stock: true,
    stock_quantity: 10,
  });

  // New simplified pricing model
  const [pricing, setPricing] = useState({
    baseMonthlyRent: 0,
    securityDeposit: 0,
    deliveryFee: 500,
    installationFee: 0,
    maxDuration: 12,
    discountPerMonth: 2, // % discount per additional month
  });

  const [specKey, setSpecKey] = useState('');
  const [specValue, setSpecValue] = useState('');

  // Calculate price for any month
  const getPriceForMonth = (month: number) => {
    const discount = pricing.discountPerMonth * (month - 1);
    const cappedDiscount = Math.min(discount, 80); // Cap at 80% max discount
    return Math.round(pricing.baseMonthlyRent * (1 - cappedDiscount / 100));
  };

  // Preview pricing table
  const pricingPreview = useMemo(() => {
    if (pricing.baseMonthlyRent <= 0) return [];
    const months = [1, 2, 3, 6, 12, pricing.maxDuration].filter(
      (m, i, arr) => m <= pricing.maxDuration && arr.indexOf(m) === i
    ).sort((a, b) => a - b);
    return months.map(m => ({ month: m, price: getPriceForMonth(m) }));
  }, [pricing.baseMonthlyRent, pricing.maxDuration, pricing.discountPerMonth]);

  // Fetch product data for edit mode
  const { data: existingProduct, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['vendor-product', productId],
    enabled: isEditMode,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`*, rental_plans (*)`)
        .eq('id', productId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Populate form with existing data
  useEffect(() => {
    if (existingProduct) {
      setFormData({
        name: existingProduct.name || '',
        slug: existingProduct.slug || '',
        brand: existingProduct.brand || '',
        description: existingProduct.description || '',
        category_id: existingProduct.category_id || '',
        location_id: existingProduct.location_id || '',
        features: existingProduct.features?.length ? existingProduct.features : [''],
        images: existingProduct.images?.length ? existingProduct.images : [''],
        specifications: (existingProduct.specifications as Record<string, string>) || {},
        tags: existingProduct.tags?.length ? existingProduct.tags : [''],
        in_stock: existingProduct.in_stock ?? true,
        stock_quantity: existingProduct.stock_quantity ?? 10,
      });

      // Reverse-engineer pricing from existing rental plans
      if (existingProduct.rental_plans?.length) {
        const plans = [...existingProduct.rental_plans].sort(
          (a: any, b: any) => a.duration_months - b.duration_months
        );
        const firstPlan = plans[0];
        const lastPlan = plans[plans.length - 1];

        const baseRent = firstPlan.monthly_rent;
        const maxDur = lastPlan.duration_months;
        
        // Calculate discount % per month from first and last plan
        let discountPerMonth = 2;
        if (plans.length > 1 && baseRent > 0 && maxDur > 1) {
          const totalDiscountPercent = ((baseRent - lastPlan.monthly_rent) / baseRent) * 100;
          discountPerMonth = Math.round((totalDiscountPercent / (maxDur - 1)) * 10) / 10;
        }

        setPricing({
          baseMonthlyRent: baseRent,
          securityDeposit: firstPlan.security_deposit,
          deliveryFee: firstPlan.delivery_fee || 500,
          installationFee: firstPlan.installation_fee || 0,
          maxDuration: maxDur,
          discountPerMonth: Math.max(0, discountPerMonth),
        });
      }
    }
  }, [existingProduct]);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('locations').select('*').eq('is_active', true).order('display_order');
      if (error) throw error;
      return data;
    },
  });

  // Generate rental plan rows from pricing config
  const generateRentalPlans = (productIdForPlans: string) => {
    const plans = [];
    // Create plan for month 1
    plans.push({
      product_id: productIdForPlans,
      label: '1 Month',
      duration_months: 1,
      monthly_rent: pricing.baseMonthlyRent,
      security_deposit: pricing.securityDeposit,
      delivery_fee: pricing.deliveryFee,
      installation_fee: pricing.installationFee,
    });
    // Create plan for max duration
    if (pricing.maxDuration > 1) {
      plans.push({
        product_id: productIdForPlans,
        label: `${pricing.maxDuration} Months`,
        duration_months: pricing.maxDuration,
        monthly_rent: getPriceForMonth(pricing.maxDuration),
        security_deposit: pricing.securityDeposit,
        delivery_fee: pricing.deliveryFee,
        installation_fee: pricing.installationFee,
      });
    }
    return plans;
  };

  const createProductMutation = useMutation({
    mutationFn: async () => {
      if (!vendorProfile?.id) throw new Error('Vendor profile not found');

      const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-');
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          vendor_id: vendorProfile.id,
          name: formData.name,
          slug,
          brand: formData.brand || null,
          description: formData.description || null,
          category_id: formData.category_id || null,
          location_id: formData.location_id || null,
          features: formData.features.filter(f => f.trim()),
          images: formData.images.filter(i => i.trim()),
          specifications: formData.specifications,
          tags: formData.tags.filter(t => t.trim()),
          in_stock: formData.in_stock,
          stock_quantity: formData.stock_quantity,
          status: 'pending',
        })
        .select()
        .single();

      if (productError) throw productError;

      const plans = generateRentalPlans(product.id);
      const { error: plansError } = await supabase.from('rental_plans').insert(plans);
      if (plansError) throw plansError;

      return product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      toast.success('Product created successfully! It will be reviewed by admin.');
      navigate('/vendor/products');
    },
    onError: (error) => {
      toast.error('Failed to create product');
      console.error(error);
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async () => {
      if (!vendorProfile?.id || !productId) throw new Error('Missing required data');

      const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-');
      
      // Don't reset status to pending - keep current status
      // Admin re-approval only needed for new products
      const updatePayload: Record<string, any> = {
        name: formData.name,
        slug,
        brand: formData.brand || null,
        description: formData.description || null,
        category_id: formData.category_id || null,
        location_id: formData.location_id || null,
        features: formData.features.filter(f => f.trim()),
        images: formData.images.filter(i => i.trim()),
        specifications: formData.specifications,
        tags: formData.tags.filter(t => t.trim()),
        in_stock: formData.in_stock,
        stock_quantity: formData.stock_quantity,
      };

      const { error: productError } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', productId)
        .eq('vendor_id', vendorProfile.id);

      if (productError) throw productError;

      // Delete existing rental plans and insert new ones
      const { error: deleteError } = await supabase
        .from('rental_plans')
        .delete()
        .eq('product_id', productId);
      if (deleteError) throw deleteError;

      const plans = generateRentalPlans(productId);
      const { error: plansError } = await supabase.from('rental_plans').insert(plans);
      if (plansError) throw plansError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-product', productId] });
      toast.success('Product updated successfully!');
      navigate('/vendor/products');
    },
    onError: (error: any) => {
      const msg = error?.message || error?.details || 'Unknown error';
      toast.error(`Failed to update product: ${msg}`);
      console.error('[updateProduct] Error:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('Product name is required');
      return;
    }

    if (pricing.baseMonthlyRent <= 0) {
      toast.error('Base monthly rent is required');
      return;
    }

    if (isEditMode) {
      updateProductMutation.mutate();
    } else {
      createProductMutation.mutate();
    }
  };

  const addFeature = () => setFormData({ ...formData, features: [...formData.features, ''] });
  const removeFeature = (index: number) => {
    setFormData({ ...formData, features: formData.features.filter((_, i) => i !== index) });
  };

  const addImage = () => setFormData({ ...formData, images: [...formData.images, ''] });
  const removeImage = (index: number) => {
    setFormData({ ...formData, images: formData.images.filter((_, i) => i !== index) });
  };

  const addTag = () => setFormData({ ...formData, tags: [...formData.tags, ''] });
  const removeTag = (index: number) => {
    setFormData({ ...formData, tags: formData.tags.filter((_, i) => i !== index) });
  };

  const addSpec = () => {
    if (specKey && specValue) {
      setFormData({ 
        ...formData, 
        specifications: { ...formData.specifications, [specKey]: specValue } 
      });
      setSpecKey('');
      setSpecValue('');
    }
  };

  const removeSpec = (key: string) => {
    const newSpecs = { ...formData.specifications };
    delete newSpecs[key];
    setFormData({ ...formData, specifications: newSpecs });
  };

  if (isEditMode && isLoadingProduct) {
    return (
      <VendorLayout>
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </VendorLayout>
    );
  }

  const isSubmitting = createProductMutation.isPending || updateProductMutation.isPending;

  return (
    <VendorLayout>
      <div className="p-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate('/vendor/products')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Products
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">{isEditMode ? 'Edit Product' : 'Add New Product'}</h1>
          <p className="text-muted-foreground">
            {isEditMode ? 'Update your product listing' : 'Create a new rental product listing'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., HP LaserJet Pro M404n"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="e.g., HP"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={formData.category_id} 
                    onValueChange={(v) => setFormData({ ...formData, category_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Service Location *</Label>
                  <Select 
                    value={formData.location_id} 
                    onValueChange={(v) => setFormData({ ...formData, location_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select city where you rent" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations?.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="auto-generated if empty"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your product..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle>Product Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.images.map((image, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={image}
                    onChange={(e) => {
                      const newImages = [...formData.images];
                      newImages[index] = e.target.value;
                      setFormData({ ...formData, images: newImages });
                    }}
                    placeholder="Image URL"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeImage(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addImage}>
                <Plus className="h-4 w-4 mr-2" />
                Add Image
              </Button>
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.features.map((feature, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={feature}
                    onChange={(e) => {
                      const newFeatures = [...formData.features];
                      newFeatures[index] = e.target.value;
                      setFormData({ ...formData, features: newFeatures });
                    }}
                    placeholder="e.g., High-speed printing up to 40ppm"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeFeature(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addFeature}>
                <Plus className="h-4 w-4 mr-2" />
                Add Feature
              </Button>
            </CardContent>
          </Card>

          {/* Specifications */}
          <Card>
            <CardHeader>
              <CardTitle>Specifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(formData.specifications).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 p-2 bg-muted rounded">
                  <span className="font-medium">{key}:</span>
                  <span>{value}</span>
                  <Button type="button" variant="ghost" size="icon" className="ml-auto" onClick={() => removeSpec(key)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input value={specKey} onChange={(e) => setSpecKey(e.target.value)} placeholder="Spec name (e.g., Print Speed)" />
                <Input value={specValue} onChange={(e) => setSpecValue(e.target.value)} placeholder="Value (e.g., 40 ppm)" />
                <Button type="button" variant="outline" onClick={addSpec}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Dynamic Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Rental Pricing *</CardTitle>
              <p className="text-sm text-muted-foreground">
                Set a base monthly rent and a discount percentage. The system will automatically calculate lower prices for longer rental durations.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Base Monthly Rent (₹) *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={pricing.baseMonthlyRent || ''}
                    onChange={(e) => setPricing({ ...pricing, baseMonthlyRent: Number(e.target.value) })}
                    placeholder="e.g., 900"
                  />
                  <p className="text-xs text-muted-foreground">Price for 1 month rental</p>
                </div>
                <div className="space-y-2">
                  <Label>Discount % per Month</Label>
                  <Input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={pricing.discountPerMonth}
                    onChange={(e) => setPricing({ ...pricing, discountPerMonth: Number(e.target.value) })}
                    placeholder="e.g., 2"
                  />
                  <p className="text-xs text-muted-foreground">Each extra month reduces price by this %</p>
                </div>
                <div className="space-y-2">
                  <Label>Max Rental Duration</Label>
                  <Select 
                    value={String(pricing.maxDuration)} 
                    onValueChange={(v) => setPricing({ ...pricing, maxDuration: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[3, 6, 12, 18, 24, 36].map(m => (
                        <SelectItem key={m} value={String(m)}>{m} Months</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Security Deposit (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={pricing.securityDeposit || ''}
                    onChange={(e) => setPricing({ ...pricing, securityDeposit: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Delivery Fee (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={pricing.deliveryFee || ''}
                    onChange={(e) => setPricing({ ...pricing, deliveryFee: Number(e.target.value) })}
                    placeholder="500"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Installation Fee (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={pricing.installationFee || ''}
                    onChange={(e) => setPricing({ ...pricing, installationFee: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Pricing Preview */}
              {pricingPreview.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="p-3 bg-muted flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Pricing Preview</span>
                  </div>
                  <div className="divide-y">
                    {pricingPreview.map(({ month, price }) => (
                      <div key={month} className="flex justify-between p-3 text-sm">
                        <span className="text-muted-foreground">
                          {month} {month === 1 ? 'Month' : 'Months'}
                        </span>
                        <div className="text-right">
                          <span className="font-semibold">₹{price.toLocaleString()}/mo</span>
                          {month > 1 && (
                            <span className="text-xs text-primary ml-2">
                              ({Math.round(((pricing.baseMonthlyRent - price) / pricing.baseMonthlyRent) * 100)}% off)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">In Stock</p>
                  <p className="text-sm text-muted-foreground">Is this product available for rental?</p>
                </div>
                <Switch
                  checked={formData.in_stock}
                  onCheckedChange={(checked) => setFormData({ ...formData, in_stock: checked })}
                />
              </div>
              {formData.in_stock && (
                <div className="space-y-2 max-w-xs">
                  <Label htmlFor="stock">Stock Quantity</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: Number(e.target.value) })}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <div key={index} className="flex gap-1">
                    <Input
                      value={tag}
                      onChange={(e) => {
                        const newTags = [...formData.tags];
                        newTags[index] = e.target.value;
                        setFormData({ ...formData, tags: newTags });
                      }}
                      placeholder="Tag"
                      className="w-32"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeTag(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addTag}>
                <Plus className="h-4 w-4 mr-2" />
                Add Tag
              </Button>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-4">
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditMode ? 'Update Product' : 'Create Product'}
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={() => navigate('/vendor/products')}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </VendorLayout>
  );
};

export default VendorProductForm;
