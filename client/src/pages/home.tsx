import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SearchFilters } from "@/components/search-filters";
import { PropertyCard } from "@/components/property-card";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Shield, Bot, FileText, IdCard, Plus, Search, TrendingUp, Users, CheckCircle } from "lucide-react";

export default function Home() {
  const { user } = useAuth();

  // Fetch featured properties
  const { data: properties = [] } = useQuery({
    queryKey: ['/api/properties'],
    queryFn: async () => {
      const response = await fetch('/api/properties?limit=6');
      return response.json();
    },
  });

  const handleSearch = (filters: any) => {
    // Navigate to properties page with filters
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value as string);
    });
    window.location.href = `/properties?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-800 dark:to-gray-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                Pakistan's First <span className="text-primary-600">Blockchain-Powered</span> Rental Platform
              </h1>
              <p className="mt-6 text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                Secure, transparent, and AI-driven property rentals. Create smart contracts, get fair pricing, and manage rentals with complete trust and legal compliance.
              </p>
              
              {/* Key Features */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: Shield, text: "Blockchain Security" },
                  { icon: Bot, text: "AI Price Suggestions" },
                  { icon: FileText, text: "Smart Contracts" },
                  { icon: IdCard, text: "CNIC Verification" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-success-500 rounded-full flex items-center justify-center">
                      <Icon className="text-white h-3 w-3" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 text-sm">{text}</span>
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button asChild className="bg-primary-600 hover:bg-primary-700" data-testid="button-list-property">
                  <Link href={user?.role === 'landlord' ? "/dashboard" : "/register"}>
                    <Plus className="mr-2 h-4 w-4" />
                    List Your Property
                  </Link>
                </Button>
                <Button variant="outline" asChild data-testid="button-find-properties">
                  <Link href="/properties">
                    <Search className="mr-2 h-4 w-4" />
                    Find Properties
                  </Link>
                </Button>
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1280" 
                alt="Modern Pakistani apartment buildings and cityscape" 
                className="rounded-2xl shadow-2xl w-full h-auto" 
              />
              
              {/* Floating Stats Card */}
              <Card className="absolute -bottom-6 -left-6 bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">2.5K+</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Properties</div>
                    </div>
                    <div className="w-px h-12 bg-gray-200 dark:bg-gray-600"></div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">98%</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Success Rate</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Search Filters */}
      <SearchFilters onSearch={handleSearch} />

      {/* Featured Properties */}
      <section className="py-12 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Featured Properties</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Verified listings with blockchain contracts</p>
            </div>
            <Button variant="outline" asChild data-testid="button-view-all">
              <Link href="/properties">View All Properties</Link>
            </Button>
          </div>

          {/* Property Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.slice(0, 6).map((property: any) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>

          {/* Load More Button */}
          <div className="text-center mt-8">
            <Button variant="outline" asChild data-testid="button-load-more">
              <Link href="/properties">
                <Plus className="mr-2 h-4 w-4" />
                Load More Properties
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Why Choose SmartRent?</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">Modern solutions for Pakistan's rental market</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Blockchain Security */}
            <Card className="text-center p-8 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900 dark:to-primary-800 border border-primary-200 dark:border-primary-700">
              <div className="w-16 h-16 bg-primary-500 rounded-lg flex items-center justify-center mx-auto mb-6">
                <Shield className="text-white h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-primary-900 dark:text-primary-100 mb-4">Blockchain Security</h3>
              <p className="text-primary-700 dark:text-primary-200 mb-4">
                Your contracts are stored on a secure blockchain, making them tamper-proof and legally binding.
              </p>
              <ul className="text-primary-700 dark:text-primary-200 text-sm space-y-2">
                <li className="flex items-center justify-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-success-600" />
                  <span>Immutable records</span>
                </li>
                <li className="flex items-center justify-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-success-600" />
                  <span>Digital signatures</span>
                </li>
                <li className="flex items-center justify-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-success-600" />
                  <span>Automated compliance</span>
                </li>
              </ul>
            </Card>

            {/* AI Pricing */}
            <Card className="text-center p-8 bg-gradient-to-br from-success-50 to-success-100 dark:from-success-900 dark:to-success-800 border border-success-200 dark:border-success-700">
              <div className="w-16 h-16 bg-success-500 rounded-lg flex items-center justify-center mx-auto mb-6">
                <Bot className="text-white h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-success-900 dark:text-success-100 mb-4">AI-Powered Insights</h3>
              <p className="text-success-700 dark:text-success-200 mb-4">
                Get fair rental prices and smart location suggestions powered by artificial intelligence.
              </p>
              <ul className="text-success-700 dark:text-success-200 text-sm space-y-2">
                <li className="flex items-center justify-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-success-600" />
                  <span>Market-based pricing</span>
                </li>
                <li className="flex items-center justify-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-success-600" />
                  <span>Location recommendations</span>
                </li>
                <li className="flex items-center justify-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-success-600" />
                  <span>Trend analysis</span>
                </li>
              </ul>
            </Card>

            {/* Verification */}
            <Card className="text-center p-8 bg-gradient-to-br from-warning-50 to-warning-100 dark:from-warning-900 dark:to-warning-800 border border-warning-200 dark:border-warning-700">
              <div className="w-16 h-16 bg-warning-500 rounded-lg flex items-center justify-center mx-auto mb-6">
                <IdCard className="text-white h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-warning-900 dark:text-warning-100 mb-4">Verified Users</h3>
              <p className="text-warning-700 dark:text-warning-200 mb-4">
                All users go through manual CNIC verification to ensure trust and safety on our platform.
              </p>
              <ul className="text-warning-700 dark:text-warning-200 text-sm space-y-2">
                <li className="flex items-center justify-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-success-600" />
                  <span>CNIC verification</span>
                </li>
                <li className="flex items-center justify-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-success-600" />
                  <span>Background checks</span>
                </li>
                <li className="flex items-center justify-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-success-600" />
                  <span>Secure profiles</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Trusted by Thousands</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">Join Pakistan's growing community of smart renters</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { icon: Users, label: "Active Users", value: "10,000+" },
              { icon: FileText, label: "Smart Contracts", value: "2,500+" },
              { icon: CheckCircle, label: "Successful Rentals", value: "5,000+" },
              { icon: TrendingUp, label: "Success Rate", value: "98%" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="text-center">
                <div className="w-16 h-16 bg-primary-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Icon className="text-white h-8 w-8" />
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{value}</div>
                <div className="text-gray-600 dark:text-gray-400">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
