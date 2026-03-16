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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, ArrowLeft, Loader2, Info, MapPin, Upload } from 'lucide-react';

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
    features: [''],
    images: [''],
    specifications: {} as Record<string, string>,
    tags: [''],
    in_stock: true,
    stock_quantity: 10,
    buy_price: '' as string | number,
    advance_discount_percent: '' as string | number,
    delivery_tat: 2,
    installation_tat: 1,
  });

  // Multi-location selection state
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);

  // Variations state
  const [variations, setVariations] = useState<{ variation_type: string; variation_value: string; price_adjustment: number }[]>([]);

  // Pricing mode: 'auto' or 'manual'
  const [pricingMode, setPricingMode] = useState<'auto' | 'manual'>('auto');

  // Manual slab prices: month -> price
  const [manualSlabs, setManualSlabs] = useState<Record<number, number>>({});
  const [manualMaxDuration, setManualMaxDuration] = useState(12);

  // New simplified pricing model - deposit auto-calculated from baseMonthlyRent
  const [pricing, setPricing] = useState({
    baseMonthlyRent: 0,
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
        .select(`*, rental_plans (*), product_variations (*)`)
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
        features: existingProduct.features?.length ? existingProduct.features : [''],
        images: existingProduct.images?.length ? existingProduct.images : [''],
        specifications: (existingProduct.specifications as Record<string, string>) || {},
        tags: existingProduct.tags?.length ? existingProduct.tags : [''],
        in_stock: existingProduct.in_stock ?? true,
        stock_quantity: existingProduct.stock_quantity ?? 10,
        buy_price: (existingProduct as any).buy_price ?? '',
        advance_discount_percent: (existingProduct as any).advance_discount_percent ?? '',
        delivery_tat: (existingProduct as any).delivery_tat ?? 2,
        installation_tat: (existingProduct as any).installation_tat ?? 1,
      });

      // Load existing product locations
      const loadProductLocations = async () => {
        const { data } = await supabase
          .from('product_locations')
          .select('location_id')
          .eq('product_id', existingProduct.id);
        if (data && data.length > 0) {
          setSelectedLocationIds(data.map(pl => pl.location_id));
        } else if (existingProduct.location_id) {
          // Fallback to legacy location_id
          setSelectedLocationIds([existingProduct.location_id]);
        }
      };
      loadProductLocations();

      // Reverse-engineer pricing from ACTIVE rental plans only
      const activePlans = (existingProduct.rental_plans || []).filter(
        (p: any) => p.is_active !== false
      );
      if (activePlans.length) {
        const plans = [...activePlans].sort(
          (a: any, b: any) => a.duration_months - b.duration_months
        );
        const firstPlan = plans[0];
        const lastPlan = plans[plans.length - 1];

        const baseRent = firstPlan.monthly_rent;
        const maxDur = lastPlan.duration_months;
        
        // Calculate discount % per month from first and last plan
        let discountPerMonth = 0;
        if (plans.length > 1 && baseRent > 0 && maxDur > 1) {
          const totalDiscountPercent = ((baseRent - lastPlan.monthly_rent) / baseRent) * 100;
          discountPerMonth = Math.round((totalDiscountPercent / (maxDur - 1)) * 10) / 10;
        }

        setPricing({
          baseMonthlyRent: baseRent,
          deliveryFee: firstPlan.delivery_fee || 500,
          installationFee: firstPlan.installation_fee || 0,
          maxDuration: maxDur,
          discountPerMonth: Math.max(0, discountPerMonth),
        });

        // Load variations
        const existingVariations = ((existingProduct as any).product_variations || [])
          .filter((v: any) => v.is_active !== false)
          .map((v: any) => ({
            variation_type: v.variation_type,
            variation_value: v.variation_value,
            price_adjustment: v.price_adjustment || 0,
          }));
        if (existingVariations.length > 0) setVariations(existingVariations);
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
  // Deposit = monthly rent for that plan (auto-calculated)
  const generateRentalPlans = (productIdForPlans: string) => {
    if (pricingMode === 'manual') {
      // Manual mode: create a plan for each month the vendor defined
      const entries = Object.entries(manualSlabs)
        .map(([m, p]) => ({ month: Number(m), price: Number(p) }))
        .filter(e => e.price > 0)
        .sort((a, b) => a.month - b.month);
      
      return entries.map(({ month, price }) => ({
        product_id: productIdForPlans,
        label: `${month} ${month === 1 ? 'Month' : 'Months'}`,
        duration_months: month,
        monthly_rent: price,
        security_deposit: price, // Deposit = monthly rent for this plan
        delivery_fee: pricing.deliveryFee,
        installation_fee: pricing.installationFee,
      }));
    }

    // Auto mode: existing logic
    const plans = [];
    const baseRent = pricing.baseMonthlyRent;
    plans.push({
      product_id: productIdForPlans,
      label: '1 Month',
      duration_months: 1,
      monthly_rent: baseRent,
      security_deposit: baseRent,
      delivery_fee: pricing.deliveryFee,
      installation_fee: pricing.installationFee,
    });
    if (pricing.maxDuration > 1) {
      const maxRent = getPriceForMonth(pricing.maxDuration);
      plans.push({
        product_id: productIdForPlans,
        label: `${pricing.maxDuration} Months`,
        duration_months: pricing.maxDuration,
        monthly_rent: maxRent,
        security_deposit: maxRent,
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
          location_id: selectedLocationIds[0] || null, // Keep first location for backward compatibility
          features: formData.features.filter(f => f.trim()),
          images: formData.images.filter(i => i.trim()),
          specifications: formData.specifications,
          tags: formData.tags.filter(t => t.trim()),
          in_stock: formData.in_stock,
          stock_quantity: formData.stock_quantity,
          status: 'pending',
          buy_price: formData.buy_price ? Number(formData.buy_price) : null,
          advance_discount_percent: formData.advance_discount_percent ? Number(formData.advance_discount_percent) : 0,
          delivery_tat: formData.delivery_tat,
          installation_tat: formData.installation_tat,
        } as any)
        .select()
        .single();

      if (productError) throw productError;

      const plans = generateRentalPlans(product.id);
      const { error: plansError } = await supabase.from('rental_plans').insert(plans);
      if (plansError) throw plansError;

      // Save variations
      if (variations.length > 0) {
        const varRows = variations.filter(v => v.variation_type && v.variation_value).map((v, i) => ({
          product_id: product.id,
          variation_type: v.variation_type,
          variation_value: v.variation_value,
          price_adjustment: v.price_adjustment || 0,
          display_order: i,
        }));
        if (varRows.length > 0) {
          const { error: varError } = await supabase.from('product_variations').insert(varRows);
          if (varError) throw varError;
        }
      }

      // Save product locations (many-to-many)
      if (selectedLocationIds.length > 0) {
        const locationRows = selectedLocationIds.map(locId => ({
          product_id: product.id,
          location_id: locId,
        }));
        const { error: locError } = await supabase.from('product_locations').insert(locationRows);
        if (locError) throw locError;
      }

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
        location_id: selectedLocationIds[0] || null, // Keep first location for backward compatibility
        features: formData.features.filter(f => f.trim()),
        images: formData.images.filter(i => i.trim()),
        specifications: formData.specifications,
        tags: formData.tags.filter(t => t.trim()),
        in_stock: formData.in_stock,
        stock_quantity: formData.stock_quantity,
        buy_price: formData.buy_price ? Number(formData.buy_price) : null,
        advance_discount_percent: formData.advance_discount_percent ? Number(formData.advance_discount_percent) : 0,
        delivery_tat: formData.delivery_tat,
        installation_tat: formData.installation_tat,
      };

      const { error: productError } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', productId)
        .eq('vendor_id', vendorProfile.id);

      if (productError) throw productError;

      // Soft-delete existing rental plans (deactivate) to preserve order references
      const { error: deactivateError } = await supabase
        .from('rental_plans')
        .update({ is_active: false })
        .eq('product_id', productId);
      if (deactivateError) throw deactivateError;

      const plans = generateRentalPlans(productId);
      const { error: plansError } = await supabase.from('rental_plans').insert(plans);
      if (plansError) throw plansError;

      // Deactivate old variations and insert new ones
      await supabase.from('product_variations').update({ is_active: false } as any).eq('product_id', productId);
      if (variations.length > 0) {
        const varRows = variations.filter(v => v.variation_type && v.variation_value).map((v, i) => ({
          product_id: productId,
          variation_type: v.variation_type,
          variation_value: v.variation_value,
          price_adjustment: v.price_adjustment || 0,
          display_order: i,
        }));
        if (varRows.length > 0) {
          const { error: varError } = await supabase.from('product_variations').insert(varRows);
          if (varError) throw varError;
        }
      }

      // Update product locations - delete old and insert new
      const { error: delLocError } = await supabase.from('product_locations').delete().eq('product_id', productId);
      if (delLocError) {
        console.error('[updateProduct] Failed to delete old locations:', delLocError);
        throw delLocError;
      }
      if (selectedLocationIds.length > 0) {
        const locationRows = selectedLocationIds.map(locId => ({
          product_id: productId,
          location_id: locId,
        }));
        const { error: insLocError } = await supabase.from('product_locations').insert(locationRows);
        if (insLocError) {
          console.error('[updateProduct] Failed to insert locations:', insLocError);
          throw insLocError;
        }
      }
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

    if (pricingMode === 'auto' && pricing.baseMonthlyRent <= 0) {
      toast.error('Base monthly rent is required');
      return;
    }

    if (pricingMode === 'manual') {
      const validSlabs = Object.values(manualSlabs).filter(p => p > 0);
      if (validSlabs.length === 0) {
        toast.error('Please enter at least one monthly price');
        return;
      }
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
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Service Locations *
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between font-normal">
                        {selectedLocationIds.length > 0
                          ? `${selectedLocationIds.length} location(s) selected`
                          : 'Select service locations'}
                        <MapPin className="h-4 w-4 ml-2 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-3" align="start">
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {locations?.map((loc) => (
                          <div key={loc.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`loc-${loc.id}`}
                              checked={selectedLocationIds.includes(loc.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedLocationIds([...selectedLocationIds, loc.id]);
                                } else {
                                  setSelectedLocationIds(selectedLocationIds.filter(id => id !== loc.id));
                                }
                              }}
                            />
                            <Label htmlFor={`loc-${loc.id}`} className="text-sm cursor-pointer font-normal">
                              {loc.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  {selectedLocationIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedLocationIds.map(id => {
                        const loc = locations?.find(l => l.id === id);
                        return loc ? (
                          <Badge key={id} variant="secondary" className="text-xs gap-1">
                            {loc.name}
                            <button
                              type="button"
                              onClick={() => setSelectedLocationIds(selectedLocationIds.filter(lid => lid !== id))}
                              className="ml-0.5 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
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
              <p className="text-sm text-muted-foreground">Add images via URL or upload directly</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.images.map((image, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={image}
                      onChange={(e) => {
                        const newImages = [...formData.images];
                        newImages[index] = e.target.value;
                        setFormData({ ...formData, images: newImages });
                      }}
                      placeholder="Image URL or upload below"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeImage(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {image && (
                    <img src={image} alt={`Preview ${index + 1}`} className="h-20 w-20 object-cover rounded border" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  )}
                </div>
              ))}
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={addImage}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add URL
                </Button>
                <label className="cursor-pointer">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Image
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (!files) return;
                          for (const file of Array.from(files)) {
                            const ext = file.name.split('.').pop();
                            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
                            const filePath = `products/${fileName}`;
                            toast.info(`Uploading ${file.name}...`);
                            const { error: uploadError } = await supabase.storage
                              .from('product-images')
                              .upload(filePath, file);
                            if (uploadError) {
                              toast.error(`Failed to upload ${file.name}`);
                              console.error(uploadError);
                              continue;
                            }
                            const { data: urlData } = supabase.storage
                              .from('product-images')
                              .getPublicUrl(filePath);
                            setFormData(prev => ({
                              ...prev,
                              images: [...prev.images.filter(i => i.trim()), urlData.publicUrl],
                            }));
                            toast.success(`${file.name} uploaded!`);
                          }
                          e.target.value = '';
                        }}
                      />
                    </span>
                  </Button>
                </label>
              </div>
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

              <div className="grid grid-cols-2 gap-4">
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

              {/* Auto-calculated deposit info */}
              {pricing.baseMonthlyRent > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg text-sm flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary shrink-0" />
                  <span>Security Deposit: <strong>₹{pricing.baseMonthlyRent.toLocaleString()}</strong> (auto-calculated = monthly rent)</span>
                </div>
              )}

              {/* Buy Price & Advance Discount */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Buy Price (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.buy_price}
                    onChange={(e) => setFormData({ ...formData, buy_price: e.target.value ? Number(e.target.value) : '' })}
                    placeholder="Leave empty if not for sale"
                  />
                  <p className="text-xs text-muted-foreground">Set if customers can also buy outright</p>
                </div>
                <div className="space-y-2">
                  <Label>Advance Payment Discount (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    step="0.5"
                    value={formData.advance_discount_percent}
                    onChange={(e) => setFormData({ ...formData, advance_discount_percent: e.target.value ? Number(e.target.value) : '' })}
                    placeholder="e.g., 10"
                  />
                  <p className="text-xs text-muted-foreground">Discount when customer pays all months upfront</p>
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

          {/* Delivery & Installation TAT */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery & Installation Time</CardTitle>
              <p className="text-sm text-muted-foreground">
                Specify turnaround time for delivery and installation
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Delivery TAT (days) *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.delivery_tat}
                    onChange={(e) => setFormData({ ...formData, delivery_tat: Number(e.target.value) || 1 })}
                    placeholder="2"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Installation TAT (days) *</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.installation_tat}
                    onChange={(e) => setFormData({ ...formData, installation_tat: Number(e.target.value) || 0 })}
                    placeholder="1"
                  />
                </div>
              </div>
              <div className="p-3 bg-accent/5 border border-accent/15 rounded-lg text-xs text-muted-foreground flex items-start gap-2">
                <Info className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                <span><strong>Tip:</strong> Faster delivery (less than 2 days) increases your chances of getting more orders.</span>
              </div>
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

          {/* Product Variations */}
          <Card>
            <CardHeader>
              <CardTitle>Product Variations (Optional)</CardTitle>
              <p className="text-sm text-muted-foreground">
                Add options like different models, sizes, or capacities (e.g., 1 Ton, 2 Ton for AC).
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {variations.map((v, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Input
                      value={v.variation_type}
                      onChange={(e) => {
                        const newVars = [...variations];
                        newVars[index] = { ...newVars[index], variation_type: e.target.value };
                        setVariations(newVars);
                      }}
                      placeholder="e.g., Model, Size, Capacity"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Value</Label>
                    <Input
                      value={v.variation_value}
                      onChange={(e) => {
                        const newVars = [...variations];
                        newVars[index] = { ...newVars[index], variation_value: e.target.value };
                        setVariations(newVars);
                      }}
                      placeholder="e.g., 1 Ton, 2 Ton"
                    />
                  </div>
                  <div className="w-32 space-y-1">
                    <Label className="text-xs">+₹/mo</Label>
                    <Input
                      type="number"
                      min="0"
                      value={v.price_adjustment || ''}
                      onChange={(e) => {
                        const newVars = [...variations];
                        newVars[index] = { ...newVars[index], price_adjustment: Number(e.target.value) || 0 };
                        setVariations(newVars);
                      }}
                      placeholder="0"
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setVariations(variations.filter((_, i) => i !== index))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setVariations([...variations, { variation_type: '', variation_value: '', price_adjustment: 0 }])}>
                <Plus className="h-4 w-4 mr-2" />
                Add Variation
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
