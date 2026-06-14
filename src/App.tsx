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
import BankingOverview from "./pages/banking/BankingOverview";
import BankingAccounts from "./pages/banking/BankingAccounts";
import BankingTransactions from "./pages/banking/BankingTransactions";
import BankingTransfers from "./pages/banking/BankingTransfers";
import BankingAnalytics from "./pages/banking/BankingAnalytics";
import BankingScheduled from "./pages/banking/BankingScheduled";
import BankingBeneficiaries from "./pages/banking/BankingBeneficiaries";
import BankingAdmin from "./pages/banking/BankingAdmin";
import BankingAlerts from "./pages/banking/BankingAlerts";
import BankingSettings from "./pages/banking/BankingSettings";
import BookkeepingOverview from "./pages/bookkeeping/BookkeepingOverview";
import GeneralLedger from "./pages/bookkeeping/GeneralLedger";
import JournalEntries from "./pages/bookkeeping/JournalEntries";
import ChartOfAccounts from "./pages/bookkeeping/ChartOfAccounts";
import FinancialStatements from "./pages/bookkeeping/FinancialStatements";
import Reconciliation from "./pages/bookkeeping/Reconciliation";
import Tax from "./pages/bookkeeping/Tax";
import BookkeepingSettings from "./pages/bookkeeping/BookkeepingSettings";
import InventoryOverview from "./pages/inventory/InventoryOverview";
import InventoryProducts from "./pages/inventory/InventoryProducts";
import InventoryStock from "./pages/inventory/InventoryStock";
import InventoryPurchaseOrders from "./pages/inventory/InventoryPurchaseOrders";
import InventorySuppliers from "./pages/inventory/InventorySuppliers";
import InventoryCategories from "./pages/inventory/InventoryCategories";
import InventoryReports from "./pages/inventory/InventoryReports";
import InventorySettings from "./pages/inventory/InventorySettings";
import Payroll from "./pages/Payroll";
import DebtCredit from "./pages/DebtCredit";
import OnlineStore from "./pages/OnlineStore";
import POS from "./pages/POS";
import Capital from "./pages/Capital";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminManagement from "./pages/admin/AdminManagement";
import AdminBusinesses from "./pages/admin/AdminBusinesses";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminActivity from "./pages/admin/AdminActivity";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AcceptInvite from "./pages/AcceptInvite";
import Onboarding from "./pages/Onboarding";
import { OnboardingGuard } from "./components/OnboardingGuard";
import { SubscriptionGuard } from "./components/SubscriptionGuard";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Pricing from "./pages/Pricing";
import Customers from "./pages/Customers";
import Budgeting from "./pages/Budgeting";
import StoreManagement from "./pages/StoreManagement";
import SystemReview from "./pages/SystemReview";
import VoiceCommand from "./pages/VoiceCommand";
import Loans from "./pages/Loans";
import Employees from "./pages/Employees";

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
            
            <Route path="/accept-invite/:token" element={<AcceptInvite />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'support_admin']} />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminOverview />} />
                <Route path="businesses" element={<AdminBusinesses />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="subscriptions" element={<AdminSubscriptions />} />
                <Route path="admins" element={<AdminManagement />} />
                <Route path="activity" element={<AdminActivity />} />
                <Route path="announcements" element={<AdminAnnouncements />} />
              </Route>
            </Route>
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route element={<ProtectedRoute><OnboardingGuard><SubscriptionGuard><AppLayout /></SubscriptionGuard></OnboardingGuard></ProtectedRoute>}>
              <Route path="/dashboard" element={<RoleDashboard />} />
              <Route path="/banking" element={<BankingLayout />}>
                <Route index element={<BankingOverview />} />
                <Route path="accounts" element={<BankingAccounts />} />
                <Route path="transactions" element={<BankingTransactions />} />
                <Route path="transfers" element={<BankingTransfers />} />
                <Route path="analytics" element={<BankingAnalytics />} />
                <Route path="scheduled" element={<BankingScheduled />} />
                <Route path="beneficiaries" element={<BankingBeneficiaries />} />
                <Route path="admin" element={<BankingAdmin />} />
                <Route path="alerts" element={<BankingAlerts />} />
                <Route path="settings" element={<BankingSettings />} />
              </Route>
              <Route path="/bookkeeping" element={<BookkeepingLayout />}>
                <Route index element={<BookkeepingOverview />} />
                <Route path="general-ledger" element={<GeneralLedger />} />
                <Route path="journal-entries" element={<JournalEntries />} />
                <Route path="chart-of-accounts" element={<ChartOfAccounts />} />
                <Route path="financial-statements" element={<FinancialStatements />} />
                <Route path="reconciliation" element={<Reconciliation />} />
                <Route path="tax" element={<Tax />} />
                <Route path="settings" element={<BookkeepingSettings />} />
              </Route>
              <Route path="/invoicing" element={<Invoicing />} />
              <Route path="/inventory" element={<InventoryLayout />}>
                <Route index element={<InventoryOverview />} />
                <Route path="products" element={<InventoryProducts />} />
                <Route path="stock" element={<InventoryStock />} />
                <Route path="purchase-orders" element={<InventoryPurchaseOrders />} />
                <Route path="suppliers" element={<InventorySuppliers />} />
                <Route path="categories" element={<InventoryCategories />} />
                <Route path="reports" element={<InventoryReports />} />
                <Route path="settings" element={<InventorySettings />} />
              </Route>
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
              <Route path="/loans" element={<Loans />} />
              <Route path="/employees" element={<Employees />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
