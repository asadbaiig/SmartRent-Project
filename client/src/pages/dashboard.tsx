import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { 
  Home, 
  FileText, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  CreditCard, 
  Calendar, 
  Heart, 
  Plus, 
  Bot, 
  Users, 
  Gavel,
  BarChart,
  IdCard
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    if (user?.role === 'landlord') return 'landlord';
    if (user?.role === 'tenant') return 'tenant';
    if (user?.role === 'admin') return 'admin';
    return 'landlord';
  });

  // Fetch dashboard stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Please login to view your dashboard</p>
          <Button asChild data-testid="button-login">
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  const renderLandlordDashboard = () => (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900 dark:to-primary-800 border-primary-200 dark:border-primary-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-600 dark:text-primary-300 text-sm font-medium">Total Properties</p>
                <p className="text-2xl font-bold text-primary-900 dark:text-primary-100">
                  {isLoading ? '...' : stats?.totalProperties || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center">
                <Home className="text-white h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success-50 to-success-100 dark:from-success-900 dark:to-success-800 border-success-200 dark:border-success-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-success-600 dark:text-success-300 text-sm font-medium">Active Contracts</p>
                <p className="text-2xl font-bold text-success-900 dark:text-success-100">
                  {isLoading ? '...' : stats?.activeContracts || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-success-500 rounded-lg flex items-center justify-center">
                <FileText className="text-white h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning-50 to-warning-100 dark:from-warning-900 dark:to-warning-800 border-warning-200 dark:border-warning-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-warning-600 dark:text-warning-300 text-sm font-medium">Monthly Revenue</p>
                <p className="text-2xl font-bold text-warning-900 dark:text-warning-100">
                  {isLoading ? '...' : `₨${Number(stats?.monthlyRevenue || 0).toLocaleString()}`}
                </p>
              </div>
              <div className="w-12 h-12 bg-warning-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-white h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-gray-200 dark:border-gray-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">Pending Verifications</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {isLoading ? '...' : stats?.pendingVerifications || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-500 rounded-lg flex items-center justify-center">
                <Clock className="text-white h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-success-100 dark:bg-success-900 rounded-full flex items-center justify-center">
                    <CheckCircle className="text-success-600 dark:text-success-400 h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">New contract signed for property</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">2 hours ago</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                    <CreditCard className="text-primary-600 dark:text-primary-400 h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">Rent payment received</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">1 day ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button className="w-full justify-start" asChild data-testid="button-add-property">
                  <Link href="/properties/new">
                    <Plus className="mr-3 h-4 w-4" />
                    Add New Property
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild data-testid="button-create-contract">
                  <Link href="/contracts/new">
                    <FileText className="mr-3 h-4 w-4" />
                    Create Contract
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild data-testid="button-ai-pricing">
                  <Link href="/ai-pricing">
                    <Bot className="mr-3 h-4 w-4" />
                    Get AI Price Suggestion
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderTenantDashboard = () => (
    <div className="space-y-8">
      {/* Stats Cards for Tenant */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900 dark:to-primary-800 border-primary-200 dark:border-primary-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-600 dark:text-primary-300 text-sm font-medium">Current Rent</p>
                <p className="text-2xl font-bold text-primary-900 dark:text-primary-100">
                  {isLoading ? '...' : `₨${Number(stats?.currentRent || 0).toLocaleString()}`}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center">
                <Home className="text-white h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success-50 to-success-100 dark:from-success-900 dark:to-success-800 border-success-200 dark:border-success-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-success-600 dark:text-success-300 text-sm font-medium">Contract Status</p>
                <p className="text-lg font-bold text-success-900 dark:text-success-100">
                  {isLoading ? '...' : stats?.contractStatus === 'active' ? 'Active' : 'None'}
                </p>
              </div>
              <div className="w-12 h-12 bg-success-500 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-white h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning-50 to-warning-100 dark:from-warning-900 dark:to-warning-800 border-warning-200 dark:border-warning-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-warning-600 dark:text-warning-300 text-sm font-medium">Next Payment</p>
                <p className="text-lg font-bold text-warning-900 dark:text-warning-100">
                  {isLoading ? '...' : stats?.nextPaymentDate ? new Date(stats.nextPaymentDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div className="w-12 h-12 bg-warning-500 rounded-lg flex items-center justify-center">
                <Calendar className="text-white h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-gray-200 dark:border-gray-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">Saved Properties</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {isLoading ? '...' : stats?.savedProperties || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-500 rounded-lg flex items-center justify-center">
                <Heart className="text-white h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions for Tenant */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Current Property</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.contractStatus === 'active' ? (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">You have an active rental</p>
                <p className="font-semibold text-gray-900 dark:text-white">Monthly Rent: ₨{Number(stats?.currentRent || 0).toLocaleString()}</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400 mb-4">No active rental</p>
                <Button asChild data-testid="button-search-properties">
                  <Link href="/properties">Search Properties</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full justify-start" asChild data-testid="button-pay-rent">
                <Link href="/payments">
                  <CreditCard className="mr-3 h-4 w-4" />
                  Pay Rent
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild data-testid="button-search-properties">
                <Link href="/properties">
                  <Home className="mr-3 h-4 w-4" />
                  Search Properties
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild data-testid="button-upload-documents">
                <Link href="/verification">
                  <IdCard className="mr-3 h-4 w-4" />
                  Upload Documents
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderAdminDashboard = () => (
    <div className="space-y-8">
      {/* Admin Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900 dark:to-primary-800 border-primary-200 dark:border-primary-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-600 dark:text-primary-300 text-sm font-medium">Total Users</p>
                <p className="text-2xl font-bold text-primary-900 dark:text-primary-100">
                  {isLoading ? '...' : stats?.totalUsers || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center">
                <Users className="text-white h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning-50 to-warning-100 dark:from-warning-900 dark:to-warning-800 border-warning-200 dark:border-warning-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-warning-600 dark:text-warning-300 text-sm font-medium">Pending Verifications</p>
                <p className="text-2xl font-bold text-warning-900 dark:text-warning-100">
                  {isLoading ? '...' : stats?.pendingVerifications || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-warning-500 rounded-lg flex items-center justify-center">
                <Clock className="text-white h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success-50 to-success-100 dark:from-success-900 dark:to-success-800 border-success-200 dark:border-success-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-success-600 dark:text-success-300 text-sm font-medium">Active Contracts</p>
                <p className="text-2xl font-bold text-success-900 dark:text-success-100">
                  {isLoading ? '...' : stats?.activeContracts || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-success-500 rounded-lg flex items-center justify-center">
                <FileText className="text-white h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800 border-red-200 dark:border-red-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 dark:text-red-300 text-sm font-medium">Open Disputes</p>
                <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                  {isLoading ? '...' : stats?.openDisputes || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                <Gavel className="text-white h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Verification Queue</CardTitle>
            <Badge variant="secondary" className="w-fit">{stats?.pendingVerifications || 0} Pending</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {stats?.pendingVerifications || 0} users waiting for verification
              </p>
              <Button className="w-full" asChild data-testid="button-review-verifications">
                <Link href="/admin/verifications">
                  <IdCard className="mr-2 h-4 w-4" />
                  Review Verifications
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admin Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full justify-start" variant="outline" asChild data-testid="button-manage-disputes">
                <Link href="/admin/disputes">
                  <Gavel className="mr-3 h-4 w-4" />
                  Manage Disputes
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild data-testid="button-system-analytics">
                <Link href="/admin/analytics">
                  <BarChart className="mr-3 h-4 w-4" />
                  System Analytics
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user.fullName}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Here's what's happening with your {user.role === 'admin' ? 'platform' : user.role === 'landlord' ? 'properties' : 'rentals'}
          </p>
        </div>

        {/* Show role-based tabs for admin */}
        {user.role === 'admin' ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="landlord" data-testid="tab-landlord">Landlord View</TabsTrigger>
              <TabsTrigger value="tenant" data-testid="tab-tenant">Tenant View</TabsTrigger>
              <TabsTrigger value="admin" data-testid="tab-admin">Admin View</TabsTrigger>
            </TabsList>
            <TabsContent value="landlord">{renderLandlordDashboard()}</TabsContent>
            <TabsContent value="tenant">{renderTenantDashboard()}</TabsContent>
            <TabsContent value="admin">{renderAdminDashboard()}</TabsContent>
          </Tabs>
        ) : user.role === 'landlord' ? (
          renderLandlordDashboard()
        ) : (
          renderTenantDashboard()
        )}
      </div>
    </div>
  );
}
