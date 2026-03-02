import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, User, Menu, X, Printer, Search, Building2, Shield, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/contexts/LocationContext";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import LocationSelector from "@/components/LocationSelector";

const Header = () => {
  const { itemCount } = useCart();
  const { user, profile, isVendor, isAdmin, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const { selectedLocation } = useLocation();

  // Search products
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['search-products', searchQuery, selectedLocation?.id],
    enabled: searchQuery.length >= 2,
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('id, name, slug, brand, images, location_id')
        .eq('status', 'approved')
        .or(`name.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%`);
      
      if (selectedLocation?.id) {
        query = query.eq('location_id', selectedLocation.id);
      }
      
      const { data, error } = await query.limit(10);
      if (error) throw error;
      return data;
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchOpen(false);
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  const handleProductClick = (slug: string) => {
    setSearchOpen(false);
    setSearchQuery("");
    navigate(`/product/${slug}`);
  };

  return (
    <>
      {/* Top announcement bar */}
      <div className="bg-primary text-primary-foreground text-xs py-1.5 text-center font-medium tracking-wide">
        Free Delivery & Installation on all orders • 100% Refundable Deposit
      </div>

      <header className="sticky top-0 z-50 bg-card border-b border-border/60 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-[60px]">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 shrink-0">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <Printer className="w-[18px] h-[18px] text-primary-foreground" />
              </div>
              <span className="text-lg font-extrabold tracking-tight text-foreground">
                Rent<span className="text-primary">Ease</span>
              </span>
            </Link>

            {/* Location Selector */}
            <div className="hidden md:block">
              <LocationSelector />
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              <Link to="/" className="px-3 py-2 text-sm font-medium text-foreground/70 hover:text-foreground rounded-md hover:bg-muted transition-colors">
                Home
              </Link>
              <Link to="/products" className="px-3 py-2 text-sm font-medium text-foreground/70 hover:text-foreground rounded-md hover:bg-muted transition-colors">
                Products
              </Link>
              <Link to="/how-it-works" className="px-3 py-2 text-sm font-medium text-foreground/70 hover:text-foreground rounded-md hover:bg-muted transition-colors">
                How It Works
              </Link>
            </nav>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-foreground/60 hover:text-foreground"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="w-[18px] h-[18px]" />
              </Button>
              <Link to="/cart" className="relative">
                <Button variant="ghost" size="icon" className="text-foreground/60 hover:text-foreground">
                  <ShoppingCart className="w-[18px] h-[18px]" />
                </Button>
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>
              
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1.5 ml-1 text-foreground/70 hover:text-foreground">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{profile?.full_name?.split(' ')[0] || 'Account'}</span>
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="flex items-center gap-2 cursor-pointer">
                          <Shield className="w-4 h-4" />
                          Admin Dashboard
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {isVendor && (
                      <DropdownMenuItem asChild>
                        <Link to="/vendor" className="flex items-center gap-2 cursor-pointer">
                          <Building2 className="w-4 h-4" />
                          Vendor Dashboard
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {!isVendor && (
                      <DropdownMenuItem asChild>
                        <Link to="/vendor/register" className="flex items-center gap-2 cursor-pointer">
                          <Building2 className="w-4 h-4" />
                          Become a Vendor
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link to="/my-orders" className="flex items-center gap-2 cursor-pointer">
                        <ShoppingCart className="w-4 h-4" />
                        My Orders
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={signOut}
                      className="flex items-center gap-2 cursor-pointer text-destructive"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link to="/auth">
                  <Button size="sm" className="ml-1 h-9 px-4 rounded-full">
                    Login / Register
                  </Button>
                </Link>
              )}
            </div>

            {/* Mobile Actions */}
            <div className="flex items-center gap-1 md:hidden">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-foreground/60"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="w-[18px] h-[18px]" />
              </Button>
              <Link to="/cart" className="relative">
                <Button variant="ghost" size="icon" className="text-foreground/60">
                  <ShoppingCart className="w-[18px] h-[18px]" />
                </Button>
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-border/50 animate-fade-in">
              <div className="mb-3">
                <LocationSelector />
              </div>
              <nav className="flex flex-col gap-1">
                <Link 
                  to="/" 
                  className="px-3 py-2.5 text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Home
                </Link>
                <Link 
                  to="/products" 
                  className="px-3 py-2.5 text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Products
                </Link>
                <Link 
                  to="/how-it-works" 
                  className="px-3 py-2.5 text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  How It Works
                </Link>
                
                <div className="border-t border-border/50 my-2" />
                
                {user ? (
                  <>
                    {isAdmin && (
                      <Link 
                        to="/admin" 
                        className="px-3 py-2.5 text-sm font-medium text-primary hover:bg-muted rounded-lg transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Admin Dashboard
                      </Link>
                    )}
                    {isVendor && (
                      <Link 
                        to="/vendor" 
                        className="px-3 py-2.5 text-sm font-medium text-primary hover:bg-muted rounded-lg transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Vendor Dashboard
                      </Link>
                    )}
                    {!isVendor && (
                      <Link 
                        to="/vendor/register" 
                        className="px-3 py-2.5 text-sm font-medium text-foreground/70 hover:bg-muted rounded-lg transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Become a Vendor
                      </Link>
                    )}
                    <button
                      className="px-3 py-2.5 text-sm font-medium text-destructive hover:bg-muted rounded-lg transition-colors text-left flex items-center gap-2"
                      onClick={() => {
                        signOut();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full rounded-full">
                      Login / Register
                    </Button>
                  </Link>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Search Dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">Search Products</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by product name or brand..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11 rounded-xl"
                autoFocus
              />
            </div>
            
            {/* Search Results */}
            {searchQuery.length >= 2 && (
              <div className="max-h-64 overflow-y-auto">
                {isSearching ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Searching...</p>
                ) : searchResults?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No products found</p>
                ) : (
                  <div className="space-y-1">
                    {searchResults?.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleProductClick(product.slug)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted transition-colors text-left"
                      >
                        {product.images?.[0] && (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-11 h-11 object-cover rounded-lg"
                          />
                        )}
                        <div>
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.brand}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" className="flex-1 rounded-xl">
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setSearchOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Header;
