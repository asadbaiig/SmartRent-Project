import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { 
  CreditCard, 
  Smartphone, 
  Wallet, 
  Building2, 
  Calendar,
  Lock,
  CheckCircle,
  AlertCircle,
  History,
  Loader2,
  Upload,
  X,
  FileImage
} from "lucide-react";

const fadeInUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

export default function Payments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState("card");
  const [autoPayEnabled, setAutoPayEnabled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [uploadedReceiptId, setUploadedReceiptId] = useState<string | null>(null);
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
    contractId: "contract-123",
    landlordId: "landlord-123",
  };

  const totalAmount = currentRent.amount + currentRent.processingFee;

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.slice(0, 19); // Max 16 digits + 3 spaces
  };

  // Format expiry date as MM/YY
  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const updateFormData = (field: string, value: string) => {
    if (field === 'cardNumber') {
      setFormData(prev => ({ ...prev, [field]: formatCardNumber(value) }));
    } else if (field === 'expiryDate') {
      setFormData(prev => ({ ...prev, [field]: formatExpiryDate(value) }));
    } else if (field === 'cvv') {
      // Only allow digits, max 4 characters
      const cleaned = value.replace(/\D/g, '').slice(0, 4);
      setFormData(prev => ({ ...prev, [field]: cleaned }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to make a payment",
        variant: "destructive",
      });
      return;
    }

    // Validate form
    if (!formData.cardholderName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter cardholder name",
        variant: "destructive",
      });
      return;
    }

    const cleanedCardNumber = formData.cardNumber.replace(/\s/g, '');
    if (cleanedCardNumber.length !== 16) {
      toast({
        title: "Validation Error",
        description: "Card number must be 16 digits",
        variant: "destructive",
      });
      return;
    }

    if (!/^\d{2}\/\d{2}$/.test(formData.expiryDate)) {
      toast({
        title: "Validation Error",
        description: "Please enter expiry date in MM/YY format",
        variant: "destructive",
      });
      return;
    }

    if (formData.cvv.length < 3) {
      toast({
        title: "Validation Error",
        description: "Please enter CVV",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/payments/process-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          cardNumber: cleanedCardNumber,
          cardholderName: formData.cardholderName,
          expiryDate: formData.expiryDate,
          cvv: formData.cvv,
          amount: totalAmount,
          contractId: currentRent.contractId,
          landlordId: currentRent.landlordId,
          dueDate: currentRent.dueDate.toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Payment failed');
      }

      toast({
        title: "Payment Successful",
        description: `₨${totalAmount.toLocaleString()} paid successfully! Transaction ID: ${data.transaction.id}`,
      });

      // Reset form
      setFormData({
        cardholderName: "",
        cardNumber: "",
        expiryDate: "",
        cvv: "",
      });

      // Refresh payments list
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error: any) {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a JPEG, PNG, WebP image or PDF file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "File size must be less than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setReceiptFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview(null);
    }
  };

  const handleReceiptUpload = async () => {
    if (!receiptFile) {
      toast({
        title: "No File Selected",
        description: "Please select a receipt file to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingReceipt(true);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('receipt', receiptFile);
      formData.append('contractId', currentRent.contractId);

      const response = await fetch('/api/payments/upload-receipt', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload receipt');
      }

      setUploadedReceiptId(data.receipt.id);
      toast({
        title: "Receipt Uploaded",
        description: "Receipt has been uploaded successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload receipt. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    setUploadedReceiptId(null);
  };

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

    // Process payment (receipt upload is optional)
    if (uploadedReceiptId) {
      toast({
        title: "Payment Submitted",
        description: "Your payment with receipt has been submitted. It will be verified shortly.",
      });
    } else {
      toast({
        title: "Payment Submitted",
        description: "Your payment has been submitted successfully.",
      });
    }
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
      <motion.div className="min-h-screen flex items-center justify-center" initial="hidden" animate="visible" variants={fadeInUp}>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Please login to view payments</p>
          <Button asChild data-testid="button-login">
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8"
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.18 } } }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div className="mb-8" variants={fadeInUp}>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payment Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Secure, automated rent collection with Pakistani payment methods
          </p>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          variants={staggerContainer}
        >
          {/* Payment Form */}
          <motion.div className="lg:col-span-2" variants={fadeInUp}>
            <Card className="transition-transform duration-500 hover:-translate-y-1">
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

                {/* Payment Method Details */}
                {selectedMethod === "easypaisa" && (
                  <div className="mb-6 p-6 bg-primary-50 dark:bg-primary-900 border border-primary-200 dark:border-primary-700 rounded-lg">
                    <h4 className="font-semibold mb-4 text-primary-900 dark:text-primary-100">Easypaisa Payment Details</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600 dark:text-gray-400">Account Number:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">+92 3365447781</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600 dark:text-gray-400">Account Name:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">MUHAMMAD ASAD BAIG</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                      Send the payment amount to this Easypaisa account and upload the receipt.
                    </p>
                  </div>
                )}

                {selectedMethod === "bank" && (
                  <div className="mb-6 p-6 bg-primary-50 dark:bg-primary-900 border border-primary-200 dark:border-primary-700 rounded-lg">
                    <h4 className="font-semibold mb-4 text-primary-900 dark:text-primary-100">Bank Transfer Details</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600 dark:text-gray-400">Account Number:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">+92 3365447781</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600 dark:text-gray-400">Account Name:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">Muhammad Asad Baig</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600 dark:text-gray-400">Bank:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">Sadapay</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                      Transfer the payment amount to this bank account and upload the receipt.
                    </p>
                  </div>
                )}

                {selectedMethod === "jazzcash" && (
                  <div className="mb-6 p-6 bg-primary-50 dark:bg-primary-900 border border-primary-200 dark:border-primary-700 rounded-lg">
                    <h4 className="font-semibold mb-4 text-primary-900 dark:text-primary-100">JazzCash Payment Details</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600 dark:text-gray-400">Account Number:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">+92 3365447781</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600 dark:text-gray-400">Account Name:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">Muhammad Asad Baig</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                      Send the payment amount to this JazzCash account and upload the receipt.
                    </p>
                  </div>
                )}

                {/* Pakistani Credit Card Form */}
                {selectedMethod === "card" && (
                  <form onSubmit={handleCardPayment} className="space-y-4 mb-6">
                    <div>
                      <Label htmlFor="cardholderName">Cardholder Name</Label>
                      <Input
                        id="cardholderName"
                        value={formData.cardholderName}
                        onChange={(e) => updateFormData('cardholderName', e.target.value)}
                        placeholder="Ahmed Hassan"
                        required
                        disabled={isProcessing}
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
                        maxLength={19}
                        required
                        disabled={isProcessing}
                        data-testid="input-card-number"
                      />
                      <p className="text-xs text-gray-500 mt-1">16-digit card number</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="expiryDate">Expiry Date</Label>
                        <Input
                          id="expiryDate"
                          value={formData.expiryDate}
                          onChange={(e) => updateFormData('expiryDate', e.target.value)}
                          placeholder="MM/YY"
                          maxLength={5}
                          required
                          disabled={isProcessing}
                          data-testid="input-expiry-date"
                        />
                      </div>
                      <div>
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          type="password"
                          value={formData.cvv}
                          onChange={(e) => updateFormData('cvv', e.target.value)}
                          placeholder="123"
                          maxLength={4}
                          required
                          disabled={isProcessing}
                          data-testid="input-cvv"
                        />
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      size="lg"
                      disabled={isProcessing}
                      data-testid="button-pay-card"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing Payment...
                        </>
                      ) : (
                        <>
                          <Lock className="mr-2 h-4 w-4" />
                          Pay ₨{totalAmount.toLocaleString()} Securely
                        </>
                      )}
                    </Button>
                  </form>
                )}

                {/* Receipt Upload Section (for non-card payments) */}
                {selectedMethod !== "card" && (
                  <div className="mb-6 space-y-4">
                    <div>
                      <Label htmlFor="receipt" className="text-base font-semibold mb-2 block">
                        Upload Payment Receipt
                      </Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Please upload a screenshot or photo of your payment receipt (JPEG, PNG, WebP, or PDF)
                      </p>
                      
                      {!receiptFile ? (
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
                          <input
                            type="file"
                            id="receipt"
                            accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                          <label
                            htmlFor="receipt"
                            className="cursor-pointer flex flex-col items-center"
                          >
                            <Upload className="h-10 w-10 text-gray-400 mb-2" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Click to upload or drag and drop
                            </span>
                            <span className="text-xs text-gray-500 mt-1">
                              Max file size: 10MB
                            </span>
                          </label>
                        </div>
                      ) : (
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <FileImage className="h-5 w-5 text-primary-500" />
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {receiptFile.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({(receiptFile.size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleRemoveReceipt}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {receiptPreview && (
                            <div className="mt-3">
                              <img
                                src={receiptPreview}
                                alt="Receipt preview"
                                className="max-h-48 w-auto rounded border border-gray-200 dark:border-gray-700"
                              />
                            </div>
                          )}
                          
                          {!uploadedReceiptId && (
                            <Button
                              type="button"
                              onClick={handleReceiptUpload}
                              disabled={isUploadingReceipt}
                              className="w-full mt-3"
                            >
                              {isUploadingReceipt ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Upload className="mr-2 h-4 w-4" />
                                  Upload Receipt
                                </>
                              )}
                            </Button>
                          )}
                          
                          {uploadedReceiptId && (
                            <div className="mt-3 p-3 bg-success-50 dark:bg-success-900 border border-success-200 dark:border-success-700 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <CheckCircle className="h-5 w-5 text-success-600 dark:text-success-400" />
                                <span className="text-sm text-success-800 dark:text-success-200">
                                  Receipt uploaded successfully!
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <form onSubmit={handlePayment} className="mb-6">
                      <Button 
                        type="submit" 
                        className="w-full" 
                        size="lg"
                        disabled={isProcessing}
                        data-testid="button-pay"
                      >
                        <Lock className="mr-2 h-4 w-4" />
                        Pay ₨{totalAmount.toLocaleString()} Securely
                      </Button>
                    </form>
                  </div>
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
              </CardContent>
            </Card>
          </motion.div>

          {/* Sidebar */}
          <motion.div className="space-y-6" variants={staggerContainer}>
            {/* Payment History */}
            <motion.div variants={fadeInUp}>
            <Card className="transition-transform duration-500 hover:-translate-y-1">
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
                    {payments.slice(0, 3).map((payment: any, index: number) => (
                      <div key={payment.id || index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {payment.paidDate ? new Date(payment.paidDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Payment'}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {payment.paidDate ? `Paid on ${new Date(payment.paidDate).toLocaleDateString()}` : 'Pending'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 dark:text-white">₨{parseFloat(payment.amount || 0).toLocaleString()}</p>
                          <Badge className={getStatusColor(payment.status || 'pending')}>
                            {payment.status || 'pending'}
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
            </motion.div>

            {/* Security Info */}
            <motion.div variants={fadeInUp}>
            <Card className="bg-success-50 dark:bg-success-900 border-success-200 dark:border-success-700 transition-transform duration-500 hover:-translate-y-1">
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
                        Pakistani banking standards
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
            </motion.div>

            {/* Next Payment Due */}
            <motion.div variants={fadeInUp}>
            <Card className="transition-transform duration-500 hover:-translate-y-1">
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
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
