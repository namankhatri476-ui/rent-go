import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';

const AdminFooter = () => {
  const queryClient = useQueryClient();

  const { data: footerData, isLoading } = useQuery({
    queryKey: ['admin-footer-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('footer_settings').select('*');
      if (error) throw error;
      const map: Record<string, any> = {};
      data?.forEach(row => { map[row.key] = row.value; });
      return map;
    },
  });

  const [brand, setBrand] = useState({ name: '', description: '' });
  const [contact, setContact] = useState({ address: '', phone: '', email: '' });
  const [copyright, setCopyright] = useState('');

  useEffect(() => {
    if (footerData) {
      setBrand(footerData.brand || { name: 'RentPR', description: '' });
      setContact(footerData.contact || { address: '', phone: '', email: '' });
      setCopyright(footerData.legal?.copyright || '© {year} RentPR. All rights reserved.');
    }
  }, [footerData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = [
        { key: 'brand', value: brand },
        { key: 'contact', value: contact },
        { key: 'legal', value: { ...footerData?.legal, copyright } },
      ];
      for (const u of updates) {
        const { error } = await supabase
          .from('footer_settings')
          .update({ value: u.value })
          .eq('key', u.key);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-footer-settings'] });
      queryClient.invalidateQueries({ queryKey: ['footer-settings'] });
      toast.success('Footer settings saved!');
    },
    onError: () => toast.error('Failed to save footer settings'),
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Footer Settings</h1>
            <p className="text-muted-foreground">Manage your website footer content</p>
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader><CardTitle>Brand</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Brand Name</Label>
                <Input value={brand.name} onChange={e => setBrand({ ...brand, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Brand Description</Label>
                <Textarea value={brand.description} onChange={e => setBrand({ ...brand, description: e.target.value })} rows={3} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={contact.address} onChange={e => setContact({ ...contact, address: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={contact.phone} onChange={e => setContact({ ...contact, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={contact.email} onChange={e => setContact({ ...contact, email: e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Copyright Text</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Copyright (use {'{year}'} for dynamic year)</Label>
                <Input value={copyright} onChange={e => setCopyright(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminFooter;
