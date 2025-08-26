import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { 
  FileText, 
  Plus, 
  Eye, 
  Download, 
  Clock, 
  CheckCircle, 
  XCircle,
  Calendar,
  DollarSign,
  Bot,
  Shield,
  Gavel
} from "lucide-react";

export default function Contracts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("list");

  // Fetch contracts
  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['/api/contracts'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/contracts', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch contracts');
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch properties for contract creation (landlords only)
  const { data: properties = [] } = useQuery({
    queryKey: ['/api/properties', 'my-properties'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/properties?landlordOnly=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: user?.role === 'landlord',
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success-100 text-success-700';
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'expired': return 'bg-warning-100 text-warning-700';
      case 'terminated': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const ContractList = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Contracts</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your rental agreements
          </p>
        </div>
        {user?.role === 'landlord' && (
          <Button onClick={() => setActiveTab("create")} data-testid="button-create-contract">
            <Plus className="mr-2 h-4 w-4" />
            Create Contract
          </Button>
        )}
      </div>

      {/* Contracts Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }, (_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-2/3"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : contracts.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No contracts yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {user?.role === 'landlord' 
              ? "Create your first rental contract to get started" 
              : "You don't have any active rental contracts"}
          </p>
          {user?.role === 'landlord' && (
            <Button onClick={() => setActiveTab("create")} data-testid="button-create-first-contract">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Contract
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contracts.map((contract: any) => (
            <Card key={contract.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg line-clamp-2">Property Contract</CardTitle>
                  <Badge className={getStatusColor(contract.status)}>
                    {contract.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Monthly Rent:</span>
                    <span className="font-semibold">₨{Number(contract.monthlyRent).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                    <span className="font-semibold">
                      {new Date(contract.startDate).toLocaleDateString()} - {new Date(contract.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {user?.role === 'landlord' ? 'Tenant:' : 'Landlord:'}
                    </span>
                    <span className="font-semibold">Not loaded</span>
                  </div>
                  
                  <div className="flex space-x-2 pt-3">
                    <Button size="sm" variant="outline" className="flex-1" data-testid={`button-view-${contract.id}`}>
                      <Eye className="mr-1 h-3 w-3" />
                      View
                    </Button>
                    <Button size="sm" variant="outline" data-testid={`button-download-${contract.id}`}>
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const CreateContract = () => {
    const [formData, setFormData] = useState({
      propertyId: "",
      tenantEmail: "",
      monthlyRent: "",
      securityDeposit: "",
      startDate: "",
      duration: "12",
      terms: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      try {
        const token = localStorage.getItem('token');
        const endDate = new Date(formData.startDate);
        endDate.setMonth(endDate.getMonth() + parseInt(formData.duration));

        const contractData = {
          propertyId: formData.propertyId,
          tenantId: "temp-tenant-id", // This should be resolved from tenantEmail
          monthlyRent: formData.monthlyRent,
          securityDeposit: formData.securityDeposit,
          startDate: formData.startDate,
          endDate: endDate.toISOString(),
          terms: { customTerms: formData.terms },
        };

        const response = await fetch('/api/contracts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(contractData),
        });

        if (!response.ok) throw new Error('Failed to create contract');

        toast({
          title: "Success",
          description: "Contract created successfully!",
        });
        setActiveTab("list");
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to create contract",
          variant: "destructive",
        });
      }
    };

    const updateField = (field: string, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Contract</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create a secure, blockchain-backed rental agreement
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contract Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>Contract Details</span>
                <Badge variant="secondary" className="text-xs">Step 1 of 4</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="property">Select Property</Label>
                  <Select value={formData.propertyId} onValueChange={(value) => updateField('propertyId', value)}>
                    <SelectTrigger data-testid="select-property">
                      <SelectValue placeholder="Choose a property" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((property: any) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.title} - {property.area}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tenantEmail">Tenant Email</Label>
                  <Input
                    id="tenantEmail"
                    type="email"
                    value={formData.tenantEmail}
                    onChange={(e) => updateField('tenantEmail', e.target.value)}
                    placeholder="tenant@example.com"
                    required
                    data-testid="input-tenant-email"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="monthlyRent">Monthly Rent (PKR)</Label>
                    <div className="relative">
                      <Input
                        id="monthlyRent"
                        type="number"
                        value={formData.monthlyRent}
                        onChange={(e) => updateField('monthlyRent', e.target.value)}
                        placeholder="45000"
                        required
                        data-testid="input-monthly-rent"
                      />
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-warning-600"
                        data-testid="button-ai-price"
                      >
                        <Bot className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-warning-600 mt-1">
                      <Bot className="inline h-3 w-3 mr-1" />
                      AI suggests: ₨42,000 - ₨48,000
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="securityDeposit">Security Deposit</Label>
                    <Input
                      id="securityDeposit"
                      type="number"
                      value={formData.securityDeposit}
                      onChange={(e) => updateField('securityDeposit', e.target.value)}
                      placeholder="90000"
                      required
                      data-testid="input-security-deposit"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => updateField('startDate', e.target.value)}
                      required
                      data-testid="input-start-date"
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration">Duration (Months)</Label>
                    <Select value={formData.duration} onValueChange={(value) => updateField('duration', value)}>
                      <SelectTrigger data-testid="select-duration">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6 months</SelectItem>
                        <SelectItem value="12">12 months</SelectItem>
                        <SelectItem value="24">24 months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="terms">Additional Terms</Label>
                  <Textarea
                    id="terms"
                    value={formData.terms}
                    onChange={(e) => updateField('terms', e.target.value)}
                    placeholder="Any additional terms and conditions..."
                    rows={4}
                    data-testid="textarea-terms"
                  />
                </div>

                <div className="flex space-x-4">
                  <Button type="submit" className="flex-1" data-testid="button-create-contract">
                    <FileText className="mr-2 h-4 w-4" />
                    Create Contract
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setActiveTab("list")}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Features Sidebar */}
          <div className="space-y-6">
            {/* Blockchain Security */}
            <Card className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900 dark:to-primary-800 border-primary-200 dark:border-primary-700">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center">
                    <Shield className="text-white h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-primary-900 dark:text-primary-100 mb-2">
                      Blockchain Security
                    </h4>
                    <p className="text-primary-700 dark:text-primary-200 text-sm mb-3">
                      Your contract will be stored on a secure blockchain, making it tamper-proof and legally binding.
                    </p>
                    <ul className="text-primary-700 dark:text-primary-200 text-sm space-y-1">
                      <li className="flex items-center">
                        <CheckCircle className="mr-2 h-3 w-3 text-success-600" />
                        Immutable record
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="mr-2 h-3 w-3 text-success-600" />
                        Digital signatures
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="mr-2 h-3 w-3 text-success-600" />
                        Automated compliance
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Legal Compliance */}
            <Card className="bg-gradient-to-br from-success-50 to-success-100 dark:from-success-900 dark:to-success-800 border-success-200 dark:border-success-700">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-success-500 rounded-lg flex items-center justify-center">
                    <Gavel className="text-white h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-success-900 dark:text-success-100 mb-2">
                      Legal Compliance
                    </h4>
                    <p className="text-success-700 dark:text-success-200 text-sm mb-3">
                      Automatically ensures compliance with Pakistani rental laws and regulations.
                    </p>
                    <ul className="text-success-700 dark:text-success-200 text-sm space-y-1">
                      <li className="flex items-center">
                        <CheckCircle className="mr-2 h-3 w-3 text-success-600" />
                        Standard clauses included
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="mr-2 h-3 w-3 text-success-600" />
                        Legal requirement validation
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="mr-2 h-3 w-3 text-success-600" />
                        Court-admissible format
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contract Templates */}
            <Card>
              <CardHeader>
                <CardTitle>Contract Templates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { icon: "🏠", title: "Residential Apartment" },
                  { icon: "🏢", title: "Commercial Space" },
                  { icon: "💼", title: "Office Space" }
                ].map((template) => (
                  <div 
                    key={template.title}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{template.icon}</span>
                      <span className="text-gray-900 dark:text-white">{template.title}</span>
                    </div>
                    <span className="text-gray-400">→</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Please login to view your contracts</p>
          <Button asChild data-testid="button-login">
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="list" data-testid="tab-list">My Contracts</TabsTrigger>
            {user?.role === 'landlord' && (
              <TabsTrigger value="create" data-testid="tab-create">Create Contract</TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="list">{ContractList()}</TabsContent>
          {user?.role === 'landlord' && (
            <TabsContent value="create">{CreateContract()}</TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
