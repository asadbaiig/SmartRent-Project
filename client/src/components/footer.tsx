import { Link } from "wouter";
import { Home, Facebook, Twitter, Linkedin, Instagram } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="md:col-span-1">
            <div className="flex items-center mb-4">
              <div className="h-8 w-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <Home className="text-white text-lg" />
              </div>
              <span className="ml-2 text-xl font-bold">SmartRent</span>
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
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="#" className="hover:text-white transition-colors" data-testid="link-how-it-works">How it Works</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors" data-testid="link-list-property">List Property</Link></li>
              <li><Link href="/properties" className="hover:text-white transition-colors" data-testid="link-find-property">Find Property</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors" data-testid="link-smart-contracts">Smart Contracts</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors" data-testid="link-pricing">Pricing</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="#" className="hover:text-white transition-colors" data-testid="link-help-center">Help Center</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors" data-testid="link-contact">Contact Us</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors" data-testid="link-dispute-resolution">Dispute Resolution</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors" data-testid="link-legal-compliance">Legal Compliance</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors" data-testid="link-trust-safety">Trust & Safety</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="#" className="hover:text-white transition-colors" data-testid="link-privacy">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors" data-testid="link-terms">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors" data-testid="link-cookies">Cookie Policy</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors" data-testid="link-gdpr">GDPR Compliance</Link></li>
            </ul>

            {/* Contact Info */}
            <div className="mt-6">
              <h5 className="text-white font-medium mb-2">Contact</h5>
              <p className="text-sm text-gray-400">+92 300 1234567</p>
              <p className="text-sm text-gray-400">support@smartrent.pk</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">© 2024 SmartRent. All rights reserved.</p>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <Badge className="text-xs bg-success-100 text-success-700">Verified Platform</Badge>
            <Badge className="text-xs bg-primary-100 text-primary-700">Blockchain Secured</Badge>
          </div>
        </div>
      </div>
    </footer>
  );
}
