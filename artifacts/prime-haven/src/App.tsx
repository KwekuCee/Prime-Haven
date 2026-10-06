import { useEffect, Suspense, useState } from "react";
import { lazyWithReload } from "@/lib/lazyWithReload";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { UserSettingsProvider } from "./contexts/UserSettingsContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { GlobalCommandPalette } from "./components/GlobalCommandPalette";
import { TechStackLoader } from "./components/ui/TechStackLoader";
import ClientRoute from "./components/client/ClientRoute";
import AdminRoute from "./components/auth/AdminRoute";
import ProfessionalRoute from "./components/auth/ProfessionalRoute";


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
const ThirdPartyLoader = lazyWithReload(() => import('./components/ThirdPartyLoader'));

// Lazy-loaded pages for non-dashboard routes
const Register = lazyWithReload(() => import("./pages/Register"));
const Login = lazyWithReload(() => import("./pages/Login"));
const ForgotPassword = lazyWithReload(() => import("./pages/ForgotPassword"));
const ResetPassword = lazyWithReload(() => import("./pages/ResetPassword"));
const AuthConfirm = lazyWithReload(() => import("./pages/AuthConfirm"));
const Portfolio = lazyWithReload(() => import("./pages/Portfolio"));
const ServiceDetail = lazyWithReload(() => import("./pages/ServiceDetail"));
const HiringTrack = lazyWithReload(() => import("./pages/HiringTrack"));
const SuperAdminLogin = lazyWithReload(() => import("./pages/SuperAdminLogin"));
const Blog = lazyWithReload(() => import("./pages/Blog"));
const BlogPost = lazyWithReload(() => import("./pages/BlogPost"));
const TrackProject = lazyWithReload(() => import("./pages/TrackProject"));
const SubmitReview = lazyWithReload(() => import("./pages/SubmitReview"));
const StartProject = lazyWithReload(() => import("./pages/StartProject"));
const Apply = lazyWithReload(() => import("./pages/Apply"));
const ApplicantPortal = lazyWithReload(() => import("./pages/ApplicantPortal"));
const InstallPrompt = lazyWithReload(() => import("./components/InstallPrompt"));
const OAuthConsent = lazyWithReload(() => import("./pages/OAuthConsent"));
const VisitorTracker = lazyWithReload(() => import("./components/VisitorTracker"));
const GlobalPromoManager = lazyWithReload(() => import("./components/GlobalPromoManager"));

// Lazy load dashboard pages for better initial bundle size
const Dashboard = lazyWithReload(() => import("./pages/Dashboard"));
const Settings = lazyWithReload(() => import("./pages/Settings"));
const Payments = lazyWithReload(() => import("./pages/Payments"));
const SubmitWork = lazyWithReload(() => import("./pages/SubmitWork"));
const EditProfile = lazyWithReload(() => import("./pages/EditProfile"));
const Messages = lazyWithReload(() => import("./pages/Messages"));
const Install = lazyWithReload(() => import("./pages/Install"));
const ProjectWorkspace = lazyWithReload(() => import("./pages/ProjectWorkspace"));
const DesignerProfile = lazyWithReload(() => import("./pages/DesignerProfile"));
const ClientDashboard = lazyWithReload(() => import("./pages/ClientDashboard"));
const ClientLogin = lazyWithReload(() => import("./pages/ClientLogin"));

const ClientProjectsReview = lazyWithReload(() => import("./pages/ClientProjectsReview"));
const ClientProfile = lazyWithReload(() => import("./pages/ClientProfile"));
const ClientSettings = lazyWithReload(() => import("./pages/ClientSettings"));
const ClientStartProject = lazyWithReload(() => import("./pages/ClientStartProject"));
const ClientPayments = lazyWithReload(() => import("./pages/ClientPayments"));
const ClientSupport = lazyWithReload(() => import("./pages/ClientSupport"));
const AffiliateDashboard = lazyWithReload(() => import("./pages/AffiliateDashboard"));
const Marketplace = lazyWithReload(() => import("./pages/Marketplace"));
const SMMDashboard = lazyWithReload(() => import("./pages/SMMDashboard"));
const ProjectChatPage = lazyWithReload(() => import("./pages/ProjectChatPage"));
const TalentActivity = lazyWithReload(() => import("./pages/TalentActivity"));

// Lazy load admin pages for better initial bundle size
const SuperAdminDashboard = lazyWithReload(() => import("./pages/SuperAdminDashboard"));
const UIUXAdminDashboard = lazyWithReload(() => import("./pages/UIUXAdminDashboard"));
const WebDevAdminDashboard = lazyWithReload(() => import("./pages/WebDevAdminDashboard"));
const ManagePortfolio = lazyWithReload(() => import("./pages/ManagePortfolio"));
const GraphicDesignAdminDashboard = lazyWithReload(() => import("./pages/GraphicDesignAdminDashboard"));
const FinanceDashboard = lazyWithReload(() => import("./pages/FinanceDashboard"));
const QADashboard = lazyWithReload(() => import("./pages/QADashboard"));
const JobContracts = lazyWithReload(() => import("./pages/JobContracts"));
const ManageClientProjects = lazyWithReload(() => import("./pages/ManageClientProjects"));
const ManagePricing = lazyWithReload(() => import("./pages/ManagePricing"));
const ManageClients = lazyWithReload(() => import("./pages/ManageClients"));
const ManageApplicants = lazyWithReload(() => import("./pages/ManageApplicants"));
const ManageHireRequests = lazyWithReload(() => import("./pages/ManageHireRequests"));
const ActivityLog = lazyWithReload(() => import("./pages/ActivityLog"));
const PayoutReconciliation = lazyWithReload(() => import("./pages/PayoutReconciliation"));
const ForwardWork = lazyWithReload(() => import("./pages/ForwardWork"));
const ManagePromoPopup = lazyWithReload(() => import("./pages/ManagePromoPopup"));
const SuperAdminConversations = lazyWithReload(() => import("./pages/SuperAdminConversations"));
const Terms = lazyWithReload(() => import("./pages/Terms"));
const Privacy = lazyWithReload(() => import("./pages/Privacy"));
const OurStory = lazyWithReload(() => import("./pages/OurStory"));
const ManageSystemSettings = lazyWithReload(() => import("./pages/ManageSystemSettings"));


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
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="primehaven-theme">
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
                  <Route path="/dashboard" element={<ProfessionalRoute><Dashboard /></ProfessionalRoute>} />
                  <Route path="/auth/confirm" element={<AuthConfirm />} />
                  <Route path="/ref/:code" element={<ReferralHandler />} />
                  <Route path="/portfolio" element={<Portfolio />} />
                  <Route path="/settings" element={<ProfessionalRoute><Settings /></ProfessionalRoute>} />
                  <Route path="/payments" element={<ProfessionalRoute><Payments /></ProfessionalRoute>} />
                  <Route path="/submit-work" element={<ProfessionalRoute><SubmitWork /></ProfessionalRoute>} />
                  <Route path="/edit-profile" element={<ProfessionalRoute><EditProfile /></ProfessionalRoute>} />
                  <Route path="/activity" element={<ProfessionalRoute><TalentActivity /></ProfessionalRoute>} />
                  <Route path="/services/:serviceId" element={<ServiceDetail />} />
                  <Route path="/hiring/:trackSlug" element={<HiringTrack />} />
                  <Route path="/superadmin-login" element={<SuperAdminLogin />} />
                  <Route path="/superadmin" element={<AdminRoute><SuperAdminDashboard /></AdminRoute>} />
                  <Route path="/superadmin/uiux" element={<AdminRoute><UIUXAdminDashboard /></AdminRoute>} />
                  <Route path="/superadmin/web" element={<AdminRoute><WebDevAdminDashboard /></AdminRoute>} />
                  <Route path="/superadmin/graphic-design" element={<AdminRoute><GraphicDesignAdminDashboard /></AdminRoute>} />
                  <Route path="/superadmin/finance" element={<AdminRoute><FinanceDashboard /></AdminRoute>} />
                  <Route path="/superadmin/qa-reviewer" element={<AdminRoute><QADashboard /></AdminRoute>} />
                  <Route path="/superadmin/portfolio" element={<AdminRoute><ManagePortfolio /></AdminRoute>} />
                  <Route path="/superadmin/contracts" element={<AdminRoute><JobContracts /></AdminRoute>} />
                  <Route path="/superadmin/conversations" element={<AdminRoute><SuperAdminConversations /></AdminRoute>} />
                  <Route path="/messages" element={<ProfessionalRoute><Messages /></ProfessionalRoute>} />
                  <Route path="/install" element={<ProfessionalRoute><Install /></ProfessionalRoute>} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />
                  <Route path="/track/:token" element={<TrackProject />} />
                  <Route path="/superadmin/projects" element={<AdminRoute><ManageClientProjects /></AdminRoute>} />
                  <Route path="/review" element={<SubmitReview />} />
                  <Route path="/start-project" element={<StartProject />} />
                  <Route path="/apply" element={<Apply />} />
                  <Route path="/applicant/:token" element={<ApplicantPortal />} />
                  <Route path="/superadmin/pricing" element={<AdminRoute><ManagePricing /></AdminRoute>} />
                  <Route path="/superadmin/clients" element={<AdminRoute><ManageClients /></AdminRoute>} />
                  <Route path="/superadmin/applicants" element={<AdminRoute><ManageApplicants /></AdminRoute>} />
                  <Route path="/superadmin/hire-requests" element={<AdminRoute><ManageHireRequests /></AdminRoute>} />
                  <Route path="/superadmin/activity" element={<AdminRoute><ActivityLog /></AdminRoute>} />
                  <Route path="/superadmin/payouts" element={<AdminRoute><PayoutReconciliation /></AdminRoute>} />
                  <Route path="/superadmin/promo" element={<AdminRoute><ManagePromoPopup /></AdminRoute>} />
                  <Route path="/superadmin/settings" element={<AdminRoute><ManageSystemSettings /></AdminRoute>} />
                  <Route path="/superadmin/forward-work" element={<AdminRoute><ForwardWork /></AdminRoute>} />
                  <Route path="/workspace/:orderId" element={<ProfessionalRoute><ProjectWorkspace /></ProfessionalRoute>} />
                  <Route path="/client/login" element={<ClientLogin />} />
                  <Route path="/client/dashboard" element={<ClientRoute><ClientDashboard /></ClientRoute>} />
                  <Route path="/client/projects" element={<ClientRoute><ClientProjectsReview /></ClientRoute>} />
                  <Route path="/client/profile" element={<ClientRoute><ClientProfile /></ClientRoute>} />
                  <Route path="/client/settings" element={<ClientRoute><ClientSettings /></ClientRoute>} />
                  <Route path="/client/start-project" element={<ClientRoute><ClientStartProject /></ClientRoute>} />
                  <Route path="/client/payments" element={<ClientRoute><ClientPayments /></ClientRoute>} />
                  <Route path="/client/support" element={<ClientRoute><ClientSupport /></ClientRoute>} />
                  <Route path="/client/messages" element={<ClientRoute><Messages /></ClientRoute>} />

                  <Route path="/affiliate/dashboard" element={<ProfessionalRoute><AffiliateDashboard /></ProfessionalRoute>} />
                  <Route path="/marketplace" element={<ProfessionalRoute><Marketplace /></ProfessionalRoute>} />
                  <Route path="/dashboard/smm" element={<ProfessionalRoute><SMMDashboard /></ProfessionalRoute>} />
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
