import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { printerProducts } from "@/data/products";
import { Badge } from "@/components/ui/badge";
import { Filter, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

const Products = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* Page Header */}
      <section className="py-8 border-b border-border bg-muted/30">
        <div className="container mx-auto px-4">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <span>/</span>
            <span className="text-foreground">Printers</span>
          </nav>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Printers on Rent
              </h1>
              <p className="text-muted-foreground mt-1">
                {printerProducts.length} products available
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                Filter
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                Sort
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Tags */}
      <section className="py-4 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <Badge variant="default" className="cursor-pointer whitespace-nowrap">
              All Brands
            </Badge>
            <Badge variant="outline" className="cursor-pointer whitespace-nowrap hover:bg-secondary">
              HP
            </Badge>
            <Badge variant="outline" className="cursor-pointer whitespace-nowrap hover:bg-secondary">
              Epson
            </Badge>
            <Badge variant="outline" className="cursor-pointer whitespace-nowrap hover:bg-secondary">
              Canon
            </Badge>
            <Badge variant="outline" className="cursor-pointer whitespace-nowrap hover:bg-secondary">
              Brother
            </Badge>
            <Badge variant="outline" className="cursor-pointer whitespace-nowrap hover:bg-secondary">
              Wireless
            </Badge>
            <Badge variant="outline" className="cursor-pointer whitespace-nowrap hover:bg-secondary">
              Ink Tank
            </Badge>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-8 flex-1">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {printerProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Products;
