import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { UserSettingsProvider } from "./contexts/UserSettingsContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { GlobalCommandPalette } from "./components/GlobalCommandPalette";

// Lazy-loaded pages for non-dashboard routes
const Register = lazy(() => import("./pages/Register"));
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AuthConfirm = lazy(() => import("./pages/AuthConfirm"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const ServiceDetail = lazy(() => import("./pages/ServiceDetail"));
const SuperAdminLogin = lazy(() => import("./pages/SuperAdminLogin"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const TrackProject = lazy(() => import("./pages/TrackProject"));
const SubmitReview = lazy(() => import("./pages/SubmitReview"));
const StartProject = lazy(() => import("./pages/StartProject"));
const InstallPrompt = lazy(() => import("./components/InstallPrompt"));
const VisitorTracker = lazy(() => import("./components/VisitorTracker"));

// Eagerly load dashboard pages for instant navigation
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Payments from "./pages/Payments";
import SubmitWork from "./pages/SubmitWork";
import EditProfile from "./pages/EditProfile";
import Messages from "./pages/Messages";
import Install from "./pages/Install";

// Eagerly load admin pages for instant navigation
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import UIUXAdminDashboard from "./pages/UIUXAdminDashboard";
import WebDevAdminDashboard from "./pages/WebDevAdminDashboard";
import ManagePortfolio from "./pages/ManagePortfolio";
import JobContracts from "./pages/JobContracts";
import ManageClientProjects from "./pages/ManageClientProjects";
import ManagePricing from "./pages/ManagePricing";
import ManageClients from "./pages/ManageClients";
import ForwardWork from "./pages/ForwardWork";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
      event.preventDefault();
    };
    window.addEventListener("unhandledrejection", handleRejection);
    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <UserSettingsProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>}>
                <InstallPrompt />
                <VisitorTracker />
                <GlobalCommandPalette />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/auth/confirm" element={<AuthConfirm />} />
                  <Route path="/portfolio" element={<Portfolio />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/payments" element={<Payments />} />
                  <Route path="/submit-work" element={<SubmitWork />} />
                  <Route path="/edit-profile" element={<EditProfile />} />
                  <Route path="/services/:serviceId" element={<ServiceDetail />} />
                  <Route path="/superadmin-login" element={<SuperAdminLogin />} />
                  <Route path="/superadmin" element={<SuperAdminDashboard />} />
                  <Route path="/superadmin/uiux" element={<UIUXAdminDashboard />} />
                  <Route path="/superadmin/web" element={<WebDevAdminDashboard />} />
                  <Route path="/superadmin/portfolio" element={<ManagePortfolio />} />
                  <Route path="/superadmin/contracts" element={<JobContracts />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/install" element={<Install />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />
                  <Route path="/track/:token" element={<TrackProject />} />
                  <Route path="/superadmin/projects" element={<ManageClientProjects />} />
                  <Route path="/review" element={<SubmitReview />} />
                  <Route path="/start-project" element={<StartProject />} />
                  <Route path="/superadmin/pricing" element={<ManagePricing />} />
                  <Route path="/superadmin/clients" element={<ManageClients />} />
                  <Route path="/superadmin/forward-work" element={<ForwardWork />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </UserSettingsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
