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
              <Route path="/banking" element={<BankingLayout />}>
                <Route index element={<Banking />} />
                <Route path="accounts" element={<PlaceholderSubPage title="Accounts" description="Manage your bank accounts, wallets, and sub-accounts." />} />
                <Route path="transactions" element={<PlaceholderSubPage title="Transactions" description="View and manage all banking transactions." />} />
                <Route path="transfers" element={<PlaceholderSubPage title="Transfers" description="Transfer funds between accounts." />} />
                <Route path="analytics" element={<PlaceholderSubPage title="Analytics" description="Banking analytics and insights." />} />
                <Route path="scheduled" element={<PlaceholderSubPage title="Scheduled Payments" description="Manage recurring and scheduled payments." />} />
                <Route path="beneficiaries" element={<PlaceholderSubPage title="Beneficiaries" description="Manage saved payees for quick transfers." />} />
                <Route path="admin" element={<PlaceholderSubPage title="Admin" description="Staff wallet management and permissions." />} />
                <Route path="alerts" element={<PlaceholderSubPage title="Alerts" description="Configure balance and transaction alerts." />} />
                <Route path="settings" element={<PlaceholderSubPage title="Banking Settings" description="Banking preferences and configuration." />} />
              </Route>
              <Route path="/bookkeeping" element={<BookkeepingLayout />}>
                <Route index element={<Bookkeeping />} />
                <Route path="general-ledger" element={<PlaceholderSubPage title="General Ledger" description="View all ledger entries with debit and credit columns." />} />
                <Route path="journal-entries" element={<PlaceholderSubPage title="Journal Entries" description="Create and manage journal entries." />} />
                <Route path="chart-of-accounts" element={<PlaceholderSubPage title="Chart of Accounts" description="Manage your account tree structure." />} />
                <Route path="financial-statements" element={<PlaceholderSubPage title="Financial Statements" description="P&L, Balance Sheet, and Cash Flow reports." />} />
                <Route path="reconciliation" element={<PlaceholderSubPage title="Reconciliation" description="Match bank transactions to journal entries." />} />
                <Route path="tax" element={<PlaceholderSubPage title="Tax Management" description="VAT tracking and tax filing summaries." />} />
                <Route path="settings" element={<PlaceholderSubPage title="Bookkeeping Settings" description="Fiscal year, currency, and VAT configuration." />} />
              </Route>
              <Route path="/invoicing" element={<Invoicing />} />
              <Route path="/inventory" element={<InventoryLayout />}>
                <Route index element={<Inventory />} />
                <Route path="products" element={<PlaceholderSubPage title="Products" description="Full product catalog management." />} />
                <Route path="stock" element={<PlaceholderSubPage title="Stock Management" description="Stock levels, movements, and adjustments." />} />
                <Route path="purchase-orders" element={<PlaceholderSubPage title="Purchase Orders" description="Create and track purchase orders from suppliers." />} />
                <Route path="suppliers" element={<PlaceholderSubPage title="Suppliers" description="Manage your supplier directory." />} />
                <Route path="categories" element={<PlaceholderSubPage title="Categories" description="Product category management." />} />
                <Route path="reports" element={<PlaceholderSubPage title="Inventory Reports" description="Stock valuation and movement reports." />} />
                <Route path="settings" element={<PlaceholderSubPage title="Inventory Settings" description="Low stock thresholds and units configuration." />} />
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
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
