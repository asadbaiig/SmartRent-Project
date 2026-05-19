import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/theme-provider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Bell, Moon, Sun, User, LogOut, Shield, FileText, CheckCheck, Link2, Menu } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  contractId?: string;
  propertyId?: string;
  blockchainHash?: string;
  isRead: boolean;
  createdAt: string;
}

export function Header() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Fetch real notifications from API
  const { data: dbNotifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
    refetchInterval: 30000, // Poll every 30s
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("token");
      await fetch(`/api/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token");
      await fetch("/api/notifications/read-all", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  // Merge verification status notification with DB notifications
  const verificationNotif: Notification[] = user
    ? user.verificationStatus !== "verified"
      ? [
          {
            id: "verification",
            type: "general",
            title: "Verification In Review",
            message: "We are reviewing your submitted documents. We'll notify you once verification is complete.",
            isRead: false,
            createdAt: new Date().toISOString(),
          },
        ]
      : []
    : [];

  const notifications = [...verificationNotif, ...dbNotifications];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const mobileLinks = [
    { href: "/", label: "Home", show: true },
    { href: "/properties", label: "Properties", show: true },
    { href: "/dashboard", label: "Dashboard", show: !!user && user.role !== "admin" },
    { href: "/admin/portal", label: "Admin Portal", show: !!user && user.role === "admin" },
    { href: "/contracts", label: "Contracts", show: !!user },
    { href: "/payments", label: "Payments", show: !!user },
    { href: "/disputes", label: "Disputes", show: !!user },
    { href: "/verification", label: "Verification", show: !!user && user.role !== "admin" },
  ].filter((item) => item.show);

  return (
    <header className="bg-white/85 dark:bg-slate-950/85 backdrop-blur-md shadow-sm border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-50">
      <div className="w-full px-3 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center" data-testid="link-home">
            <div className="flex-shrink-0 flex items-center">
              <img 
                src="/uploads/logo.png" 
                alt="SmartRent Logo" 
                className="h-16 w-auto object-contain"
              />
            </div>
          </Link>

          {/* Navigation - Centered */}
          <nav className="hidden md:flex space-x-8 absolute left-1/2 transform -translate-x-1/2">
            <Link 
              href="/" 
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                location === '/' 
                  ? 'text-primary-600 dark:text-accent' 
                  : 'text-gray-500 dark:text-gray-300 hover:text-primary-600 dark:hover:text-accent'
              }`}
              data-testid="link-home-tab"
            >
              Home
            </Link>
            <Link 
              href="/properties" 
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                location === '/properties' 
                  ? 'text-primary-600 dark:text-accent' 
                  : 'text-gray-500 dark:text-gray-300 hover:text-primary-600 dark:hover:text-accent'
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
                      ? 'text-primary-600 dark:text-accent' 
                      : 'text-gray-500 dark:text-gray-300 hover:text-primary-600 dark:hover:text-accent'
                  }`}
                  data-testid="link-contracts"
                >
                  Contracts
                </Link>
                <Link 
                  href="/payments" 
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    location === '/payments' 
                      ? 'text-primary-600 dark:text-accent' 
                      : 'text-gray-500 dark:text-gray-300 hover:text-primary-600 dark:hover:text-accent'
                  }`}
                  data-testid="link-payments"
                >
                  Payments
                </Link>
              </>
            )}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center space-x-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden" aria-label="Open navigation" data-testid="button-mobile-menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {mobileLinks.map((item) => (
                  <DropdownMenuItem asChild key={item.href}>
                    <Link href={item.href} className="flex items-center justify-between" data-testid={`link-mobile-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
                      <span>{item.label}</span>
                      {location === item.href && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </Link>
                  </DropdownMenuItem>
                ))}
                {!user && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/login">Login</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/register">Register</Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="relative" data-testid="button-notifications">
                      <Bell className="h-5 w-5" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 bg-warning-500 text-white text-xs rounded-full flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-96 max-h-[420px] overflow-y-auto bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <DropdownMenuLabel className="p-0 text-lg font-bold text-gray-900 dark:text-white">Notifications</DropdownMenuLabel>
                        {unreadCount > 0 && (
                          <button
                            onClick={() => markAllRead.mutate()}
                            className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
                          >
                            <CheckCheck className="h-4 w-4" /> Mark all read
                          </button>
                        )}
                      </div>
                      <div className="px-2 py-2">
                        {notifications.length === 0 ? (
                          <div className="px-3 py-6 text-sm text-gray-500 text-center">
                            You're all caught up. No new notifications.
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <DropdownMenuItem
                              key={notification.id}
                              className={`transition-all duration-150 flex flex-col items-start gap-2 cursor-pointer rounded-lg px-3 py-3 mb-2 shadow-sm border border-gray-100 dark:border-gray-800 ${
                                notification.isRead ? "opacity-60" : "bg-primary/10 border-primary"
                              } hover:bg-primary/20 hover:border-primary/60`}
                              onClick={() => {
                                if (!notification.isRead && notification.id !== "verification") {
                                  markRead.mutate(notification.id);
                                }
                                if (notification.contractId) {
                                  setLocation("/contracts");
                                }
                              }}
                            >
                              <div className="flex items-center gap-3 w-full">
                                {notification.type === "contract_modified" ? (
                                  <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900">
                                    <FileText className="h-5 w-5 text-amber-600 dark:text-amber-300" />
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900">
                                    <Bell className="h-5 w-5 text-primary-600 dark:text-primary-300" />
                                  </span>
                                )}
                                <div className="flex-1">
                                  <span className="text-base font-semibold text-gray-900 dark:text-white">
                                    {notification.title}
                                  </span>
                                  <span className="block text-xs text-gray-500 dark:text-gray-300 mt-1">
                                    {notification.message}
                                  </span>
                                  {notification.blockchainHash && (
                                    <span className="block text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-mono">
                                      <Link2 className="inline h-4 w-4 mr-1" />
                                      <a href={`https://etherscan.io/tx/${notification.blockchainHash}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-800">
                                        {notification.blockchainHash.slice(0, 10)}...{notification.blockchainHash.slice(-8)}
                                      </a>
                                    </span>
                                  )}
                                </div>
                                {!notification.isRead && (
                                  <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                                )}
                              </div>
                              <span className="text-[11px] text-gray-400 mt-1">
                                {notification.type === "contract_modified" ? "Edited on: " : ""}
                                {new Date(notification.createdAt).toLocaleString()}
                              </span>
                            </DropdownMenuItem>
                          ))
                        )}
                      </div>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-3" data-testid="button-user-menu">
                      <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                        <span className="hidden sm:block text-sm text-gray-700 dark:text-gray-300">{user.fullName}</span>
                        {user.verificationStatus === 'verified' && (
                          <Badge 
                            variant="default"
                            className="hidden sm:block text-xs bg-success-100 text-success-700"
                          >
                            Verified
                          </Badge>
                        )}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {user.role === 'admin' ? (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/admin/portal" className="flex items-center" data-testid="link-admin-portal">
                            <Shield className="mr-2 h-4 w-4" />
                            Admin Portal
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                          <LogOut className="mr-2 h-4 w-4" />
                          Logout
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
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
