import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { UserSettingsProvider } from "./contexts/UserSettingsContext";
import Index from "./pages/Index";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import AuthConfirm from "./pages/AuthConfirm";
import Portfolio from "./pages/Portfolio";
import Settings from "./pages/Settings";
import Payments from "./pages/Payments";
import SubmitWork from "./pages/SubmitWork";
import EditProfile from "./pages/EditProfile";
import ServiceDetail from "./pages/ServiceDetail";
import SuperAdminLogin from "./pages/SuperAdminLogin";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import UIUXAdminDashboard from "./pages/UIUXAdminDashboard";
import WebDevAdminDashboard from "./pages/WebDevAdminDashboard";
import ManagePortfolio from "./pages/ManagePortfolio";
import Messages from "./pages/Messages";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <UserSettingsProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
            <Route path="/messages" element={<Messages />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </UserSettingsProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
