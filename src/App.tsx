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
import Invoicing from "./pages/Invoicing";
import BankingLayout from "./pages/banking/BankingLayout";
import BookkeepingLayout from "./pages/bookkeeping/BookkeepingLayout";
import InventoryLayout from "./pages/inventory/InventoryLayout";
import Banking from "./pages/Banking";
import Bookkeeping from "./pages/Bookkeeping";
import Inventory from "./pages/Inventory";
import { PlaceholderSubPage } from "./components/PlaceholderSubPage";
import Payroll from "./pages/Payroll";
import DebtCredit from "./pages/DebtCredit";
import OnlineStore from "./pages/OnlineStore";
import POS from "./pages/POS";
import Capital from "./pages/Capital";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import AdminRegister from "./pages/AdminRegister";
import AcceptInvite from "./pages/AcceptInvite";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Pricing from "./pages/Pricing";
import Customers from "./pages/Customers";
import Budgeting from "./pages/Budgeting";
import StoreManagement from "./pages/StoreManagement";
import SystemReview from "./pages/SystemReview";
import VoiceCommand from "./pages/VoiceCommand";

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
            <Route path="/admin-register" element={<AdminRegister />} />
            <Route path="/accept-invite/:token" element={<AcceptInvite />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<RoleDashboard />} />
              <Route path="/banking" element={<Banking />} />
              <Route path="/bookkeeping" element={<Bookkeeping />} />
              <Route path="/invoicing" element={<Invoicing />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/payroll" element={<Payroll />} />
              <Route path="/debt-credit" element={<DebtCredit />} />
              <Route path="/pos" element={<POS />} />
              <Route path="/store" element={<OnlineStore />} />
              <Route path="/capital" element={<Capital />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/help" element={<Help />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/budgeting" element={<Budgeting />} />
              <Route path="/store-management" element={<StoreManagement />} />
              <Route path="/system-review" element={<SystemReview />} />
              <Route path="/voice" element={<VoiceCommand />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
