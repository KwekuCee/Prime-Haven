import { useEffect, lazy, Suspense, useState } from "react";
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
import { TechStackLoader } from "./components/ui/TechStackLoader";

// Third-party scripts loader is imported dynamically to defer heavy network work on mobile
const ThirdPartyLoader = lazy(() => import('./components/ThirdPartyLoader'));

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

// Lazy load dashboard pages for better initial bundle size
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Settings = lazy(() => import("./pages/Settings"));
const Payments = lazy(() => import("./pages/Payments"));
const SubmitWork = lazy(() => import("./pages/SubmitWork"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const Messages = lazy(() => import("./pages/Messages"));
const Install = lazy(() => import("./pages/Install"));

// Lazy load admin pages for better initial bundle size
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const UIUXAdminDashboard = lazy(() => import("./pages/UIUXAdminDashboard"));
const WebDevAdminDashboard = lazy(() => import("./pages/WebDevAdminDashboard"));
const ManagePortfolio = lazy(() => import("./pages/ManagePortfolio"));
const JobContracts = lazy(() => import("./pages/JobContracts"));
const ManageClientProjects = lazy(() => import("./pages/ManageClientProjects"));
const ManagePricing = lazy(() => import("./pages/ManagePricing"));
const ManageClients = lazy(() => import("./pages/ManageClients"));
const ForwardWork = lazy(() => import("./pages/ForwardWork"));

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
              <Suspense fallback={<TechStackLoader />}>
                <InstallPrompt />
                <VisitorTracker />
                <GlobalCommandPalette />
                <ThirdPartyLoader />
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
