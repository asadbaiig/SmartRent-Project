import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { PasswordConfirmDialog } from "@/components/password-confirm-dialog";
import { ContractDocumentView } from "@/components/contract-document-view";
import { SignaturePad } from "@/components/signature-pad";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  FileText, 
  Plus, 
  Eye, 
  Clock, 
  CheckCircle, 
  XCircle,
  Calendar,
  DollarSign,
  Bot,
  Shield,
  Gavel,
  Trash2
} from "lucide-react";

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const containerStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

export default function Contracts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState("list");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<string | null>(null);
  const [viewingContract, setViewingContract] = useState<any | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Set active tab based on current route
  useEffect(() => {
    if (location === "/contracts/new" && user?.role === "landlord") {
      setActiveTab("create");
    } else if (location === "/contracts") {
      setActiveTab("list");
    }
  }, [location, user?.role]);

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

  const handleDeleteClick = (contractId: string) => {
    setContractToDelete(contractId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (password: string) => {
    if (!contractToDelete) {
      console.error('No contract to delete');
      return;
    }

    const token = localStorage.getItem('token');
    
    console.log('=== Starting delete for contract:', contractToDelete);
    console.log('Current user:', user);
    
    try {
      const response = await fetch(`/api/contracts/${contractToDelete}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      });

      console.log('Delete response status:', response.status);
      console.log('Delete response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete error response:', errorText);
        let errorMessage = 'Failed to delete contract';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Delete successful, result:', result);

      // Close dialog first
      setDeleteDialogOpen(false);
      setContractToDelete(null);

      // Show success message
      toast({
        title: "Success",
        description: "Contract deleted successfully",
      });

      // Force refetch and wait for it
      console.log('Forcing refetch...');
      await queryClient.refetchQueries({ 
        queryKey: ['/api/contracts'],
        exact: true 
      });
      console.log('Refetch complete');
      
    } catch (error: any) {
      console.error('Delete error caught:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete contract",
        variant: "destructive",
      });
      // Re-throw error so the dialog can display it
      throw error;
    }
  };

  const ContractList = () => (
    <motion.div className="space-y-6" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}>
      {/* Header */}
      <motion.div className="flex justify-between items-center" variants={fadeInUp}>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Contracts</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your rental agreements
          </p>
        </div>
      </motion.div>

      {/* Contracts Grid */}
      {isLoading ? (
        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" variants={containerStagger} initial="hidden" animate="visible">
          {Array.from({ length: 6 }, (_, i) => (
            <motion.div key={i} variants={fadeInUp}>
            <Card className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-2/3"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </CardContent>
            </Card>
            </motion.div>
          ))}
        </motion.div>
      ) : contracts.length === 0 ? (
        <motion.div className="text-center py-16" variants={fadeInUp}>
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No contracts yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {user?.role === 'landlord' 
              ? "Create your first rental contract to get started" 
              : "You don't have any active rental contracts"}
          </p>
        </motion.div>
      ) : (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerStagger}
          initial="hidden"
          animate="visible"
        >
          {contracts.map((contract: any) => (
            <motion.div key={contract.id} variants={fadeInUp}>
            <Card className="hover:shadow-lg transition-shadow">
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
                    <span className="font-semibold">
                      {user?.role === 'landlord' 
                        ? (contract.tenantEmail || 'Loading...') 
                        : (contract.landlordEmail || 'Loading...')}
                    </span>
                  </div>
                  
                  <div className="flex space-x-2 pt-3">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1" 
                      data-testid={`button-view-${contract.id}`}
                      onClick={() => {
                        setViewingContract(contract);
                        setIsViewDialogOpen(true);
                      }}
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      View
                    </Button>
                    {user?.role === 'landlord' && contract.landlordId === user.id && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteClick(contract.id)}
                        data-testid={`button-delete-${contract.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );

  const CreateContract = () => {
    const [formData, setFormData] = useState({
      propertyId: "",
      tenantEmail: "",
      tenantName: "",
      monthlyRent: "",
      securityDeposit: "",
      duration: "12",
      terms: "",
      landlordCNIC: "",
      tenantCNIC: "",
    });
    const [landlordSignature, setLandlordSignature] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Format CNIC input (Pakistani format: XXXXX-XXXXXXX-X)
    const formatCNIC = (value: string) => {
      // Remove all non-digits
      const digits = value.replace(/\D/g, '');
      
      // Format as XXXXX-XXXXXXX-X
      if (digits.length <= 5) {
        return digits;
      } else if (digits.length <= 12) {
        return `${digits.slice(0, 5)}-${digits.slice(5)}`;
      } else {
        return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
      }
    };

    // Validate CNIC format
    const validateCNIC = (cnic: string) => {
      if (!cnic) return false; // Required field
      const cleaned = cnic.replace(/\D/g, '');
      return cleaned.length === 13;
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      // Validate required fields
      if (!formData.propertyId) {
        toast({
          title: "Error",
          description: "Please select a property",
          variant: "destructive",
        });
        return;
      }

      if (!formData.tenantEmail) {
        toast({
          title: "Error",
          description: "Please enter tenant email",
          variant: "destructive",
        });
        return;
      }

      if (!formData.monthlyRent || !formData.securityDeposit) {
        toast({
          title: "Error",
          description: "Please enter monthly rent and security deposit",
          variant: "destructive",
        });
        return;
      }

      // Validate required fields
      if (!formData.tenantName) {
        toast({
          title: "Error",
          description: "Please enter tenant name",
          variant: "destructive",
        });
        return;
      }

      if (!formData.landlordCNIC) {
        toast({
          title: "Error",
          description: "Please enter landlord CNIC",
          variant: "destructive",
        });
        return;
      }

      if (!formData.tenantCNIC) {
        toast({
          title: "Error",
          description: "Please enter tenant CNIC",
          variant: "destructive",
        });
        return;
      }

      if (!landlordSignature) {
        toast({
          title: "Error",
          description: "Please provide your signature",
          variant: "destructive",
        });
        return;
      }

      // Validate CNIC formats
      if (!validateCNIC(formData.landlordCNIC)) {
        toast({
          title: "Error",
          description: "Landlord CNIC must be 13 digits (format: XXXXX-XXXXXXX-X)",
          variant: "destructive",
        });
        return;
      }

      if (!validateCNIC(formData.tenantCNIC)) {
        toast({
          title: "Error",
          description: "Tenant CNIC must be 13 digits (format: XXXXX-XXXXXXX-X)",
          variant: "destructive",
        });
        return;
      }

      setIsSubmitting(true);
      
      try {
        const token = localStorage.getItem('token');
        
        // First, find the tenant by email
        const userResponse = await fetch(`/api/users/by-email?email=${encodeURIComponent(formData.tenantEmail)}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!userResponse.ok) {
          const errorData = await userResponse.json().catch(() => ({ message: 'Failed to find tenant' }));
          throw new Error(errorData.message || 'Tenant not found. Please ensure the email is correct and the user is registered.');
        }

        const tenant = await userResponse.json();

        if (tenant.role !== 'tenant') {
          throw new Error('The specified user is not a tenant');
        }

        // Build terms object
        const terms: any = {};
        if (formData.terms) {
          terms.customTerms = formData.terms;
        }
        if (formData.landlordCNIC) {
          terms.landlordCNIC = formData.landlordCNIC;
        }
        if (formData.tenantCNIC) {
          terms.tenantCNIC = formData.tenantCNIC;
        }
        if (formData.tenantName) {
          terms.tenantName = formData.tenantName;
        }

        const contractData = {
          propertyId: formData.propertyId,
          tenantId: tenant.id,
          monthlyRent: formData.monthlyRent, // Keep as string for decimal type
          securityDeposit: formData.securityDeposit, // Keep as string for decimal type
          duration: parseInt(formData.duration), // Store duration in months
          terms: Object.keys(terms).length > 0 ? terms : undefined,
          digitalSignature: landlordSignature ? { landlord: landlordSignature } : undefined,
        };

        const response = await fetch('/api/contracts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(contractData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to create contract' }));
          throw new Error(errorData.message || 'Failed to create contract');
        }

        toast({
          title: "Success",
          description: "Contract created successfully!",
        });
        
        // Invalidate contracts query to refresh the list
        queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
        
        // Reset form
        setFormData({
          propertyId: "",
          tenantEmail: "",
          tenantName: "",
          monthlyRent: "",
          securityDeposit: "",
          duration: "12",
          terms: "",
          landlordCNIC: "",
          tenantCNIC: "",
        });
        setLandlordSignature(null);
        
        setActiveTab("list");
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to create contract",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    };

    const updateField = (field: string, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
      <motion.div className="max-w-4xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}>
        <motion.div className="mb-6" variants={fadeInUp}>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Contract</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create a secure, blockchain-backed rental agreement
          </p>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:items-stretch"
          variants={containerStagger}
        >
          {/* Contract Form */}
          <motion.div variants={fadeInUp} className="flex">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>Contract Details</span>
                <Badge variant="secondary" className="text-xs">Step 1 of 4</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label>Select Property</Label>
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

                <div>
                  <Label htmlFor="tenantName">Tenant Name</Label>
                  <Input
                    id="tenantName"
                    type="text"
                    value={formData.tenantName}
                    onChange={(e) => updateField('tenantName', e.target.value)}
                    placeholder="Enter tenant's full name"
                    required
                    data-testid="input-tenant-name"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Full name as it should appear on the contract document
                  </p>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="landlordCNIC">Landlord CNIC</Label>
                    <Input
                      id="landlordCNIC"
                      type="text"
                      value={formData.landlordCNIC}
                      onChange={(e) => {
                        const formatted = formatCNIC(e.target.value);
                        setFormData(prev => ({ ...prev, landlordCNIC: formatted }));
                      }}
                      placeholder="37405-1234567-1"
                      maxLength={15}
                      required
                      data-testid="input-landlord-cnic"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Format: XXXXX-XXXXXXX-X
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="tenantCNIC">Tenant CNIC</Label>
                    <Input
                      id="tenantCNIC"
                      type="text"
                      value={formData.tenantCNIC}
                      onChange={(e) => {
                        const formatted = formatCNIC(e.target.value);
                        setFormData(prev => ({ ...prev, tenantCNIC: formatted }));
                      }}
                      placeholder="37405-1234567-1"
                      maxLength={15}
                      required
                      data-testid="input-tenant-cnic"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Format: XXXXX-XXXXXXX-X
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="terms">Additional Terms (Optional)</Label>
                  <Textarea
                    id="terms"
                    value={formData.terms}
                    onChange={(e) => updateField('terms', e.target.value)}
                    placeholder="Any additional terms and conditions..."
                    rows={4}
                    data-testid="textarea-terms"
                  />
                </div>

                <div>
                  <SignaturePad
                    label="Landlord Signature"
                    onSignatureChange={setLandlordSignature}
                    initialSignature={landlordSignature}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Sign above to add your signature to the contract document
                  </p>
                </div>

                <div className="flex space-x-4">
                  <Button 
                    type="submit" 
                    className="flex-1" 
                    disabled={isSubmitting}
                    data-testid="button-create-contract"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {isSubmitting ? "Creating..." : "Create Contract"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setActiveTab("list")}
                    disabled={isSubmitting}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          </motion.div>

          {/* Features Sidebar */}
          <motion.div className="space-y-6 flex flex-col" variants={containerStagger}>
            {/* Blockchain Security */}
            <motion.div variants={fadeInUp} className="flex-1">
              <Card className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900 dark:to-primary-800 border-primary-200 dark:border-primary-700 h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Blockchain Security</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-primary-700 dark:text-primary-200 text-sm mb-4">
                    Your contract will be stored on a secure blockchain, making it tamper-proof and legally binding.
                  </p>
                  <ul className="text-primary-700 dark:text-primary-200 text-sm space-y-2">
                    <li className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4 text-success-600" />
                      Immutable record
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4 text-success-600" />
                      Digital signatures
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4 text-success-600" />
                      Automated compliance
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            {/* Legal Compliance */}
            <motion.div variants={fadeInUp} className="flex-1">
              <Card className="bg-gradient-to-br from-success-50 to-success-100 dark:from-success-900 dark:to-success-800 border-success-200 dark:border-success-700 h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Gavel className="h-5 w-5" />
                    <span>Legal Compliance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-success-700 dark:text-success-200 text-sm mb-4">
                    Automatically ensures compliance with Pakistani rental laws and regulations.
                  </p>
                  <ul className="text-success-700 dark:text-success-200 text-sm space-y-2">
                    <li className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4 text-success-600" />
                      Standard clauses included
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4 text-success-600" />
                      Legal requirement validation
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4 text-success-600" />
                      Court-admissible format
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
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
    <>
      <motion.div 
        className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8"
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.15 } } }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeInUp}>
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
          </motion.div>
        </div>
      </motion.div>

      <PasswordConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Contract"
        description="This action cannot be undone. Please enter your password to confirm deletion of this contract."
        confirmButtonText="Delete Contract"
      />

      {viewingContract && (
        <ContractDocumentView
          contract={viewingContract}
          open={isViewDialogOpen}
          onOpenChange={setIsViewDialogOpen}
        />
      )}
    </>
  );
}
