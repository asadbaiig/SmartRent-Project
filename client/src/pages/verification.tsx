import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { 
  Upload, 
  Shield, 
  Clock, 
  CheckCircle, 
  XCircle,
  FileText,
  AlertCircle,
  IdCard,
  User
} from "lucide-react";

export default function Verification() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [uploadedFiles, setUploadedFiles] = useState<{
    cnicFront?: File;
    cnicBack?: File;
    additional?: File[];
  }>({});

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
  });

  const handleFileUpload = async (type: string, file: File) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to upload documents",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload document');

      const document = await response.json();
      
      toast({
        title: "Upload Successful",
        description: "Document uploaded successfully for verification",
      });

      setUploadedFiles(prev => ({ ...prev, [type]: file }));
      
      // Move to next step
      if (type === 'cnicFront') setStep(2);
      if (type === 'cnicBack') setStep(3);
      
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
    }
  };

  const FileUploadArea = ({ 
    type, 
    title, 
    description, 
    file 
  }: { 
    type: string; 
    title: string; 
    description: string; 
    file?: File;
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
                if (newFile) handleFileUpload(type, newFile);
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
              if (file) handleFileUpload(type, file);
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
    if (!user) return { status: 'pending', message: 'Please login' };
    
    switch (user.verificationStatus) {
      case 'verified':
        return { status: 'verified', message: 'Your identity has been verified' };
      case 'rejected':
        return { status: 'rejected', message: 'Verification was rejected' };
      default:
        return { status: 'pending', message: 'Verification is pending review' };
    }
  };

  const verificationStatus = getVerificationStatus();

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
                {user.verificationStatus || 'Pending'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {user.verificationStatus === 'verified' ? (
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
              <Button asChild data-testid="button-go-to-dashboard">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
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
                  title="CNIC Front Side"
                  description="Clear photo of the front of your CNIC"
                  file={uploadedFiles.cnicFront}
                />

                <FileUploadArea
                  type="cnicBack"
                  title="CNIC Back Side"
                  description="Clear photo of the back of your CNIC"
                  file={uploadedFiles.cnicBack}
                />

                <FileUploadArea
                  type="additional"
                  title={user.role === 'landlord' ? "Real Estate License" : "Additional Documents (Optional)"}
                  description={user.role === 'landlord' ? "Upload your valid Real Estate License" : "Bank statement, employment letter, etc."}
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

                {/* Submit Button */}
                {uploadedFiles.cnicFront && uploadedFiles.cnicBack && (
                  <Button className="w-full" data-testid="button-submit-verification">
                    <IdCard className="mr-2 h-4 w-4" />
                    Submit for Verification
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
