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
  Users,
  Gavel,
  BarChart,
  IdCard,
  ChevronRight,
} from "lucide-react";
import { AnalyticsChart } from "@/components/analytics-chart";
import { DashboardWeatherSheet } from "@/components/dashboard-weather-sheet";
import { WeatherWidget } from "@/components/weather-widget";
import { MarketInsights } from "@/components/market-insights";

export default function Dashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    if (user?.role === "admin") return "admin";
    if (user?.role === "landlord") return "landlord";
    if (user?.role === "tenant") return "tenant";
    return "landlord";
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/dashboard/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
    enabled: !!user,
  });

  const { data: firstProperty } = useQuery({
    queryKey: ["/api/properties", "first", user?.id],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/properties?landlordOnly=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return null;
      const properties = await response.json();
      return properties[0] || null;
    },
    enabled: !!user && user.role === "landlord",
  });

  const { data: tenantContracts } = useQuery({
    queryKey: ["/api/contracts", "active"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/contracts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return [];
      const contracts = await response.json();
      return contracts.filter((c: any) => c.status === "active");
    },
    enabled: !!user && user.role === "tenant",
  });

  const tenantPropertyId = tenantContracts?.[0]?.propertyId;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Access denied</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">Sign in to view your dashboard.</p>
          <Button asChild data-testid="button-login">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  const roleLabel = user.role === "admin" ? "platform" : user.role === "landlord" ? "properties" : "rentals";

  const StatCard = ({
    label,
    value,
    icon: Icon,
    accent = "slate",
  }: {
    label: string;
    value: string | number;
    icon: React.ElementType;
    accent?: "slate" | "emerald" | "amber" | "red";
  }) => {
    const styles = {
      slate: "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300",
      emerald: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200",
      amber: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200",
      red: "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200",
    };
    const iconBg = {
      slate: "bg-slate-200/80 dark:bg-slate-700",
      emerald: "bg-emerald-200/80 dark:bg-emerald-800",
      amber: "bg-amber-200/80 dark:bg-amber-800",
      red: "bg-red-200/80 dark:bg-red-800",
    };
    return (
      <Card className={`border ${styles[accent]}`}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium opacity-90 truncate">{label}</p>
              <p className="text-2xl font-semibold tracking-tight mt-1 truncate">{value}</p>
            </div>
            <div className={`shrink-0 w-11 h-11 rounded-lg flex items-center justify-center ${iconBg[accent]}`}>
              <Icon className="h-5 w-5 text-current opacity-90" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderLandlordDashboard = () => (
    <div className="space-y-8" data-dashboard-version="2025-v2">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total properties"
          value={isLoading ? "—" : stats?.totalProperties ?? 0}
          icon={Home}
          accent="slate"
        />
        <StatCard
          label="Active contracts"
          value={isLoading ? "—" : stats?.activeContracts ?? 0}
          icon={FileText}
          accent="emerald"
        />
        <StatCard
          label="Monthly revenue"
          value={isLoading ? "—" : `₨${Number(stats?.monthlyRevenue ?? 0).toLocaleString()}`}
          icon={TrendingUp}
          accent="amber"
        />
        <StatCard
          label="Pending verifications"
          value={isLoading ? "—" : stats?.pendingVerifications ?? 0}
          icon={Clock}
          accent="slate"
        />
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsChart type="revenue" chartStyle="area" />
        <AnalyticsChart type="properties" chartStyle="bar" />
      </div>

      {/* Main content + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2">
          <MarketInsights className="h-full border-2 border-slate-300 dark:border-slate-600 shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-600/50 rounded-lg" />
        </div>

        <div className="flex">
          <Card className="w-full overflow-hidden flex flex-col">
            <CardHeader className="shrink-0 px-5 pt-5 pb-4 border-b border-slate-200/80 dark:border-slate-700/80">
              <CardTitle className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col px-5 py-4">
              <div className="space-y-2.5">
                <Button
                  className="w-full h-11 justify-between rounded-md px-4 font-medium text-sm"
                  asChild
                  data-testid="button-add-property"
                >
                  <Link href="/list-property">
                    <span className="flex items-center gap-3">
                      <Plus className="h-4 w-4 shrink-0" aria-hidden />
                      <span>Add property</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-11 justify-between rounded-md px-4 font-medium text-sm border-slate-200 dark:border-slate-700"
                  asChild
                  data-testid="button-create-contract"
                >
                  <Link href="/contracts/new">
                    <span className="flex items-center gap-3">
                      <FileText className="h-4 w-4 shrink-0" aria-hidden />
                      <span>Create contract</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-11 justify-between rounded-md px-4 font-medium text-sm border-slate-200 dark:border-slate-700"
                  asChild
                  data-testid="button-disputes"
                >
                  <Link href="/disputes">
                    <span className="flex items-center gap-3">
                      <Gavel className="h-4 w-4 shrink-0" aria-hidden />
                      <span>Disputes</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
                  </Link>
                </Button>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-700/80 flex-1">
                <WeatherWidget city={firstProperty?.city} propertyId={firstProperty?.id} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderTenantDashboard = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Current rent"
          value={isLoading ? "—" : `₨${Number(stats?.currentRent ?? 0).toLocaleString()}`}
          icon={Home}
          accent="slate"
        />
        <StatCard
          label="Contract status"
          value={isLoading ? "—" : stats?.contractStatus === "active" ? "Active" : "None"}
          icon={CheckCircle}
          accent="emerald"
        />
        <StatCard
          label="Next payment"
          value={isLoading ? "—" : stats?.nextPaymentDate ? new Date(stats.nextPaymentDate).toLocaleDateString() : "N/A"}
          icon={Calendar}
          accent="amber"
        />
        <StatCard
          label="Saved properties"
          value={isLoading ? "—" : stats?.savedProperties ?? 0}
          icon={Heart}
          accent="slate"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsChart type="payments" chartStyle="area" />
        <AnalyticsChart type="savedProperties" chartStyle="bar" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Current property</CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.contractStatus === "active" ? (
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Active rental</p>
                  <p className="font-semibold text-slate-900 dark:text-white">₨{Number(stats?.currentRent ?? 0).toLocaleString()} / month</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-500 dark:text-slate-400 mb-4">No active rental</p>
                  <Button asChild data-testid="button-search-properties">
                    <Link href="/properties">Find properties</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="w-full overflow-hidden">
            <CardHeader className="shrink-0 px-5 pt-5 pb-4 border-b border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">Quick actions</CardTitle>
                <DashboardWeatherSheet propertyId={tenantPropertyId} triggerLabel="Weather" />
              </div>
            </CardHeader>
            <CardContent className="px-5 py-4 space-y-2.5">
              <Button
                className="w-full h-11 justify-between rounded-md px-4 font-medium text-sm"
                asChild
                data-testid="button-pay-rent"
              >
                <Link href="/payments">
                  <span className="flex items-center gap-3">
                    <CreditCard className="h-4 w-4 shrink-0" aria-hidden />
                    <span>Pay rent</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full h-11 justify-between rounded-md px-4 font-medium text-sm border-slate-200 dark:border-slate-700"
                asChild
                data-testid="button-search-properties"
              >
                <Link href="/properties">
                  <span className="flex items-center gap-3">
                    <Home className="h-4 w-4 shrink-0" aria-hidden />
                    <span>Search properties</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full h-11 justify-between rounded-md px-4 font-medium text-sm border-slate-200 dark:border-slate-700"
                asChild
                data-testid="button-upload-documents"
              >
                <Link href="/verification">
                  <span className="flex items-center gap-3">
                    <IdCard className="h-4 w-4 shrink-0" aria-hidden />
                    <span>Upload documents</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full h-11 justify-between rounded-md px-4 font-medium text-sm border-slate-200 dark:border-slate-700"
                asChild
                data-testid="button-disputes-tenant"
              >
                <Link href="/disputes">
                  <span className="flex items-center gap-3">
                    <Gavel className="h-4 w-4 shrink-0" aria-hidden />
                    <span>Disputes</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderAdminDashboard = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total users" value={isLoading ? "—" : stats?.totalUsers ?? 0} icon={Users} accent="slate" />
        <StatCard label="Pending verifications" value={isLoading ? "—" : stats?.pendingVerifications ?? 0} icon={Clock} accent="amber" />
        <StatCard label="Active contracts" value={isLoading ? "—" : stats?.activeContracts ?? 0} icon={FileText} accent="emerald" />
        <StatCard label="Open disputes" value={isLoading ? "—" : stats?.openDisputes ?? 0} icon={Gavel} accent="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsChart type="revenue" chartStyle="area" />
        <AnalyticsChart type="properties" chartStyle="bar" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Verification queue</CardTitle>
              <Badge variant="secondary">{stats?.pendingVerifications ?? 0} pending</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {stats?.pendingVerifications ?? 0} users awaiting verification
            </p>
            <Button className="w-full" asChild data-testid="button-review-verifications">
              <Link href="/admin/portal">
                <IdCard className="mr-2 h-4 w-4" />
                Open admin portal
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Admin actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-between" asChild data-testid="button-manage-disputes">
              <Link href="/disputes">
                <span className="flex items-center gap-2">
                  <Gavel className="h-4 w-4" />
                  Manage disputes
                </span>
                <ChevronRight className="h-4 w-4 opacity-50" />
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-between" asChild data-testid="button-system-analytics">
              <Link href="/admin/analytics">
                <span className="flex items-center gap-2">
                  <BarChart className="h-4 w-4" />
                  System analytics
                </span>
                <ChevronRight className="h-4 w-4 opacity-50" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Welcome back, {user.fullName}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm">
            Overview of your {roleLabel}
          </p>
        </div>

        {user.role === "admin" ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="grid w-full grid-cols-3 max-w-md bg-slate-200/80 dark:bg-slate-800 p-1 rounded-lg">
              <TabsTrigger value="landlord" data-testid="tab-landlord">Landlord</TabsTrigger>
              <TabsTrigger value="tenant" data-testid="tab-tenant">Tenant</TabsTrigger>
              <TabsTrigger value="admin" data-testid="tab-admin">Admin</TabsTrigger>
            </TabsList>
            <TabsContent value="landlord" className="mt-6">{renderLandlordDashboard()}</TabsContent>
            <TabsContent value="tenant" className="mt-6">{renderTenantDashboard()}</TabsContent>
            <TabsContent value="admin" className="mt-6">{renderAdminDashboard()}</TabsContent>
          </Tabs>
        ) : user.role === "landlord" ? (
          renderLandlordDashboard()
        ) : (
          renderTenantDashboard()
        )}
      </div>
    </div>
  );
}
