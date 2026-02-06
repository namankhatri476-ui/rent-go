import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { LocationProvider } from "@/contexts/LocationContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Public pages
import Index from "./pages/Index";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import MyOrders from "./pages/MyOrders";
import Auth from "./pages/Auth";
import HowItWorks from "./pages/HowItWorks";
import NotFound from "./pages/NotFound";

// Vendor pages
import VendorDashboard from "./pages/VendorDashboard";
import VendorRegister from "./pages/VendorRegister";
import VendorPending from "./pages/VendorPending";
import VendorRejected from "./pages/VendorRejected";
import VendorProducts from "./pages/vendor/VendorProducts";
import VendorProductForm from "./pages/vendor/VendorProductForm";
import VendorProductView from "./pages/vendor/VendorProductView";
import VendorOrders from "./pages/vendor/VendorOrders";
import VendorPayouts from "./pages/vendor/VendorPayouts";
import VendorSettings from "./pages/vendor/VendorSettings";

// Admin pages
import AdminDashboard from "./pages/AdminDashboard";
import AdminVendors from "./pages/admin/AdminVendors";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminPayouts from "./pages/admin/AdminPayouts";
import AdminReports from "./pages/admin/AdminReports";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminUsers from "./pages/admin/AdminUsers";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <LocationProvider>
            <CartProvider>
              <Toaster />
            <Sonner />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/products" element={<Products />} />
              <Route path="/product/:slug" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              
              {/* Protected checkout */}
              <Route
                path="/checkout"
                element={
                  <ProtectedRoute>
                    <Checkout />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/order-success"
                element={
                  <ProtectedRoute>
                    <OrderSuccess />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-orders"
                element={
                  <ProtectedRoute>
                    <MyOrders />
                  </ProtectedRoute>
                }
              />

              {/* Vendor routes */}
              <Route
                path="/vendor"
                element={
                  <ProtectedRoute requiredRoles={['vendor']} requireApprovedVendor>
                    <VendorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendor/products"
                element={
                  <ProtectedRoute requiredRoles={['vendor']} requireApprovedVendor>
                    <VendorProducts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendor/products/new"
                element={
                  <ProtectedRoute requiredRoles={['vendor']} requireApprovedVendor>
                    <VendorProductForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendor/products/:id"
                element={
                  <ProtectedRoute requiredRoles={['vendor']} requireApprovedVendor>
                    <VendorProductView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendor/products/:id/edit"
                element={
                  <ProtectedRoute requiredRoles={['vendor']} requireApprovedVendor>
                    <VendorProductForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendor/orders"
                element={
                  <ProtectedRoute requiredRoles={['vendor']} requireApprovedVendor>
                    <VendorOrders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendor/payouts"
                element={
                  <ProtectedRoute requiredRoles={['vendor']} requireApprovedVendor>
                    <VendorPayouts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendor/settings"
                element={
                  <ProtectedRoute requiredRoles={['vendor']} requireApprovedVendor>
                    <VendorSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendor/register"
                element={
                  <ProtectedRoute>
                    <VendorRegister />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendor/pending"
                element={
                  <ProtectedRoute requiredRoles={['vendor']}>
                    <VendorPending />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendor/rejected"
                element={
                  <ProtectedRoute requiredRoles={['vendor']}>
                    <VendorRejected />
                  </ProtectedRoute>
                }
              />

              {/* Admin routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/vendors"
                element={
                  <ProtectedRoute requiredRoles={['admin']}>
                    <AdminVendors />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/products"
                element={
                  <ProtectedRoute requiredRoles={['admin']}>
                    <AdminProducts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/categories"
                element={
                  <ProtectedRoute requiredRoles={['admin']}>
                    <AdminCategories />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/orders"
                element={
                  <ProtectedRoute requiredRoles={['admin']}>
                    <AdminOrders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/payouts"
                element={
                  <ProtectedRoute requiredRoles={['admin']}>
                    <AdminPayouts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute requiredRoles={['admin']}>
                    <AdminUsers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <ProtectedRoute requiredRoles={['admin']}>
                    <AdminReports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute requiredRoles={['admin']}>
                    <AdminSettings />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </CartProvider>
          </LocationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
