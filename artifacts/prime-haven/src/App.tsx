import { useEffect, lazy, Suspense, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { UserSettingsProvider } from "./contexts/UserSettingsContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { GlobalCommandPalette } from "./components/GlobalCommandPalette";
import { TechStackLoader } from "./components/ui/TechStackLoader";
import ClientRoute from "./components/client/ClientRoute";


const ReferralHandler = () => {
  const { code } = useParams();
  useEffect(() => {
    if (code) {
      localStorage.setItem('primehaven_ref_code', code);
      localStorage.setItem('primehaven_ref_ts', String(Date.now()));
      // Track click server-side (fire-and-forget)
      import('@/integrations/supabase/client').then(({ supabase }) => {
        (supabase.rpc as any)('increment_affiliate_click', { p_code: code }).then(() => {}, () => {});
      });
    }
    window.location.href = '/';
  }, [code]);
  return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
};

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
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
const VisitorTracker = lazy(() => import("./components/VisitorTracker"));
const GlobalPromoManager = lazy(() => import("./components/GlobalPromoManager"));

// Lazy load dashboard pages for better initial bundle size
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Settings = lazy(() => import("./pages/Settings"));
const Payments = lazy(() => import("./pages/Payments"));
const SubmitWork = lazy(() => import("./pages/SubmitWork"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const Messages = lazy(() => import("./pages/Messages"));
const Install = lazy(() => import("./pages/Install"));
const ProjectWorkspace = lazy(() => import("./pages/ProjectWorkspace"));
const DesignerProfile = lazy(() => import("./pages/DesignerProfile"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const ClientLogin = lazy(() => import("./pages/ClientLogin"));

const ClientProjectsReview = lazy(() => import("./pages/ClientProjectsReview"));
const ClientProfile = lazy(() => import("./pages/ClientProfile"));
const ClientSettings = lazy(() => import("./pages/ClientSettings"));
const ClientStartProject = lazy(() => import("./pages/ClientStartProject"));
const ClientPayments = lazy(() => import("./pages/ClientPayments"));
const ClientSupport = lazy(() => import("./pages/ClientSupport"));
const AffiliateDashboard = lazy(() => import("./pages/AffiliateDashboard"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const SMMDashboard = lazy(() => import("./pages/SMMDashboard"));
const ProjectChatPage = lazy(() => import("./pages/ProjectChatPage"));

// Lazy load admin pages for better initial bundle size
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const UIUXAdminDashboard = lazy(() => import("./pages/UIUXAdminDashboard"));
const WebDevAdminDashboard = lazy(() => import("./pages/WebDevAdminDashboard"));
const ManagePortfolio = lazy(() => import("./pages/ManagePortfolio"));
const GraphicDesignAdminDashboard = lazy(() => import("./pages/GraphicDesignAdminDashboard"));
const FinanceDashboard = lazy(() => import("./pages/FinanceDashboard"));
const QADashboard = lazy(() => import("./pages/QADashboard"));
const JobContracts = lazy(() => import("./pages/JobContracts"));
const ManageClientProjects = lazy(() => import("./pages/ManageClientProjects"));
const ManagePricing = lazy(() => import("./pages/ManagePricing"));
const ManageClients = lazy(() => import("./pages/ManageClients"));
const ForwardWork = lazy(() => import("./pages/ForwardWork"));
const ManagePromoPopup = lazy(() => import("./pages/ManagePromoPopup"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const OurStory = lazy(() => import("./pages/OurStory"));
const ManageSystemSettings = lazy(() => import("./pages/ManageSystemSettings"));

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
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme="light">
        <UserSettingsProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<TechStackLoader />}>
                <InstallPrompt />
                <VisitorTracker />
                <GlobalPromoManager />
                <GlobalCommandPalette />
                <ThirdPartyLoader />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/auth/confirm" element={<AuthConfirm />} />
                  <Route path="/ref/:code" element={<ReferralHandler />} />
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
                  <Route path="/superadmin/graphic-design" element={<GraphicDesignAdminDashboard />} />
                  <Route path="/superadmin/finance" element={<FinanceDashboard />} />
                  <Route path="/superadmin/qa-reviewer" element={<QADashboard />} />
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
                  <Route path="/superadmin/promo" element={<ManagePromoPopup />} />
                  <Route path="/superadmin/settings" element={<ManageSystemSettings />} />
                  <Route path="/superadmin/forward-work" element={<ForwardWork />} />
                  <Route path="/workspace/:orderId" element={<ProjectWorkspace />} />
                  <Route path="/client/login" element={<ClientLogin />} />
                  <Route path="/client/dashboard" element={<ClientRoute><ClientDashboard /></ClientRoute>} />
                  <Route path="/client/projects" element={<ClientRoute><ClientProjectsReview /></ClientRoute>} />
                  <Route path="/client/profile" element={<ClientRoute><ClientProfile /></ClientRoute>} />
                  <Route path="/client/settings" element={<ClientRoute><ClientSettings /></ClientRoute>} />
                  <Route path="/client/start-project" element={<ClientRoute><ClientStartProject /></ClientRoute>} />
                  <Route path="/client/payments" element={<ClientRoute><ClientPayments /></ClientRoute>} />
                  <Route path="/client/support" element={<ClientRoute><ClientSupport /></ClientRoute>} />
                  <Route path="/client/messages" element={<ClientRoute><Messages /></ClientRoute>} />

                  <Route path="/affiliate/dashboard" element={<AffiliateDashboard />} />
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route path="/dashboard/smm" element={<SMMDashboard />} />
                  <Route path="/designer/:id" element={<DesignerProfile />} />
                  <Route path="/project-chat/:projectId" element={<ProjectChatPage />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/our-story" element={<OurStory />} />
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
