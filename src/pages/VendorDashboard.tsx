import { Building2, Package, ShoppingCart, TrendingUp, Plus, Clock, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const VendorDashboard = () => {
  const { profile, vendorProfile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-2xl font-bold text-primary">RentEase</Link>
            <span className="text-sm text-muted-foreground px-2 py-1 bg-muted rounded">Vendor Portal</span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {profile?.full_name || vendorProfile?.business_name}
            </span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">0 pending approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">0 new today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month's Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹0</div>
              <p className="text-xs text-muted-foreground">After 30% commission</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹0</div>
              <p className="text-xs text-muted-foreground">Next payout: --</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button asChild className="h-auto py-4 flex flex-col items-center gap-2">
                <Link to="/vendor/products/new">
                  <Plus className="h-6 w-6" />
                  <span>Add New Product</span>
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="h-auto py-4 flex flex-col items-center gap-2">
                <Link to="/vendor/products">
                  <Package className="h-6 w-6" />
                  <span>Manage Products</span>
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="h-auto py-4 flex flex-col items-center gap-2">
                <Link to="/vendor/orders">
                  <ShoppingCart className="h-6 w-6" />
                  <span>View Orders</span>
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="h-auto py-4 flex flex-col items-center gap-2">
                <Link to="/vendor/payouts">
                  <TrendingUp className="h-6 w-6" />
                  <span>Payouts & Reports</span>
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Business Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Account Verified</p>
                  <p className="text-sm text-muted-foreground">Your vendor account is active</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Commission Rate</p>
                  <p className="text-sm text-muted-foreground">30% platform fee</p>
                </div>
              </div>
              
              <Button variant="outline" size="sm" asChild className="w-full mt-4">
                <Link to="/vendor/settings">Edit Business Profile</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/vendor/orders">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No orders yet</p>
              <p className="text-sm">Orders will appear here once customers start renting your products.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VendorDashboard;
