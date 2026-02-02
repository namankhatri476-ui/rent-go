import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const VendorRegister = () => {
  const navigate = useNavigate();
  const { user, registerAsVendor, isVendor, vendorProfile, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    business_name: '',
    business_email: '',
    business_phone: '',
    business_address: '',
    gst_number: '',
    pan_number: '',
  });

  // Check for pending vendor registration from signup
  useEffect(() => {
    if (!user) return;

    // 1) Prefer sessionStorage (same-tab flow)
    const pendingData = sessionStorage.getItem('pendingVendorRegistration');
    if (pendingData) {
      const data = JSON.parse(pendingData);
      setFormData(prev => ({ ...prev, ...data }));
      sessionStorage.removeItem('pendingVendorRegistration');

      if (data.business_name && data.business_email) {
        handleAutoSubmit(data);
      }
      return;
    }

    // 2) Fallback to auth metadata (survives email verification/new tab)
    const metaData = (user.user_metadata as any)?.vendor_registration;
    if (metaData?.business_name && metaData?.business_email) {
      setFormData(prev => ({ ...prev, ...metaData }));
      handleAutoSubmit(metaData);
    }
  }, [user]);

  // Redirect if already a vendor
  useEffect(() => {
    if (isVendor && vendorProfile) {
      if (vendorProfile.status === 'approved') {
        navigate('/vendor');
      } else if (vendorProfile.status === 'pending') {
        navigate('/vendor/pending');
      } else if (vendorProfile.status === 'rejected') {
        navigate('/vendor/rejected');
      }
    }
  }, [isVendor, vendorProfile, navigate]);

  const handleAutoSubmit = async (data: typeof formData) => {
    setIsLoading(true);
    const { error } = await registerAsVendor(data);
    
    if (error) {
      toast.error(error.message || 'Failed to register as vendor');
    } else {
      toast.success('Vendor application submitted!');
      await refreshProfile();
      navigate('/vendor/pending');
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.business_name.trim() || !formData.business_email.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    const { error } = await registerAsVendor(formData);
    
    if (error) {
      toast.error(error.message || 'Failed to register as vendor');
    } else {
      toast.success('Vendor application submitted!');
      await refreshProfile();
      navigate('/vendor/pending');
    }
    setIsLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 py-12 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Become a Vendor</h1>
          <p className="text-muted-foreground mt-2">
            Start selling your rental products on RentEase
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-8 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="business_name">Business Name *</Label>
              <Input
                id="business_name"
                name="business_name"
                placeholder="Your Business Name"
                value={formData.business_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_email">Business Email *</Label>
              <Input
                id="business_email"
                name="business_email"
                type="email"
                placeholder="business@example.com"
                value={formData.business_email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_phone">Business Phone</Label>
              <Input
                id="business_phone"
                name="business_phone"
                placeholder="+91 9876543210"
                value={formData.business_phone}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_address">Business Address</Label>
              <Textarea
                id="business_address"
                name="business_address"
                placeholder="Full business address"
                value={formData.business_address}
                onChange={handleChange}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gst_number">GST Number</Label>
                <Input
                  id="gst_number"
                  name="gst_number"
                  placeholder="22AAAAA0000A1Z5"
                  value={formData.gst_number}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pan_number">PAN Number</Label>
                <Input
                  id="pan_number"
                  name="pan_number"
                  placeholder="ABCDE1234F"
                  value={formData.pan_number}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">What happens next?</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Our team will review your application (1-2 business days)</li>
                <li>Once approved, you can start listing products</li>
                <li>Platform commission is 30% on all rentals</li>
              </ul>
            </div>

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full gap-2"
              disabled={isLoading}
            >
              {isLoading ? 'Submitting...' : 'Submit Application'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VendorRegister;
