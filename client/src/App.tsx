import { Switch, Route, useLocation } from "wouter";
import { lazy, Suspense, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Skeleton } from "@/components/ui/skeleton";

const Home = lazy(() => import("@/pages/home"));
const Login = lazy(() => import("@/pages/login"));
const Register = lazy(() => import("@/pages/register"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Properties = lazy(() => import("@/pages/properties"));
const PropertyDetails = lazy(() => import("@/pages/property-details"));
const ListProperty = lazy(() => import("@/pages/list-property"));
const Contracts = lazy(() => import("@/pages/contracts"));
const Payments = lazy(() => import("@/pages/payments"));
const Verification = lazy(() => import("@/pages/verification"));
const Disputes = lazy(() => import("@/pages/disputes"));
const AdminPortal = lazy(() => import("@/pages/admin-portal"));
const HelpCenter = lazy(() => import("@/pages/help"));
const TrustSafety = lazy(() => import("@/pages/trust-safety"));
const PrivacyPolicy = lazy(() => import("@/pages/privacy"));
const TermsOfService = lazy(() => import("@/pages/terms"));
const CookiePolicy = lazy(() => import("@/pages/cookies"));
const NotFound = lazy(() => import("@/pages/not-found"));

function PageFallback() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Skeleton className="h-9 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
    </div>
  );
}

function Router() {
  const [location] = useLocation();

  // Scroll to top when route changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Suspense fallback={<PageFallback />}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/login" component={Login} />
            <Route path="/register" component={Register} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/list-property" component={ListProperty} />
            <Route path="/properties" component={Properties} />
            <Route path="/properties/:id" component={PropertyDetails} />
            <Route path="/contracts" component={Contracts} />
            <Route path="/contracts/new" component={Contracts} />
            <Route path="/payments" component={Payments} />
            <Route path="/verification" component={Verification} />
            <Route path="/disputes" component={Disputes} />
            <Route path="/admin/portal" component={AdminPortal} />
            <Route path="/help" component={HelpCenter} />
            <Route path="/trust-safety" component={TrustSafety} />
            <Route path="/privacy" component={PrivacyPolicy} />
            <Route path="/terms" component={TermsOfService} />
            <Route path="/cookies" component={CookiePolicy} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="smartrent-theme">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
