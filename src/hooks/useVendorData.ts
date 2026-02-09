import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useVendorStats = () => {
  const { vendorProfile } = useAuth();

  return useQuery({
    queryKey: ['vendor-stats', vendorProfile?.id],
    enabled: !!vendorProfile?.id,
    queryFn: async () => {
      const vendorId = vendorProfile!.id;

      // Fetch products count
      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendorId);

      const { count: pendingProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendorId)
        .eq('status', 'pending');

      // Fetch orders count
      const { count: orderCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendorId);

      const { count: activeOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendorId)
        .in('status', ['confirmed', 'processing', 'shipped', 'delivered']);

      // Fetch earnings
      const { data: orders } = await supabase
        .from('orders')
        .select('vendor_payout')
        .eq('vendor_id', vendorId)
        .in('status', ['confirmed', 'delivered', 'processing', 'shipped']);

      const totalEarnings = orders?.reduce((sum, o) => sum + Number(o.vendor_payout), 0) || 0;

      // Fetch pending payouts
      const { data: payouts } = await supabase
        .from('vendor_payouts')
        .select('amount')
        .eq('vendor_id', vendorId)
        .eq('status', 'pending');

      const pendingPayouts = payouts?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      return {
        products: productCount || 0,
        pendingProducts: pendingProducts || 0,
        orders: orderCount || 0,
        activeOrders: activeOrders || 0,
        totalEarnings,
        pendingPayouts,
      };
    },
  });
};

export const useVendorProducts = () => {
  const { vendorProfile } = useAuth();

  return useQuery({
    queryKey: ['vendor-products', vendorProfile?.id],
    enabled: !!vendorProfile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories (name),
          rental_plans (*)
        `)
        .eq('vendor_id', vendorProfile!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

export const useVendorOrders = () => {
  const { vendorProfile } = useAuth();

  return useQuery({
    queryKey: ['vendor-orders', vendorProfile?.id],
    enabled: !!vendorProfile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          products (name, images),
          rental_plans!orders_rental_plan_id_fkey (label, duration_months, monthly_rent)
        `)
        .eq('vendor_id', vendorProfile!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

export const useVendorPayouts = () => {
  const { vendorProfile } = useAuth();

  return useQuery({
    queryKey: ['vendor-payouts', vendorProfile?.id],
    enabled: !!vendorProfile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_payouts')
        .select('*')
        .eq('vendor_id', vendorProfile!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};
