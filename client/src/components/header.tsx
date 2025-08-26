import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Bell, Home, Moon, Sun, User, LogOut } from "lucide-react";

export function Header() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center" data-testid="link-home">
            <div className="flex-shrink-0 flex items-center">
              <div className="h-8 w-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <Home className="text-white text-lg" />
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">SmartRent</span>
              <Badge variant="secondary" className="ml-2 text-xs bg-primary-100 text-primary-700">BETA</Badge>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            <Link 
              href="/properties" 
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                location === '/properties' 
                  ? 'text-gray-900 dark:text-white' 
                  : 'text-gray-500 dark:text-gray-300 hover:text-primary-600'
              }`}
              data-testid="link-properties"
            >
              Properties
            </Link>
            {user && (
              <>
                <Link 
                  href="/contracts" 
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    location === '/contracts' 
                      ? 'text-gray-900 dark:text-white' 
                      : 'text-gray-500 dark:text-gray-300 hover:text-primary-600'
                  }`}
                  data-testid="link-contracts"
                >
                  Contracts
                </Link>
                <Link 
                  href="/payments" 
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    location === '/payments' 
                      ? 'text-gray-900 dark:text-white' 
                      : 'text-gray-500 dark:text-gray-300 hover:text-primary-600'
                  }`}
                  data-testid="link-payments"
                >
                  Payments
                </Link>
              </>
            )}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              data-testid="button-theme-toggle"
            >
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
            
            {user ? (
              <>
                {/* Notifications */}
                <Button variant="ghost" size="sm" className="relative" data-testid="button-notifications">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-warning-500 text-white text-xs rounded-full flex items-center justify-center">3</span>
                </Button>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-3" data-testid="button-user-menu">
                      <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                        <span className="hidden sm:block text-sm text-gray-700 dark:text-gray-300">{user.fullName}</span>
                        <Badge 
                          variant={user.verificationStatus === 'verified' ? 'default' : 'secondary'}
                          className={`hidden sm:block text-xs ${
                            user.verificationStatus === 'verified' 
                              ? 'bg-success-100 text-success-700' 
                              : 'bg-warning-100 text-warning-700'
                          }`}
                        >
                          {user.verificationStatus === 'verified' ? 'Verified' : 'Pending'}
                        </Badge>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="flex items-center" data-testid="link-dashboard">
                        <User className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/verification" className="flex items-center" data-testid="link-verification">
                        <User className="mr-2 h-4 w-4" />
                        Verification
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex space-x-2">
                <Button variant="ghost" asChild data-testid="button-login">
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild data-testid="button-register">
                  <Link href="/register">Register</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
