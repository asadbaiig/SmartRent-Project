import { Link } from "wouter";
import { Facebook, Twitter, Linkedin, Instagram } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Footer() {
  return (
    <footer className="bg-[#4d4352] text-white py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6 lg:gap-x-12 lg:gap-y-0 items-start">
          <div className="flex flex-col">
            <div className="flex items-center mb-2">
              <img
                src="/uploads/logo.png"
                alt="SmartRent"
                className="h-10 w-auto object-contain brightness-0 invert"
              />
            </div>
            <p className="text-gray-400 text-xs leading-snug mb-3 max-w-xs">
              Pakistan's first blockchain-powered rental platform. Secure, transparent, and intelligent property rentals.
            </p>
            <div className="flex gap-3">
              <Link href="#" className="text-gray-400 hover:text-white transition-colors" data-testid="link-facebook" aria-label="Facebook">
                <Facebook className="h-4 w-4" />
              </Link>
              <Link href="#" className="text-gray-400 hover:text-white transition-colors" data-testid="link-twitter" aria-label="Twitter">
                <Twitter className="h-4 w-4" />
              </Link>
              <Link href="#" className="text-gray-400 hover:text-white transition-colors" data-testid="link-linkedin" aria-label="LinkedIn">
                <Linkedin className="h-4 w-4" />
              </Link>
              <Link href="#" className="text-gray-400 hover:text-white transition-colors" data-testid="link-instagram" aria-label="Instagram">
                <Instagram className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="flex flex-col">
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-2">Platform</h4>
            <ul className="space-y-1.5 text-sm">
              <li>
                <Link href="/" className="text-gray-400 hover:text-white transition-colors" data-testid="link-how-it-works">How it Works</Link>
              </li>
              <li>
                <Link href="/list-property" className="text-gray-400 hover:text-white transition-colors" data-testid="link-list-property">List Property</Link>
              </li>
              <li>
                <Link href="/properties" className="text-gray-400 hover:text-white transition-colors" data-testid="link-find-property">Find Property</Link>
              </li>
              <li>
                <Link href="/contracts" className="text-gray-400 hover:text-white transition-colors" data-testid="link-smart-contracts">Smart Contracts</Link>
              </li>
            </ul>
          </div>

          <div className="flex flex-col">
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-2">Support</h4>
            <ul className="space-y-1.5 text-sm">
              <li>
                <Link href="/help" className="text-gray-400 hover:text-white transition-colors" data-testid="link-help-center">Help Center</Link>
              </li>
              <li>
                <a
                  href="mailto:support@smartrent.pk?subject=Contact%20Us&body=Phone:%20+92%20336%205447781"
                  className="text-gray-400 hover:text-white transition-colors"
                  data-testid="link-contact"
                >
                  Contact Us
                </a>
              </li>
              <li>
                <Link href="/trust-safety" className="text-gray-400 hover:text-white transition-colors" data-testid="link-trust-safety">Trust & Safety</Link>
              </li>
            </ul>
          </div>

          <div className="flex flex-col">
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-2">Legal</h4>
            <ul className="space-y-1.5 text-sm">
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors" data-testid="link-privacy">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-white transition-colors" data-testid="link-terms">Terms of Service</Link>
              </li>
              <li>
                <Link href="/cookies" className="text-gray-400 hover:text-white transition-colors" data-testid="link-cookies">Cookie Policy</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-600 mt-5 pt-4 flex flex-col sm:flex-row justify-between items-center gap-3 w-full">
          <p className="text-gray-400 text-xs order-2 sm:order-1">© 2025 SmartRent. All rights reserved.</p>
          <div className="flex items-center gap-2 order-1 sm:order-2">
            <Badge variant="outline" className="text-[10px] py-0 px-2 text-gray-300 border-gray-500 bg-transparent">
              Verified Platform
            </Badge>
            <Badge className="text-[10px] py-0 px-2 bg-white/15 text-white border-white/30">
              Blockchain Secured
            </Badge>
          </div>
        </div>
      </div>
    </footer>
  );
}
