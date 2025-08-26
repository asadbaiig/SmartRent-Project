import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { 
  CreditCard, 
  Smartphone, 
  Wallet, 
  Building2, 
  Calendar,
  Lock,
  CheckCircle,
  AlertCircle,
  Download,
  History
} from "lucide-react";

export default function Payments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState("card");
  const [autoPayEnabled, setAutoPayEnabled] = useState(false);
  const [formData, setFormData] = useState({
    cardholderName: "",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
  });

  // Fetch payments
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['/api/payments'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/payments', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch payments');
      return response.json();
    },
    enabled: !!user,
  });

  // Mock current rent data - in real app this would come from active contract
  const currentRent = {
    amount: 45000,
    processingFee: 150,
    property: "Modern 2-Bed Apartment",
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
  };

  const totalAmount = currentRent.amount + currentRent.processingFee;

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to make a payment",
        variant: "destructive",
      });
      return;
    }

    try {
      // Mock payment processing
      toast({
        title: "Payment Processing",
        description: "Your payment is being processed...",
      });

      // Simulate API call
      setTimeout(() => {
        toast({
          title: "Payment Successful",
          description: `₨${totalAmount.toLocaleString()} paid successfully!`,
        });
      }, 2000);

    } catch (error: any) {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-success-100 text-success-700';
      case 'pending': return 'bg-warning-100 text-warning-700';
      case 'overdue': return 'bg-red-100 text-red-700';
      case 'failed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Please login to view payments</p>
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payment Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Secure, automated rent collection with multiple Pakistani payment methods
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Make Payment</span>
                  <Badge className="bg-success-100 text-success-700">Secure SSL</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Payment Summary */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold mb-4">Payment Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Monthly Rent</span>
                      <span className="font-semibold">₨{currentRent.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Processing Fee</span>
                      <span className="font-semibold">₨{currentRent.processingFee}</span>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-lg font-semibold">Total Amount</span>
                        <span className="text-xl font-bold text-primary-600">₨{totalAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-4">Payment Method</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { id: "bank", icon: Building2, label: "Bank Transfer" },
                      { id: "card", icon: CreditCard, label: "Debit/Credit Card" },
                      { id: "jazzcash", icon: Smartphone, label: "JazzCash" },
                      { id: "easypaisa", icon: Wallet, label: "Easypaisa" },
                    ].map(({ id, icon: Icon, label }) => (
                      <label 
                        key={id}
                        className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedMethod === id 
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900' 
                            : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={id}
                          checked={selectedMethod === id}
                          onChange={(e) => setSelectedMethod(e.target.value)}
                          className="mr-3"
                          data-testid={`radio-${id}`}
                        />
                        <Icon className="mr-3 h-5 w-5 text-primary-500" />
                        <span className="text-gray-900 dark:text-white">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Card Details Form */}
                {selectedMethod === "card" && (
                  <form onSubmit={handlePayment} className="space-y-4 mb-6">
                    <div>
                      <Label htmlFor="cardholderName">Cardholder Name</Label>
                      <Input
                        id="cardholderName"
                        value={formData.cardholderName}
                        onChange={(e) => updateFormData('cardholderName', e.target.value)}
                        placeholder="Ahmed Hassan"
                        required
                        data-testid="input-cardholder-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        value={formData.cardNumber}
                        onChange={(e) => updateFormData('cardNumber', e.target.value)}
                        placeholder="1234 5678 9012 3456"
                        required
                        data-testid="input-card-number"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="expiryDate">Expiry Date</Label>
                        <Input
                          id="expiryDate"
                          value={formData.expiryDate}
                          onChange={(e) => updateFormData('expiryDate', e.target.value)}
                          placeholder="MM/YY"
                          required
                          data-testid="input-expiry-date"
                        />
                      </div>
                      <div>
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          value={formData.cvv}
                          onChange={(e) => updateFormData('cvv', e.target.value)}
                          placeholder="123"
                          required
                          data-testid="input-cvv"
                        />
                      </div>
                    </div>
                  </form>
                )}

                {/* Auto-pay Setup */}
                <div className="mb-6 p-4 bg-primary-50 dark:bg-primary-900 border border-primary-200 dark:border-primary-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="autopay" 
                      checked={autoPayEnabled}
                      onCheckedChange={(checked) => setAutoPayEnabled(checked as boolean)}
                      data-testid="checkbox-autopay"
                    />
                    <Label htmlFor="autopay" className="text-primary-900 dark:text-primary-100 font-medium">
                      Enable Auto-Pay
                    </Label>
                  </div>
                  <p className="text-sm text-primary-700 dark:text-primary-200 mt-2 ml-6">
                    Automatically pay rent on the same date each month. You can disable this anytime.
                  </p>
                </div>

                {/* Submit Button */}
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={selectedMethod === "card" ? undefined : handlePayment}
                  type={selectedMethod === "card" ? "submit" : "button"}
                  data-testid="button-pay"
                >
                  <Lock className="mr-2 h-4 w-4" />
                  Pay ₨{totalAmount.toLocaleString()} Securely
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <History className="h-5 w-5" />
                  <span>Recent Payments</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }, (_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                      </div>
                    ))}
                  </div>
                ) : payments.length === 0 ? (
                  <div className="text-center py-6">
                    <AlertCircle className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">No payment history</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {[
                      { month: "November 2024", date: "Nov 15", amount: 45000, status: "paid" },
                      { month: "October 2024", date: "Oct 12", amount: 45000, status: "paid" },
                      { month: "September 2024", date: "Sep 10", amount: 45000, status: "paid" },
                    ].map((payment, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{payment.month}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Paid on {payment.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 dark:text-white">₨{payment.amount.toLocaleString()}</p>
                          <Badge className={getStatusColor(payment.status)}>
                            {payment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <Button variant="ghost" className="w-full mt-4" data-testid="button-view-all-payments">
                  View All Payments
                </Button>
              </CardContent>
            </Card>

            {/* Security Info */}
            <Card className="bg-success-50 dark:bg-success-900 border-success-200 dark:border-success-700">
              <CardContent className="p-6">
                <div className="flex items-start space-x-3">
                  <Lock className="text-success-500 mt-1 h-5 w-5" />
                  <div>
                    <h4 className="text-success-900 dark:text-success-100 font-semibold mb-2">
                      Secure Payments
                    </h4>
                    <ul className="text-success-700 dark:text-success-200 text-sm space-y-1">
                      <li className="flex items-center">
                        <CheckCircle className="mr-2 h-3 w-3" />
                        256-bit SSL encryption
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="mr-2 h-3 w-3" />
                        PCI-DSS compliant
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="mr-2 h-3 w-3" />
                        Local banking partnerships
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="mr-2 h-3 w-3" />
                        Instant payment confirmation
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Next Payment Due */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Next Payment</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    ₨{currentRent.amount.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Due on {currentRent.dueDate.toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {currentRent.property}
                  </p>
                  
                  <div className="mt-4">
                    <Badge variant="secondary" className="bg-warning-100 text-warning-700">
                      Due in {Math.ceil((currentRent.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
