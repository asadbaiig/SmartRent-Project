import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { 
  Upload, 
  Shield, 
  Clock, 
  CheckCircle, 
  XCircle,
  FileText,
  AlertCircle,
  IdCard,
  User,
  Mail
} from "lucide-react";

export default function Verification() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [uploadedFiles, setUploadedFiles] = useState<{
    cnicFront?: File;
    cnicBack?: File;
    additional?: File;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactEmail, setContactEmail] = useState('');

  // Initialize email from user
  useEffect(() => {
    if (user?.email) {
      setContactEmail(user.email);
    }
  }, [user]);

  // Fetch user's documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['/api/documents'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/documents', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch documents');
      return response.json();
    },
    enabled: !!user,
    refetchInterval: 5000, // Poll every 5 seconds to check verification status
  });

  // Refetch user data to get updated verification status
  const { data: currentUser } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch user');
      return response.json();
    },
    enabled: !!user,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Check if user has uploaded all required documents
  const hasAllDocuments = () => {
    const docTypes = documents.map((d: any) => d.type);
    const hasCnicFront = docTypes.includes('cnicFront');
    const hasCnicBack = docTypes.includes('cnicBack');
    const hasAdditional = docTypes.includes('additional');
    return hasCnicFront && hasCnicBack && hasAdditional;
  };

  // Update uploadedFiles state from documents
  useEffect(() => {
    if (documents && documents.length > 0) {
      const cnicFrontDoc = documents.find((d: any) => d.type === 'cnicFront');
      const cnicBackDoc = documents.find((d: any) => d.type === 'cnicBack');
      const additionalDoc = documents.find((d: any) => d.type === 'additional');
      
      // Update state if documents exist (we'll use a placeholder File object)
      if (cnicFrontDoc && !uploadedFiles.cnicFront) {
        setUploadedFiles(prev => ({ ...prev, cnicFront: new File([], cnicFrontDoc.fileName) }));
      }
      if (cnicBackDoc && !uploadedFiles.cnicBack) {
        setUploadedFiles(prev => ({ ...prev, cnicBack: new File([], cnicBackDoc.fileName) }));
      }
      if (additionalDoc && !uploadedFiles.additional) {
        setUploadedFiles(prev => ({ ...prev, additional: new File([], additionalDoc.fileName) }));
      }
    }
  }, [documents]);

  // Update step based on verification status
  useEffect(() => {
    if (currentUser) {
      if (currentUser.verificationStatus === 'verified') {
        setStep(3);
      } else if (currentUser.verificationStatus === 'pending' && hasAllDocuments()) {
        setStep(2);
      } else if (hasAllDocuments()) {
        setStep(2);
      } else {
        setStep(1);
      }
    }
  }, [currentUser, documents, uploadedFiles]);

  const handleFileSelect = (type: string, file: File) => {
    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: `${file.name} is larger than 5MB. Please choose a smaller file.`,
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: `${file.name} is not a valid file type. Please use JPG, PNG, or PDF.`,
        variant: "destructive",
      });
      return;
    }

    // Store the file locally, don't upload yet
    setUploadedFiles(prev => ({ ...prev, [type]: file }));
    
    toast({
      title: "File Selected",
      description: `${file.name} has been selected. Upload all documents and click Submit.`,
    });
  };

  const handleSubmitAllDocuments = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to submit documents",
        variant: "destructive",
      });
      return;
    }

    // Check if all files are selected
    if (!uploadedFiles.cnicFront || !uploadedFiles.cnicBack || !uploadedFiles.additional) {
      toast({
        title: "Missing Documents",
        description: "Please select all three required documents before submitting",
        variant: "destructive",
      });
      return;
    }

    // Validate email if provided
    if (!contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      
      // Upload all three documents
      const uploadPromises = [
        uploadDocument('cnicFront', uploadedFiles.cnicFront!),
        uploadDocument('cnicBack', uploadedFiles.cnicBack!),
        uploadDocument('additional', uploadedFiles.additional!)
      ];

      await Promise.all(uploadPromises);

      // Note: Email is already stored in user profile and visible to admins
      // The email input is for user confirmation/display purposes

      toast({
        title: "Documents Submitted",
        description: "All documents have been submitted for verification. An admin will review them shortly.",
      });
      
      // Update step to show waiting status
      setStep(2);
      
      // Refresh user data to get updated verification status
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit documents",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadDocument = async (type: string, file: File): Promise<void> => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await fetch('/api/documents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload ${type}`);
    }

    return response.json();
  };


  const FileUploadArea = ({ 
    type, 
    title, 
    description, 
    file,
    onFileSelect
  }: { 
    type: string; 
    title: string; 
    description: string; 
    file?: File;
    onFileSelect?: (type: string, file: File) => void;
  }) => (
    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
      <div className="mb-4">
        {file ? (
          <CheckCircle className="mx-auto h-12 w-12 text-success-500" />
        ) : (
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
        )}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">{description}</p>
      
      {file ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-success-600">{file.name}</p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.png,.jpg,.jpeg,.pdf';
              input.onchange = (e) => {
                const newFile = (e.target as HTMLInputElement).files?.[0];
                if (newFile && onFileSelect) {
                  onFileSelect(type, newFile);
                }
              };
              input.click();
            }}
            data-testid={`button-reupload-${type}`}
          >
            Replace File
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">PNG, JPG or PDF (max. 5MB)</p>
          <Input
            type="file"
            accept=".png,.jpg,.jpeg,.pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && onFileSelect) {
                onFileSelect(type, file);
              }
            }}
            className="hidden"
            id={`upload-${type}`}
            data-testid={`input-upload-${type}`}
          />
          <Label htmlFor={`upload-${type}`}>
            <Button variant="outline" asChild className="cursor-pointer">
              <span>Choose File</span>
            </Button>
          </Label>
        </>
      )}
    </div>
  );

  const getVerificationStatus = () => {
    const userStatus = currentUser?.verificationStatus || user?.verificationStatus;
    if (!user) return { status: 'pending', message: 'Please login' };
    
    switch (userStatus) {
      case 'verified':
        return { status: 'verified', message: 'Your identity has been verified' };
      case 'rejected':
        return { status: 'rejected', message: 'Verification was rejected' };
      default:
        // Check if all documents are uploaded
        if (hasAllDocuments()) {
          return { status: 'pending', message: 'Waiting for admin verification' };
        }
        return { status: 'pending', message: 'Please upload all required documents' };
    }
  };

  const verificationStatus = getVerificationStatus();
  const displayUser = currentUser || user;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Please login to access verification</p>
          <Button asChild data-testid="button-login">
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Identity Verification
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Secure CNIC-based verification for all users
          </p>
        </div>

        {/* Verification Status */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  verificationStatus.status === 'verified' 
                    ? 'bg-success-100 text-success-600' 
                    : verificationStatus.status === 'rejected'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-warning-100 text-warning-600'
                }`}>
                  {verificationStatus.status === 'verified' ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : verificationStatus.status === 'rejected' ? (
                    <XCircle className="h-6 w-6" />
                  ) : (
                    <Clock className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Verification Status
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {verificationStatus.message}
                  </p>
                </div>
              </div>
              <Badge 
                variant={verificationStatus.status === 'verified' ? 'default' : 'secondary'}
                className={
                  verificationStatus.status === 'verified' 
                    ? 'bg-success-100 text-success-700'
                    : verificationStatus.status === 'rejected'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-warning-100 text-warning-700'
                }
              >
                {displayUser?.verificationStatus || 'Pending'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {(currentUser?.verificationStatus === 'verified' || user.verificationStatus === 'verified') ? (
          // Already verified view
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="mx-auto h-16 w-16 text-success-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Verification Complete
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your identity has been verified successfully. You can now use all platform features.
              </p>
              <Button 
                onClick={() => setLocation("/")} 
                data-testid="button-continue-to-website"
                className="w-full sm:w-auto"
              >
                Continue to Website
              </Button>
            </CardContent>
          </Card>
        ) : (currentUser?.verificationStatus === 'pending' && hasAllDocuments()) ? (
          // Waiting for verification view - only show if documents are uploaded
          <Card>
            <CardContent className="p-8 text-center">
              <Clock className="mx-auto h-16 w-16 text-warning-500 mb-4 animate-pulse" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Waiting for Verification
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your documents have been submitted and are currently under review by our admin team. 
                You will be notified once the verification is complete.
              </p>
              <div className="space-y-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Processing time: 24-48 hours
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          // Verification process
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-8 border border-gray-200 dark:border-gray-700">
            {/* Progress Steps */}
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step >= 1 ? 'bg-primary-500 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  1
                </div>
                <span className={`font-medium ${step >= 1 ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                  Upload Documents
                </span>
              </div>
              <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600 mx-4"></div>
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step >= 2 ? 'bg-primary-500 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  2
                </div>
                <span className={`font-medium ${step >= 2 ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                  Admin Review
                </span>
              </div>
              <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600 mx-4"></div>
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step >= 3 ? 'bg-primary-500 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  3
                </div>
                <span className={`font-medium ${step >= 3 ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                  Verification Complete
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Document Upload */}
              <div className="space-y-6">
                <FileUploadArea
                  type="cnicFront"
                  title="CNIC Front Side *"
                  description="Clear photo of the front of your CNIC"
                  file={documents.find((d: any) => d.type === 'cnicFront') ? new File([], documents.find((d: any) => d.type === 'cnicFront').fileName) : uploadedFiles.cnicFront}
                  onFileSelect={handleFileSelect}
                />

                <FileUploadArea
                  type="cnicBack"
                  title="CNIC Back Side *"
                  description="Clear photo of the back of your CNIC"
                  file={documents.find((d: any) => d.type === 'cnicBack') ? new File([], documents.find((d: any) => d.type === 'cnicBack').fileName) : uploadedFiles.cnicBack}
                  onFileSelect={handleFileSelect}
                />

                <FileUploadArea
                  type="additional"
                  title={user.role === 'landlord' ? "Real Estate License *" : "Additional Documents *"}
                  description={user.role === 'landlord' ? "Upload your valid Real Estate License" : "Bank statement, employment letter, etc."}
                  file={documents.find((d: any) => d.type === 'additional') ? new File([], documents.find((d: any) => d.type === 'additional').fileName) : uploadedFiles.additional}
                  onFileSelect={handleFileSelect}
                />
              </div>

              {/* Information Panel */}
              <div className="space-y-6">
                {/* Security Notice */}
                <Card className="bg-primary-50 dark:bg-primary-900 border-primary-200 dark:border-primary-700">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-3">
                      <Shield className="text-primary-500 dark:text-primary-300 mt-1 h-5 w-5" />
                      <div>
                        <h4 className="text-primary-900 dark:text-white font-semibold mb-2">
                          Secure & Encrypted
                        </h4>
                        <p className="text-primary-700 dark:text-primary-100 text-sm">
                          Your documents are encrypted and stored securely. We only use them for verification purposes.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Processing Time */}
                <Card className="bg-warning-50 dark:bg-primary-900 border-warning-200 dark:border-primary-700">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-3">
                      <Clock className="text-warning-500 dark:text-primary-300 mt-1 h-5 w-5" />
                      <div>
                        <h4 className="text-warning-900 dark:text-white font-semibold mb-2">
                          Processing Time
                        </h4>
                        <p className="text-warning-700 dark:text-primary-100 text-sm">
                          Manual verification typically takes 24-48 hours. You'll receive an email notification once complete.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Requirements */}
                <Card>
                  <CardHeader>
                    <CardTitle>Document Requirements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-success-500" />
                        <span>Clear, high-quality images</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-success-500" />
                        <span>All corners and edges visible</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-success-500" />
                        <span>Valid Pakistani CNIC</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-success-500" />
                        <span>No glare or shadows</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Email Input */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Contact Email
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label htmlFor="contact-email">Email Address *</Label>
                      <Input
                        id="contact-email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        required
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        This email will be visible to admins during verification. We'll use it to notify you about your verification status.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Submit Button */}
                <div className="space-y-2">
                  <Button 
                    className="w-full" 
                    data-testid="button-submit-verification"
                    onClick={handleSubmitAllDocuments}
                    disabled={
                      isSubmitting || 
                      !uploadedFiles.cnicFront || 
                      !uploadedFiles.cnicBack || 
                      !uploadedFiles.additional || 
                      !contactEmail ||
                      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)
                    }
                  >
                    <IdCard className="mr-2 h-4 w-4" />
                    {isSubmitting ? 'Submitting All Documents...' : 'Submit All Documents for Verification'}
                  </Button>
                  
                  {(!uploadedFiles.cnicFront || !uploadedFiles.cnicBack || !uploadedFiles.additional || !contactEmail) && (
                    <div className="text-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {!contactEmail && "⚠️ Email required. "}
                        {!uploadedFiles.cnicFront && "⚠️ CNIC Front required. "}
                        {!uploadedFiles.cnicBack && "⚠️ CNIC Back required. "}
                        {!uploadedFiles.additional && `⚠️ ${user.role === 'landlord' ? 'Real Estate License' : 'Additional Documents'} required.`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
