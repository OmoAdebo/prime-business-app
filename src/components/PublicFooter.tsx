import { Link } from "react-router-dom";
import { Mail, MapPin, Phone } from "lucide-react";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export function PublicFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">P</div>
              <span className="font-bold font-display text-foreground">{SITE_NAME}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              The all-in-one business management platform tailored to your industry — built for African SMEs.
            </p>
            <a href={SITE_URL} className="text-xs text-primary mt-3 inline-block hover:underline">
              {SITE_URL.replace("https://", "")}
            </a>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/#features" className="hover:text-primary transition-colors">Features</Link></li>
              <li><Link to="/#industries" className="hover:text-primary transition-colors">Industries</Link></li>
              <li><Link to="/pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
              <li><Link to="/signup" className="hover:text-primary transition-colors">Get Started</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-primary transition-colors">About</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
              <li><Link to="/about" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/about" className="hover:text-primary transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-primary" /> hello@getprime.app</li>
              <li className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-primary" /> +234 800 PRIME</li>
              <li className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-primary" /> Lagos, Nigeria</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
