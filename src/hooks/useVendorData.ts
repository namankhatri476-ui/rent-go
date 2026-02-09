import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useVendorStats = () => {
  const { vendorProfile } = useAuth();

  return useQuery({
    queryKey: ['vendor-stats', vendorProfile?.id],
    enabled: !!vendorProfile?.id,
    queryFn: async () => {
      // NOTE: We rely on backend row-level access rules to scope data to the
      // currently authenticated vendor. This avoids "0 rows" issues when the
      // client-side vendor id doesn't match the stored order/vendor ids.

      // Fetch products count
      const { count: productCount, error: productCountError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      if (productCountError) throw productCountError;

      const { count: pendingProducts, error: pendingProductsError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (pendingProductsError) throw pendingProductsError;

      // Fetch orders count
      const { count: orderCount, error: orderCountError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      if (orderCountError) throw orderCountError;

      // "Active" = anything that is not cancelled/returned (includes pending)
      const { count: activeOrders, error: activeOrdersError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'confirmed', 'processing', 'shipped', 'delivered']);

      if (activeOrdersError) throw activeOrdersError;

      // Fetch earnings
      const { data: orders, error: earningsError } = await supabase
        .from('orders')
        .select('vendor_payout')
        .in('status', ['confirmed', 'delivered', 'processing', 'shipped']);

      if (earningsError) throw earningsError;

      const totalEarnings = orders?.reduce((sum, o) => sum + Number(o.vendor_payout), 0) || 0;

      // Fetch pending payouts
      const { data: payouts, error: payoutsError } = await supabase
        .from('vendor_payouts')
        .select('amount')
        .eq('status', 'pending');

      if (payoutsError) throw payoutsError;

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
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};
