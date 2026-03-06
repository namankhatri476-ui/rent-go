import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Trash2, ArrowUp, ArrowDown, Loader2, Image, Upload } from 'lucide-react';

const AdminSlider = () => {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [newSlide, setNewSlide] = useState({
    title: '',
    subtitle: '',
    cta_text: 'Browse Products',
    cta_link: '/products',
    image_url: '',
  });

  const { data: slides, isLoading } = useQuery({
    queryKey: ['admin-slider-images'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('slider_images')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `slider-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('slider-images')
        .upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('slider-images')
        .getPublicUrl(fileName);
      return publicUrl;
    } finally {
      setUploading(false);
    }
  };

  const invalidateSliders = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-slider-images'] });
    queryClient.invalidateQueries({ queryKey: ['slider-images'] });
  };

  const addSlideMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      const maxOrder = slides?.length ? Math.max(...slides.map(s => s.display_order)) + 1 : 0;
      const { error } = await supabase.from('slider_images').insert({
        image_url: imageUrl,
        title: newSlide.title || null,
        subtitle: newSlide.subtitle || null,
        cta_text: newSlide.cta_text,
        cta_link: newSlide.cta_link,
        display_order: maxOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateSliders();
      setNewSlide({ title: '', subtitle: '', cta_text: 'Browse Products', cta_link: '/products', image_url: '' });
      toast.success('Slide added');
    },
    onError: () => toast.error('Failed to add slide'),
  });

  const deleteSlideMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('slider_images').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateSliders();
      toast.success('Slide removed');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('slider_images').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateSliders(),
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: 'up' | 'down' }) => {
      if (!slides) return;
      const idx = slides.findIndex(s => s.id === id);
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= slides.length) return;

      const currentOrder = slides[idx].display_order;
      const swapOrder = slides[swapIdx].display_order;

      await supabase.from('slider_images').update({ display_order: swapOrder }).eq('id', slides[idx].id);
      await supabase.from('slider_images').update({ display_order: currentOrder }).eq('id', slides[swapIdx].id);
    },
    onSuccess: () => invalidateSliders(),
  });

  const updateMobileImage = async (slideId: string, mobileUrl: string | null) => {
    const { error } = await supabase
      .from('slider_images')
      .update({ mobile_image_url: mobileUrl })
      .eq('id', slideId);
    if (error) {
      toast.error('Failed to update mobile image');
      throw error;
    }
    invalidateSliders();
    toast.success('Mobile image updated');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5MB');
      return;
    }
    try {
      const url = await uploadImage(file);
      addSlideMutation.mutate(url);
    } catch {
      toast.error('Upload failed');
    }
  };

  const handleUrlAdd = () => {
    if (!newSlide.image_url) {
      toast.error('Please enter an image URL');
      return;
    }
    addSlideMutation.mutate(newSlide.image_url);
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Slider Management</h1>
          <p className="text-muted-foreground">Manage homepage slider images</p>
        </div>

        {/* Add New Slide */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Add New Slide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title (optional)</Label>
                <Input value={newSlide.title} onChange={e => setNewSlide({ ...newSlide, title: e.target.value })} placeholder="Slide title" />
              </div>
              <div className="space-y-2">
                <Label>Subtitle (optional)</Label>
                <Input value={newSlide.subtitle} onChange={e => setNewSlide({ ...newSlide, subtitle: e.target.value })} placeholder="Slide subtitle" />
              </div>
              <div className="space-y-2">
                <Label>Button Text</Label>
                <Input value={newSlide.cta_text} onChange={e => setNewSlide({ ...newSlide, cta_text: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Button Link</Label>
                <Input value={newSlide.cta_link} onChange={e => setNewSlide({ ...newSlide, cta_link: e.target.value })} />
              </div>
            </div>

            <div className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label>Image URL</Label>
                <Input value={newSlide.image_url} onChange={e => setNewSlide({ ...newSlide, image_url: e.target.value })} placeholder="https://..." />
              </div>
              <Button onClick={handleUrlAdd} disabled={addSlideMutation.isPending}>
                <Plus className="h-4 w-4 mr-2" /> Add via URL
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">— or —</span>
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                <Button asChild variant="outline" disabled={uploading}>
                  <span>
                    {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                    Upload Image
                  </span>
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Existing Slides */}
        <Card>
          <CardHeader>
            <CardTitle>Current Slides ({slides?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
            ) : slides?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No slider images yet. Add one above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {slides?.map((slide, index) => (
                  <div key={slide.id} className="flex flex-col gap-3 p-4 border border-border rounded-xl bg-card">
                    <div className="flex items-center gap-4">
                      <div className="flex gap-2 shrink-0">
                        <div className="text-center">
                          <img src={slide.image_url} alt={slide.title || 'Desktop'} className="w-24 h-14 object-cover rounded-lg" />
                          <span className="text-[10px] text-muted-foreground">Desktop</span>
                        </div>
                        <div className="text-center">
                          <img src={slide.mobile_image_url || slide.image_url} alt={slide.title || 'Mobile'} className="w-14 h-14 object-cover rounded-lg border border-dashed border-muted-foreground/30" />
                          <span className="text-[10px] text-muted-foreground">Mobile</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{slide.title || '(No title)'}</p>
                        <p className="text-xs text-muted-foreground truncate">{slide.subtitle || '(No subtitle)'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={slide.is_active}
                          onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: slide.id, is_active: checked })}
                        />
                        <Button variant="ghost" size="icon" disabled={index === 0} onClick={() => reorderMutation.mutate({ id: slide.id, direction: 'up' })}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" disabled={index === (slides?.length || 0) - 1} onClick={() => reorderMutation.mutate({ id: slide.id, direction: 'down' })}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteSlideMutation.mutate(slide.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {/* Mobile image upload */}
                    <div className="flex items-center gap-3 pl-2">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Mobile Image:</span>
                      <Input
                        className="h-8 text-xs flex-1"
                        placeholder="Mobile image URL (optional, falls back to desktop)"
                        defaultValue={slide.mobile_image_url || ''}
                        key={slide.mobile_image_url || 'empty'}
                        onBlur={async (e) => {
                          const val = e.target.value.trim() || null;
                          if (val !== (slide.mobile_image_url || null)) {
                            await updateMobileImage(slide.id, val);
                          }
                        }}
                      />
                      <label className="cursor-pointer shrink-0">
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return; }
                          try {
                            const url = await uploadImage(file);
                            await updateMobileImage(slide.id, url);
                          } catch { toast.error('Upload failed'); }
                        }} />
                        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                          <span><Upload className="h-3 w-3 mr-1" /> Upload</span>
                        </Button>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSlider;
