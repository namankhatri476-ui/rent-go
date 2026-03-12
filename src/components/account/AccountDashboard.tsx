import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface AccountDashboardProps {
  onNavigate: (tab: string) => void;
}

const AccountDashboard = ({ onNavigate }: AccountDashboardProps) => {
  const { user, profile } = useAuth();

  const { data: recentOrders } = useQuery({
    queryKey: ["my-recent-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, status, created_at, product:products(name)")
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const { data: defaultAddress } = useQuery({
    queryKey: ["my-default-address", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_default", true)
        .maybeSingle();
      return data;
    },
  });

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Hello, {profile?.full_name || "there"}! From your account dashboard you can view your recent orders, manage addresses, and update your account information.
        </p>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Orders</CardTitle>
          <button
            onClick={() => onNavigate("orders")}
            className="text-sm text-primary hover:underline font-medium"
          >
            View All
          </button>
        </CardHeader>
        <CardContent>
          {recentOrders && recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 font-medium text-muted-foreground">Order ID</th>
                    <th className="pb-2 font-medium text-muted-foreground">Date</th>
                    <th className="pb-2 font-medium text-muted-foreground">Status</th>
                    <th className="pb-2 font-medium text-muted-foreground">Product</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order: any) => (
                    <tr key={order.id} className="border-b border-border/50">
                      <td className="py-3 font-medium">{order.order_number}</td>
                      <td className="py-3 text-muted-foreground">
                        {format(new Date(order.created_at), "dd/MM/yyyy")}
                      </td>
                      <td className="py-3">
                        <Badge className={statusColors[order.status] || "bg-muted text-muted-foreground"}>
                          {order.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground truncate max-w-[200px]">
                        {order.product?.name || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No orders yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Account Info & Address */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Account Information</CardTitle>
            <button
              onClick={() => onNavigate("info")}
              className="text-sm text-primary hover:underline font-medium"
            >
              Edit
            </button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium text-foreground">{profile?.full_name || "—"}</p>
            <p className="text-muted-foreground">{profile?.email}</p>
            {profile?.phone && <p className="text-muted-foreground">T: {profile.phone}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Default Address</CardTitle>
            <button
              onClick={() => onNavigate("addresses")}
              className="text-sm text-primary hover:underline font-medium"
            >
              Manage
            </button>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {defaultAddress ? (
              <>
                <p className="font-medium text-foreground">{defaultAddress.full_name}</p>
                <p className="text-muted-foreground">{defaultAddress.address_line1}</p>
                {defaultAddress.address_line2 && (
                  <p className="text-muted-foreground">{defaultAddress.address_line2}</p>
                )}
                <p className="text-muted-foreground">
                  {defaultAddress.city}, {defaultAddress.state}, {defaultAddress.pincode}
                </p>
                {defaultAddress.phone && (
                  <p className="text-muted-foreground">T: {defaultAddress.phone}</p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">No default address set.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountDashboard;
