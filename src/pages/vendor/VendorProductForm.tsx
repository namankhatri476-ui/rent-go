import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Plus, Trash2, ArrowLeft } from 'lucide-react';

interface RentalPlan {
  label: string;
  duration_months: number;
  monthly_rent: number;
  security_deposit: number;
  delivery_fee: number;
  installation_fee: number;
}

const VendorProductForm = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { vendorProfile } = useAuth();

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
  });

  const [rentalPlans, setRentalPlans] = useState<RentalPlan[]>([
    { label: '3 Months', duration_months: 3, monthly_rent: 0, security_deposit: 0, delivery_fee: 500, installation_fee: 0 },
    { label: '6 Months', duration_months: 6, monthly_rent: 0, security_deposit: 0, delivery_fee: 500, installation_fee: 0 },
    { label: '12 Months', duration_months: 12, monthly_rent: 0, security_deposit: 0, delivery_fee: 0, installation_fee: 0 },
  ]);

  const [specKey, setSpecKey] = useState('');
  const [specValue, setSpecValue] = useState('');

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async () => {
      if (!vendorProfile?.id) throw new Error('Vendor profile not found');

      // Create product
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

      // Create rental plans
      const plansToInsert = rentalPlans
        .filter(p => p.monthly_rent > 0)
        .map(plan => ({
          product_id: product.id,
          ...plan,
        }));

      if (plansToInsert.length > 0) {
        const { error: plansError } = await supabase
          .from('rental_plans')
          .insert(plansToInsert);

        if (plansError) throw plansError;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('Product name is required');
      return;
    }

    if (!rentalPlans.some(p => p.monthly_rent > 0)) {
      toast.error('At least one rental plan with monthly rent is required');
      return;
    }

    createProductMutation.mutate();
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

  return (
    <VendorLayout>
      <div className="p-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate('/vendor/products')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Products
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">Add New Product</h1>
          <p className="text-muted-foreground">Create a new rental product listing</p>
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
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="auto-generated if empty"
                  />
                </div>
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeImage(index)}
                  >
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFeature(index)}
                  >
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="ml-auto"
                    onClick={() => removeSpec(key)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={specKey}
                  onChange={(e) => setSpecKey(e.target.value)}
                  placeholder="Spec name (e.g., Print Speed)"
                />
                <Input
                  value={specValue}
                  onChange={(e) => setSpecValue(e.target.value)}
                  placeholder="Value (e.g., 40 ppm)"
                />
                <Button type="button" variant="outline" onClick={addSpec}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Rental Plans */}
          <Card>
            <CardHeader>
              <CardTitle>Rental Plans *</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {rentalPlans.map((plan, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{plan.label}</h4>
                    <span className="text-sm text-muted-foreground">{plan.duration_months} months</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Monthly Rent (₹) *</Label>
                      <Input
                        type="number"
                        min="0"
                        value={plan.monthly_rent}
                        onChange={(e) => {
                          const newPlans = [...rentalPlans];
                          newPlans[index].monthly_rent = Number(e.target.value);
                          setRentalPlans(newPlans);
                        }}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Security Deposit (₹)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={plan.security_deposit}
                        onChange={(e) => {
                          const newPlans = [...rentalPlans];
                          newPlans[index].security_deposit = Number(e.target.value);
                          setRentalPlans(newPlans);
                        }}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Delivery Fee (₹)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={plan.delivery_fee}
                        onChange={(e) => {
                          const newPlans = [...rentalPlans];
                          newPlans[index].delivery_fee = Number(e.target.value);
                          setRentalPlans(newPlans);
                        }}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Installation Fee (₹)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={plan.installation_fee}
                        onChange={(e) => {
                          const newPlans = [...rentalPlans];
                          newPlans[index].installation_fee = Number(e.target.value);
                          setRentalPlans(newPlans);
                        }}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              ))}
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
                  <div key={index} className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
                    <Input
                      value={tag}
                      onChange={(e) => {
                        const newTags = [...formData.tags];
                        newTags[index] = e.target.value;
                        setFormData({ ...formData, tags: newTags });
                      }}
                      placeholder="Tag"
                      className="h-6 w-24 text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeTag(index)}
                    >
                      <Trash2 className="h-3 w-3" />
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
            <Button type="button" variant="outline" onClick={() => navigate('/vendor/products')}>
              Cancel
            </Button>
            <Button type="submit" disabled={createProductMutation.isPending}>
              {createProductMutation.isPending ? 'Creating...' : 'Create Product'}
            </Button>
          </div>
        </form>
      </div>
    </VendorLayout>
  );
};

export default VendorProductForm;
