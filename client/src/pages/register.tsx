import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Home, Eye, EyeOff, User, Building } from "lucide-react";

export default function Register() {
  const [, setLocation] = useLocation();
  const { register, registerWithGoogle } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    role: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.role) {
      toast({
        title: "Error",
        description: "Please select your role",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      await register(formData);
      toast({
        title: "Success",
        description: "Account created successfully! Please verify your identity to start using the platform.",
      });
      setLocation("/verification");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Registration failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGoogleSignUp = async () => {
    if (!formData.role) {
      toast({
        title: "Error",
        description: "Please select your role first",
        variant: "destructive",
      });
      return;
    }

    setGoogleLoading(true);
    try {
      await registerWithGoogle(formData.role);
      toast({
        title: "Success",
        description: "Account created with Google successfully! Please verify your identity to start using the platform.",
      });
      setLocation("/verification");
    } catch (error: any) {
      console.error("Google sign-up error:", error);
      let errorMessage = "Google registration failed";
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = "Sign-in popup was closed. Please try again.";
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = "Popup was blocked by your browser. Please allow popups for this site and try again.";
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (error.code) {
        errorMessage = `Authentication error: ${error.code}`;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-sm w-full space-y-6">
        {/* Logo and Heading */}
        <div className="flex flex-col items-center justify-center gap-2 mt-2">
          <Link href="/" className="flex items-center justify-center mb-2" data-testid="link-home">
            <div className="h-24 w-24 overflow-hidden flex items-center justify-center rounded-full shadow-md bg-white">
              <img 
                src="/uploads/logo.png" 
                alt="SmartRent Logo" 
                className="h-full w-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.parentElement?.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            </div>
            <div className="h-24 w-24 bg-primary-500 rounded-full flex items-center justify-center hidden">
              <Home className="text-white h-12 w-12" />
            </div>
          </Link>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center">
            Create your account
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Join Pakistan's first blockchain-powered rental platform
          </p>
        </div>

        {/* Registration Form */}
        <Card className="bg-white dark:bg-gray-800 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-center">Sign Up</CardTitle>
            <CardDescription className="text-center">
              Enter your details to create your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label>I am a</Label>
                <Select value={formData.role} onValueChange={(value) => updateField('role', value)}>
                  <SelectTrigger className="mt-1" data-testid="select-role">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenant">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>Tenant - Looking for property</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="landlord">
                      <div className="flex items-center space-x-2">
                        <Building className="h-4 w-4" />
                        <span>Landlord - Renting property</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => updateField('fullName', e.target.value)}
                  placeholder="Enter your full name"
                  className="mt-1"
                  data-testid="input-full-name"
                />
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="Enter your email"
                  className="mt-1"
                  data-testid="input-email"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+92 300 1234567"
                  className="mt-1"
                  data-testid="input-phone"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    placeholder="Create a strong password"
                    data-testid="input-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Must be at least 8 characters with letters and numbers
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !formData.role}
                data-testid="button-register"
              >
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Or continue with</span>
                </div>
              </div>

              <div className="mt-6">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleGoogleSignUp}
                  disabled={googleLoading || loading || !formData.role}
                  data-testid="button-google-register"
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  {googleLoading ? "Creating account..." : "Sign up with Google"}
                </Button>
              </div>

              <div className="mt-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Already have an account?</span>
                  </div>
                </div>

                <div className="mt-6">
                  <Button variant="outline" className="w-full" asChild data-testid="button-login">
                    <Link href="/login">
                      Sign in to your account
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
