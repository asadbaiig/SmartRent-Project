import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Properties from "@/pages/properties";
import PropertyDetails from "@/pages/property-details";
import ListProperty from "@/pages/list-property";
import Contracts from "@/pages/contracts";
import Payments from "@/pages/payments";
import Verification from "@/pages/verification";
import Disputes from "@/pages/disputes";
import AdminPortal from "@/pages/admin-portal";
import HelpCenter from "@/pages/help";
import TrustSafety from "@/pages/trust-safety";
import PrivacyPolicy from "@/pages/privacy";
import TermsOfService from "@/pages/terms";
import CookiePolicy from "@/pages/cookies";
import NotFound from "@/pages/not-found";

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
