import { Link } from "wouter";
import { Facebook, Twitter, Linkedin, Instagram } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Footer() {
  return (
    <footer className="bg-[#4d4352] text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-1">
            <div className="flex items-center mb-4">
              <img 
                src="/uploads/logo.png" 
                alt="SmartRent Logo" 
                className="h-24 w-auto object-contain brightness-0 invert"
              />
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Pakistan's first blockchain-powered rental platform. Secure, transparent, and intelligent property rentals.
            </p>
            <div className="flex space-x-4">
              <Link href="#" className="text-gray-400 hover:text-white transition-colors" data-testid="link-facebook">
                <Facebook className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-gray-400 hover:text-white transition-colors" data-testid="link-twitter">
                <Twitter className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-gray-400 hover:text-white transition-colors" data-testid="link-linkedin">
                <Linkedin className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-gray-400 hover:text-white transition-colors" data-testid="link-instagram">
                <Instagram className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-white font-semibold mb-4">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-gray-400 hover:text-white transition-colors" data-testid="link-how-it-works">
                  How it Works
                </Link>
              </li>
              <li>
                <Link href="/list-property" className="text-gray-400 hover:text-white transition-colors" data-testid="link-list-property">
                  List Property
                </Link>
              </li>
              <li>
                <Link href="/properties" className="text-gray-400 hover:text-white transition-colors" data-testid="link-find-property">
                  Find Property
                </Link>
              </li>
              <li>
                <Link href="/contracts" className="text-gray-400 hover:text-white transition-colors" data-testid="link-smart-contracts">
                  Smart Contracts
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-gray-400 hover:text-white transition-colors" data-testid="link-help-center">
                  Help Center
                </Link>
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
                <Link href="/" className="text-gray-400 hover:text-white transition-colors" data-testid="link-trust-safety">
                  Trust & Safety
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-gray-400 hover:text-white transition-colors" data-testid="link-privacy">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/" className="text-gray-400 hover:text-white transition-colors" data-testid="link-terms">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/" className="text-gray-400 hover:text-white transition-colors" data-testid="link-cookies">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-sm">© 2025 SmartRent. All rights reserved.</p>
          <div className="flex items-center space-x-4">
            <Badge className="text-xs bg-accent/20 text-accent border-accent/30">Verified Platform</Badge>
            <Badge className="text-xs bg-primary-500/30 text-white border-primary-400/50">Blockchain Secured</Badge>
          </div>
        </div>
      </div>
    </footer>
  );
}
