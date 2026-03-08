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
      case 'paid': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200';
      case 'pending': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200';
      case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
    }
  };

  if (!user) {
    return (
      <motion.div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950" initial="hidden" animate="visible" variants={fadeInUp}>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Access Denied</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">Please sign in to view payments</p>
          <Button asChild data-testid="button-login">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8"
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div className="mb-8" variants={fadeInUp}>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Payment Management</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-0.5 text-sm">
                Secure rent collection with Pakistani payment methods
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          variants={staggerContainer}
        >
          {/* Payment Form */}
          <motion.div className="lg:col-span-2" variants={fadeInUp}>
            <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <span>Make Payment</span>
                  </CardTitle>
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border-0">
                    Secure SSL
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Payment Summary */}
                <div className="rounded-xl bg-slate-100/80 dark:bg-slate-800/60 p-5 border border-slate-200 dark:border-slate-600">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Payment Summary</h3>
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Monthly Rent</span>
                      <span className="font-semibold text-slate-900 dark:text-white">₨{currentRent.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Processing Fee</span>
                      <span className="font-semibold text-slate-900 dark:text-white">₨{currentRent.processingFee}</span>
                    </div>
                    <div className="border-t border-slate-200 dark:border-slate-600 pt-3 mt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-900 dark:text-white">Total Amount</span>
                        <span className="text-xl font-bold text-primary-600 dark:text-primary-400">₨{totalAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Payment Method</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "bank", icon: Building2, label: "Bank Transfer" },
                      { id: "card", icon: CreditCard, label: "Debit/Credit Card" },
                      { id: "jazzcash", icon: Smartphone, label: "JazzCash" },
                      { id: "easypaisa", icon: Wallet, label: "Easypaisa" },
                    ].map(({ id, icon: Icon, label }) => (
                      <label 
                        key={id}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedMethod === id 
                            ? 'border-primary-500 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/40 shadow-sm' 
                            : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={id}
                          checked={selectedMethod === id}
                          onChange={(e) => setSelectedMethod(e.target.value)}
                          className="sr-only"
                          data-testid={`radio-${id}`}
                        />
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${selectedMethod === id ? 'bg-primary-200 dark:bg-primary-800' : 'bg-slate-200 dark:bg-slate-700'}`}>
                          <Icon className={`h-5 w-5 ${selectedMethod === id ? 'text-primary-700 dark:text-primary-300' : 'text-slate-600 dark:text-slate-400'}`} />
                        </div>
                        <span className="font-medium text-slate-900 dark:text-white text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Payment Method Details */}
                {selectedMethod === "easypaisa" && (
                  <div className="p-5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-600">
                    <h4 className="font-semibold mb-3 text-slate-900 dark:text-white">Easypaisa Payment Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-600 dark:text-slate-400">Account Number</span>
                        <span className="font-semibold text-slate-900 dark:text-white">+92 3365447781</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-600 dark:text-slate-400">Account Name</span>
                        <span className="font-semibold text-slate-900 dark:text-white">MUHAMMAD ASAD BAIG</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-4">
                      Send the amount to this Easypaisa account and upload the receipt below.
                    </p>
                  </div>
                )}

                {selectedMethod === "bank" && (
                  <div className="p-5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-600">
                    <h4 className="font-semibold mb-3 text-slate-900 dark:text-white">Bank Transfer Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-600 dark:text-slate-400">Account Number</span>
                        <span className="font-semibold text-slate-900 dark:text-white">+92 3365447781</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-600 dark:text-slate-400">Account Name</span>
                        <span className="font-semibold text-slate-900 dark:text-white">Muhammad Asad Baig</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-600 dark:text-slate-400">Bank</span>
                        <span className="font-semibold text-slate-900 dark:text-white">Sadapay</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-4">
                      Transfer the amount to this account and upload the receipt below.
                    </p>
                  </div>
                )}

                {selectedMethod === "jazzcash" && (
                  <div className="p-5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-600">
                    <h4 className="font-semibold mb-3 text-slate-900 dark:text-white">JazzCash Payment Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-600 dark:text-slate-400">Account Number</span>
                        <span className="font-semibold text-slate-900 dark:text-white">+92 3365447781</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-600 dark:text-slate-400">Account Name</span>
                        <span className="font-semibold text-slate-900 dark:text-white">Muhammad Asad Baig</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-4">
                      Send the amount to this JazzCash account and upload the receipt below.
                    </p>
                  </div>
                )}

                {/* Pakistani Credit Card Form */}
                {selectedMethod === "card" && (
                  <form onSubmit={handleCardPayment} className="space-y-4">
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
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">16-digit card number</p>
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
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="receipt" className="text-sm font-semibold text-slate-900 dark:text-white mb-2 block">
                        Upload Payment Receipt
                      </Label>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        Screenshot or photo of your payment receipt (JPEG, PNG, WebP, or PDF)
                      </p>
                      
                      {!receiptFile ? (
                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 text-center hover:border-primary-500 dark:hover:border-primary-500 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
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
                            <Upload className="h-10 w-10 text-slate-400 dark:text-slate-500 mb-2" />
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              Click to upload or drag and drop
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                              Max 10MB
                            </span>
                          </label>
                        </div>
                      ) : (
                        <div className="border border-slate-200 dark:border-slate-600 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2 min-w-0">
                              <FileImage className="h-5 w-5 text-primary-500 dark:text-primary-400 shrink-0" />
                              <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                {receiptFile.name}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
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
                                className="max-h-48 w-auto rounded-lg border border-slate-200 dark:border-slate-600"
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
                            <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-sm text-emerald-800 dark:text-emerald-200">
                                  Receipt uploaded successfully!
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <form onSubmit={handlePayment}>
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
                <div className="p-4 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-600">
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      id="autopay" 
                      checked={autoPayEnabled}
                      onCheckedChange={(checked) => setAutoPayEnabled(checked as boolean)}
                      data-testid="checkbox-autopay"
                    />
                    <Label htmlFor="autopay" className="text-slate-900 dark:text-white font-medium cursor-pointer">
                      Enable Auto-Pay
                    </Label>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 ml-7">
                    Pay rent automatically on the same date each month. You can disable this anytime.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sidebar */}
          <motion.div className="space-y-5" variants={staggerContainer}>
            {/* Payment History */}
            <motion.div variants={fadeInUp}>
              <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white text-base">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700">
                      <History className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                    </div>
                    Recent Payments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }, (_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                        </div>
                      ))}
                    </div>
                  ) : payments.length === 0 ? (
                    <div className="text-center py-6">
                      <AlertCircle className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-500 mb-2" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">No payment history</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {payments.slice(0, 3).map((payment: any, index: number) => (
                        <div key={payment.id || index} className="flex justify-between items-center p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-600">
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 dark:text-white text-sm">
                              {payment.paidDate ? new Date(payment.paidDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Payment'}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {payment.paidDate ? `Paid ${new Date(payment.paidDate).toLocaleDateString()}` : 'Pending'}
                            </p>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <p className="font-semibold text-slate-900 dark:text-white text-sm">₨{parseFloat(payment.amount || 0).toLocaleString()}</p>
                            <Badge className={`text-xs ${getStatusColor(payment.status || 'pending')}`}>
                              {payment.status || 'pending'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button variant="outline" className="w-full mt-4 text-sm" data-testid="button-view-all-payments">
                    View All Payments
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Security Info */}
            <motion.div variants={fadeInUp}>
              <Card className="border-2 border-emerald-200 dark:border-slate-600 bg-emerald-50/80 dark:bg-slate-800/60 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-200 dark:bg-emerald-900/60">
                      <Lock className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2 text-sm">
                        Secure Payments
                      </h4>
                      <ul className="text-slate-700 dark:text-slate-300 text-sm space-y-1.5">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          256-bit SSL encryption
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          PCI-DSS compliant
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          Pakistani banking standards
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          Instant confirmation
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Next Payment Due */}
            <motion.div variants={fadeInUp}>
              <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white text-base">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                      <Calendar className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                    </div>
                    Next Payment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                      ₨{currentRent.amount.toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      Due {currentRent.dueDate.toLocaleDateString()}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mb-3 truncate px-2">
                      {currentRent.property}
                    </p>
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                      Due in {Math.ceil((currentRent.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                    </Badge>
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
