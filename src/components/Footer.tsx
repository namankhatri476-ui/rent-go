import { Link } from "react-router-dom";
import { Printer, Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-[hsl(220,20%,12%)] text-white/70 mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <Printer className="w-[18px] h-[18px] text-primary-foreground" />
              </div>
              <span className="text-lg font-extrabold text-white">
                Rent<span className="text-primary">Ease</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed">
              India's trusted rental platform. Rent printers, electronics, and more with flexible plans and hassle-free delivery.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-white text-sm mb-4 uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2.5">
              {[
                { to: "/", label: "Home" },
                { to: "/products", label: "All Products" },
                { to: "/how-it-works", label: "How It Works" },
              ].map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-semibold text-white text-sm mb-4 uppercase tracking-wider">Categories</h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/products" className="text-sm hover:text-white transition-colors">
                  Printers
                </Link>
              </li>
              <li><span className="text-sm text-white/30">Electronics (Coming Soon)</span></li>
              <li><span className="text-sm text-white/30">Furniture (Coming Soon)</span></li>
              <li><span className="text-sm text-white/30">Appliances (Coming Soon)</span></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white text-sm mb-4 uppercase tracking-wider">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                <span className="text-sm">123 Business Hub, Mumbai, Maharashtra 400001</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 shrink-0" />
                <span className="text-sm">+91 98765 43210</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 shrink-0" />
                <span className="text-sm">hello@rentease.in</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} RentEase. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-white/40 hover:text-white/70 transition-colors">Privacy Policy</a>
            <a href="#" className="text-xs text-white/40 hover:text-white/70 transition-colors">Terms of Service</a>
            <a href="#" className="text-xs text-white/40 hover:text-white/70 transition-colors">Refund Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
