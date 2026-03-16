import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";
import RoleDashboard from "./components/RoleDashboard";
import Banking from "./pages/Banking";
import Bookkeeping from "./pages/Bookkeeping";
import Invoicing from "./pages/Invoicing";
import Inventory from "./pages/Inventory";
import Payroll from "./pages/Payroll";
import DebtCredit from "./pages/DebtCredit";
import OnlineStore from "./pages/OnlineStore";
import Capital from "./pages/Capital";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import AdminRegister from "./pages/AdminRegister";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<RoleDashboard />} />
              <Route path="/banking" element={<Banking />} />
              <Route path="/bookkeeping" element={<Bookkeeping />} />
              <Route path="/invoicing" element={<Invoicing />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/payroll" element={<Payroll />} />
              <Route path="/debt-credit" element={<DebtCredit />} />
              <Route path="/store" element={<OnlineStore />} />
              <Route path="/capital" element={<Capital />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/help" element={<Help />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
