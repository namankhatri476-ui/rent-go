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
import { Plus, Trash2, ArrowUp, ArrowDown, Loader2, Monitor, Smartphone, Upload, Pencil, Check, X, Link as LinkIcon } from 'lucide-react';

const AdminSlider = () => {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<string | null>(null);
  const [linkValues, setLinkValues] = useState<Record<string, { cta_text: string; cta_link: string }>>({});

  const [newSlide, setNewSlide] = useState({
    title: '',
    subtitle: '',
    cta_text: 'Browse Products',
    cta_link: '/products',
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
  };

  const invalidateSliders = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-slider-images'] });
    queryClient.invalidateQueries({ queryKey: ['slider-images'] });
  };

  const addSlideMutation = useMutation({
    mutationFn: async ({ desktopUrl, mobileUrl }: { desktopUrl: string; mobileUrl?: string }) => {
      const maxOrder = slides?.length ? Math.max(...slides.map(s => s.display_order)) + 1 : 0;
      const { error } = await supabase.from('slider_images').insert({
        image_url: desktopUrl,
        mobile_image_url: mobileUrl || null,
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
      setNewSlide({ title: '', subtitle: '', cta_text: 'Browse Products', cta_link: '/products' });
      toast.success('Slide added');
    },
    onError: () => toast.error('Failed to add slide'),
  });

  const deleteSlideMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('slider_images').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateSliders(); toast.success('Slide removed'); },
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

  const updateImageMutation = useMutation({
    mutationFn: async ({ id, field, url }: { id: string; field: 'image_url' | 'mobile_image_url'; url: string }) => {
      const { error } = await supabase.from('slider_images').update({ [field]: url }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateSliders(); toast.success('Image updated'); },
    onError: () => toast.error('Failed to update image'),
  });

  const updateLinksMutation = useMutation({
    mutationFn: async ({ id, cta_text, cta_link }: { id: string; cta_text: string; cta_link: string }) => {
      const { error } = await supabase.from('slider_images').update({ cta_text, cta_link }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateSliders(); setEditingLink(null); toast.success('Links updated'); },
    onError: () => toast.error('Failed to update links'),
  });

  const handleFileUpload = async (file: File, slideId: string, field: 'image_url' | 'mobile_image_url') => {
    if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return; }
    setUploading(`${slideId}-${field}`);
    try {
      const url = await uploadImage(file);
      await updateImageMutation.mutateAsync({ id: slideId, field, url });
    } catch { toast.error('Upload failed'); }
    finally { setUploading(null); }
  };

  const handleNewSlideUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return; }
    setUploading('new');
    try {
      const url = await uploadImage(file);
      addSlideMutation.mutate({ desktopUrl: url });
    } catch { toast.error('Upload failed'); }
    finally { setUploading(null); }
  };

  const startEditingLink = (slide: NonNullable<typeof slides>[0]) => {
    setEditingLink(slide.id);
    setLinkValues(prev => ({
      ...prev,
      [slide.id]: { cta_text: slide.cta_text || '', cta_link: slide.cta_link || '' },
    }));
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Slider Management</h1>
          <p className="text-muted-foreground text-sm">Manage desktop & mobile homepage banners separately</p>
        </div>

        {/* Add New Slide */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg"><Plus className="h-5 w-5" /> Add New Slide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Title (optional)</Label>
                <Input value={newSlide.title} onChange={e => setNewSlide({ ...newSlide, title: e.target.value })} placeholder="Slide title" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Subtitle (optional)</Label>
                <Input value={newSlide.subtitle} onChange={e => setNewSlide({ ...newSlide, subtitle: e.target.value })} placeholder="Slide subtitle" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Button Text</Label>
                <Input value={newSlide.cta_text} onChange={e => setNewSlide({ ...newSlide, cta_text: e.target.value })} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Button Link</Label>
                <Input value={newSlide.cta_link} onChange={e => setNewSlide({ ...newSlide, cta_link: e.target.value })} className="h-9" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handleNewSlideUpload} />
                <Button asChild variant="default" disabled={uploading === 'new'}>
                  <span>
                    {uploading === 'new' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                    Upload Desktop Image & Add Slide
                  </span>
                </Button>
              </label>
              <span className="text-xs text-muted-foreground">You can add the mobile image after creating the slide</span>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : !slides?.length ? (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              <Monitor className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>No slides yet. Add one above to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Desktop Images Grid */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Monitor className="h-5 w-5" /> Desktop Banners
                </CardTitle>
                <p className="text-xs text-muted-foreground">Recommended: 1920×600px or 16:5 ratio</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {slides.map((slide, index) => (
                  <div key={slide.id} className={`relative rounded-xl border overflow-hidden ${slide.is_active ? 'border-primary/30 bg-card' : 'border-border bg-muted/30 opacity-60'}`}>
                    <div className="relative aspect-[16/5] bg-muted">
                      <img src={slide.image_url} alt={slide.title || `Slide ${index + 1}`} className="w-full h-full object-cover" />
                      {!slide.is_active && (
                        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                          <span className="text-xs font-medium bg-muted px-2 py-1 rounded">Inactive</span>
                        </div>
                      )}
                      {/* Replace image button */}
                      <label className="absolute top-2 right-2 cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, slide.id, 'image_url');
                        }} />
                        <Button asChild size="sm" variant="secondary" className="h-7 text-xs shadow-md">
                          <span>
                            {uploading === `${slide.id}-image_url` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                            Replace
                          </span>
                        </Button>
                      </label>
                    </div>
                    <div className="p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{slide.title || `Slide ${index + 1}`}</p>
                        {editingLink === slide.id ? (
                          <div className="flex items-center gap-1.5 mt-1">
                            <Input className="h-7 text-xs flex-1" placeholder="Button text" value={linkValues[slide.id]?.cta_text || ''} onChange={e => setLinkValues(prev => ({ ...prev, [slide.id]: { ...prev[slide.id], cta_text: e.target.value } }))} />
                            <Input className="h-7 text-xs flex-1" placeholder="/link" value={linkValues[slide.id]?.cta_link || ''} onChange={e => setLinkValues(prev => ({ ...prev, [slide.id]: { ...prev[slide.id], cta_link: e.target.value } }))} />
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => updateLinksMutation.mutate({ id: slide.id, ...linkValues[slide.id] })}><Check className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingLink(null)}><X className="h-3.5 w-3.5" /></Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 mt-0.5">
                            <LinkIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-xs text-muted-foreground truncate">{slide.cta_text} → {slide.cta_link}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => startEditingLink(slide)}><Pencil className="h-3 w-3" /></Button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Switch checked={slide.is_active} onCheckedChange={checked => toggleActiveMutation.mutate({ id: slide.id, is_active: checked })} />
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={index === 0} onClick={() => reorderMutation.mutate({ id: slide.id, direction: 'up' })}><ArrowUp className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={index === slides.length - 1} onClick={() => reorderMutation.mutate({ id: slide.id, direction: 'down' })}><ArrowDown className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteSlideMutation.mutate(slide.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Mobile Images Grid */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Smartphone className="h-5 w-5" /> Mobile Banners
                </CardTitle>
                <p className="text-xs text-muted-foreground">Recommended: 800×600px or 4:3 ratio. Falls back to desktop if empty.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {slides.map((slide, index) => (
                  <div key={slide.id} className={`relative rounded-xl border overflow-hidden ${slide.is_active ? 'border-primary/30 bg-card' : 'border-border bg-muted/30 opacity-60'}`}>
                    <div className="relative aspect-[4/3] bg-muted">
                      {slide.mobile_image_url ? (
                        <img src={slide.mobile_image_url} alt={`Mobile - ${slide.title || `Slide ${index + 1}`}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                          <Smartphone className="h-8 w-8 opacity-30" />
                          <span className="text-xs">No mobile image — using desktop</span>
                        </div>
                      )}
                      {!slide.is_active && (
                        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                          <span className="text-xs font-medium bg-muted px-2 py-1 rounded">Inactive</span>
                        </div>
                      )}
                      {/* Upload / Replace mobile image */}
                      <label className="absolute top-2 right-2 cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, slide.id, 'mobile_image_url');
                        }} />
                        <Button asChild size="sm" variant="secondary" className="h-7 text-xs shadow-md">
                          <span>
                            {uploading === `${slide.id}-mobile_image_url` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                            {slide.mobile_image_url ? 'Replace' : 'Upload'}
                          </span>
                        </Button>
                      </label>
                    </div>
                    <div className="p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{slide.title || `Slide ${index + 1}`}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <LinkIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">{slide.cta_text} → {slide.cta_link}</span>
                        </div>
                      </div>
                      {slide.mobile_image_url && (
                        <Button variant="ghost" size="sm" className="text-destructive text-xs h-7" onClick={() => updateImageMutation.mutate({ id: slide.id, field: 'mobile_image_url', url: '' })}>
                          <Trash2 className="h-3 w-3 mr-1" /> Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminSlider;
