// Industry / Business Category configuration
// Drives terminology, units of measurement, dashboard widgets, quick actions,
// sidebar nav overrides and hidden modules for the entire app
// based on the business owner's selected focus.

export type BusinessCategory =
  | "MSMEs"
  | "Healthcare"
  | "Agriculture"
  | "Technology"
  | "Finance"
  | "Consultant"
  | "Manufacturing";

export interface IndustryTerms {
  customer: string;        // singular
  customers: string;       // plural
  product: string;
  products: string;
  sale: string;
  sales: string;
  invoice: string;
  invoices: string;
  inventory: string;
}

export interface IndustryConfig {
  category: BusinessCategory;
  hint: string;
  subcategories: string[];
  terms: IndustryTerms;
  units: string[];                 // suggested units of measurement
  defaultUnit: string;
  dashboardSections: string[];     // widget keys to show
  quickActions: { label: string; action: string; route?: string }[];
  /** Sidebar nav label overrides keyed by route. */
  navOverrides: Record<string, string>;
  /** Routes the sidebar should hide for this industry. */
  hiddenModules: string[];
  /** Industry-specific KPIs for the dashboard. */
  kpis: { key: string; label: string; helper: string }[];
  /** Which journal entry UI variant to render. */
  journalEntryVariant?: "default" | "msme";
}

const DEFAULTS: IndustryTerms = {
  customer: "Customer",
  customers: "Customers",
  product: "Product",
  products: "Products",
  sale: "Sale",
  sales: "Sales",
  invoice: "Invoice",
  invoices: "Invoices",
  inventory: "Inventory",
};

export const INDUSTRY_CONFIG: Record<BusinessCategory, IndustryConfig> = {
  MSMEs: {
    category: "MSMEs",
    hint: "Micro, small & medium businesses — retail, wholesale & services",
    subcategories: ["Retail", "Wholesale", "Food & Beverage", "Services", "Logistics", "Other"],
    terms: DEFAULTS,
    units: ["pcs", "cartons", "packs", "bags", "kg"],
    defaultUnit: "pcs",
    dashboardSections: ["revenue", "sales", "inventory", "customers", "invoices"],
    quickActions: [
      { label: "New Sale", action: "open-create-invoice", route: "/pos" },
      { label: "Add Transaction", action: "open-record-transaction", route: "/bookkeeping" },
      { label: "Add Product", action: "open-add-product", route: "/inventory/products" },
      { label: "Add Customer", action: "open-add-customer", route: "/customers" },
    ],
    navOverrides: {},
    hiddenModules: [],
    kpis: [
      { key: "revenue", label: "Total Revenue", helper: "Across all sales" },
      { key: "orders", label: "Total Orders", helper: "POS + online" },
      { key: "customers", label: "Active Customers", helper: "With recent activity" },
      { key: "inventory", label: "Stock Value", helper: "On-hand inventory" },
    ],
    journalEntryVariant: "msme",
  },
  Healthcare: {
    category: "Healthcare",
    hint: "Clinics, pharmacies, hospitals & medical suppliers",
    subcategories: ["Clinic", "Pharmacy", "Hospital", "Diagnostics", "Medical Supplies", "Other"],
    terms: {
      ...DEFAULTS,
      customer: "Patient",
      customers: "Patients",
      product: "Medication",
      products: "Medications",
      sale: "Dispense",
      sales: "Dispenses",
      invoice: "Bill",
      invoices: "Bills",
      inventory: "Stock",
    },
    units: ["tablets", "capsules", "ml", "mg", "bottles", "boxes", "sachets"],
    defaultUnit: "tablets",
    dashboardSections: ["revenue", "patients", "prescriptions", "inventory", "invoices"],
    quickActions: [
      { label: "New Patient", action: "open-add-customer", route: "/customers" },
      { label: "Dispense Medication", action: "open-create-invoice", route: "/invoicing" },
      { label: "Add Medication", action: "open-add-product", route: "/inventory/products" },
      { label: "Add Transaction", action: "open-record-transaction", route: "/bookkeeping" },
    ],
    navOverrides: {
      "/customers": "Patients",
      "/invoicing": "Bills & Prescriptions",
      "/inventory": "Stock",
      "/pos": "Dispense",
    },
    hiddenModules: ["/store"],
    kpis: [
      { key: "revenue", label: "Total Billed", helper: "Patient bills issued" },
      { key: "patients", label: "Active Patients", helper: "Seen this month" },
      { key: "dispenses", label: "Dispenses", helper: "Medication dispensed" },
      { key: "stock", label: "Stock Alerts", helper: "Low / expiring" },
    ],
  },
  Agriculture: {
    category: "Agriculture",
    hint: "Farming, livestock, agro-processing & agri-inputs",
    subcategories: ["Crop Farming", "Livestock", "Agro-Processing", "Agri-Inputs", "Aquaculture", "Other"],
    terms: {
      ...DEFAULTS,
      product: "Produce",
      products: "Produce",
      sale: "Harvest Sale",
      sales: "Harvest Sales",
      inventory: "Stockyard",
    },
    units: ["kg", "tonnes", "bags", "crates", "hectares", "litres", "heads"],
    defaultUnit: "kg",
    dashboardSections: ["revenue", "harvests", "inputs", "inventory", "customers"],
    quickActions: [
      { label: "Record Harvest", action: "open-add-product", route: "/inventory/products" },
      { label: "Log Buyer Sale", action: "open-create-invoice", route: "/invoicing" },
      { label: "Add Buyer", action: "open-add-customer", route: "/customers" },
      { label: "Add Transaction", action: "open-record-transaction", route: "/bookkeeping" },
    ],
    navOverrides: {
      "/customers": "Buyers & Offtakers",
      "/inventory": "Stockyard",
      "/invoicing": "Sales & Offtake",
    },
    hiddenModules: ["/store"],
    kpis: [
      { key: "revenue", label: "Harvest Revenue", helper: "Total sold" },
      { key: "produce", label: "Produce on Hand", helper: "Stockyard balance" },
      { key: "buyers", label: "Active Buyers", helper: "Repeat offtakers" },
      { key: "inputs", label: "Input Costs", helper: "Seed, feed, agro-chem" },
    ],
  },
  Technology: {
    category: "Technology",
    hint: "Software, IT services, hardware & digital products",
    subcategories: ["Software", "IT Services", "Hardware", "SaaS", "Cybersecurity", "Other"],
    terms: {
      ...DEFAULTS,
      customer: "Client",
      customers: "Clients",
      product: "Product / Plan",
      products: "Products & Plans",
      sale: "Subscription",
      sales: "Subscriptions",
    },
    units: ["licenses", "seats", "hours", "units", "GB"],
    defaultUnit: "licenses",
    dashboardSections: ["revenue", "subscriptions", "clients", "invoices", "projects"],
    quickActions: [
      { label: "New Client", action: "open-add-customer", route: "/customers" },
      { label: "Send Invoice", action: "open-create-invoice", route: "/invoicing" },
      { label: "Add Product / Plan", action: "open-add-product", route: "/inventory/products" },
      { label: "Add Transaction", action: "open-record-transaction", route: "/bookkeeping" },
    ],
    navOverrides: {
      "/customers": "Clients",
      "/inventory": "Products & Plans",
    },
    hiddenModules: ["/pos"],
    kpis: [
      { key: "revenue", label: "MRR", helper: "Monthly recurring revenue" },
      { key: "clients", label: "Active Clients", helper: "Subscribed" },
      { key: "invoices", label: "Open Invoices", helper: "Awaiting payment" },
      { key: "churn", label: "Churn (30d)", helper: "Cancelled accounts" },
    ],
  },
  Finance: {
    category: "Finance",
    hint: "Fintech, microfinance, insurance & advisory firms",
    subcategories: ["Microfinance", "Fintech", "Insurance", "Advisory", "Investment", "Other"],
    terms: {
      ...DEFAULTS,
      customer: "Client",
      customers: "Clients",
      product: "Service",
      products: "Services",
      sale: "Transaction",
      sales: "Transactions",
    },
    units: ["accounts", "policies", "loans", "transactions"],
    defaultUnit: "accounts",
    dashboardSections: ["revenue", "clients", "loans", "transactions", "invoices"],
    quickActions: [
      { label: "New Client", action: "open-add-customer", route: "/customers" },
      { label: "Record Transfer", action: "open-new-transfer", route: "/banking/transfers" },
      { label: "Generate Invoice", action: "open-create-invoice", route: "/invoicing" },
      { label: "Add Transaction", action: "open-record-transaction", route: "/bookkeeping" },
    ],
    navOverrides: {
      "/customers": "Clients",
      "/inventory": "Service Catalog",
    },
    hiddenModules: ["/pos", "/store"],
    kpis: [
      { key: "revenue", label: "Fee Revenue", helper: "All sources" },
      { key: "clients", label: "Active Clients", helper: "With balances" },
      { key: "loans", label: "Outstanding Loans", helper: "Principal due" },
      { key: "transactions", label: "Transactions (7d)", helper: "Across products" },
    ],
  },
  Consultant: {
    category: "Consultant",
    hint: "Professional services & advisory firms",
    subcategories: ["Business", "Legal", "HR", "Marketing", "Engineering", "Other"],
    terms: {
      ...DEFAULTS,
      customer: "Client",
      customers: "Clients",
      product: "Service",
      products: "Services",
      sale: "Engagement",
      sales: "Engagements",
      inventory: "Service Catalog",
    },
    units: ["hours", "days", "sessions", "retainers", "projects"],
    defaultUnit: "hours",
    dashboardSections: ["revenue", "clients", "engagements", "invoices", "billable_hours"],
    quickActions: [
      { label: "New Client", action: "open-add-customer", route: "/customers" },
      { label: "Bill Client", action: "open-create-invoice", route: "/invoicing" },
      { label: "Log Expense", action: "open-record-expense", route: "/bookkeeping/journal-entries" },
      { label: "Add Transaction", action: "open-record-transaction", route: "/bookkeeping" },
    ],
    navOverrides: {
      "/customers": "Clients",
      "/inventory": "Service Catalog",
      "/invoicing": "Billing & Retainers",
    },
    hiddenModules: ["/pos", "/store", "/store-management"],
    kpis: [
      { key: "revenue", label: "Billings", helper: "Invoiced this month" },
      { key: "clients", label: "Active Clients", helper: "Engaged" },
      { key: "hours", label: "Billable Hours", helper: "Logged this week" },
      { key: "outstanding", label: "Outstanding", helper: "Unpaid invoices" },
    ],
  },
  Manufacturing: {
    category: "Manufacturing",
    hint: "Production, assembly & industrial goods",
    subcategories: ["Food Processing", "Textiles", "Industrial Goods", "FMCG", "Chemicals", "Other"],
    terms: {
      ...DEFAULTS,
      customer: "Buyer",
      customers: "Buyers",
      product: "SKU",
      products: "SKUs",
      sale: "Order",
      sales: "Orders",
      inventory: "Warehouse",
    },
    units: ["units", "pallets", "cartons", "tonnes", "kg", "litres"],
    defaultUnit: "units",
    dashboardSections: ["revenue", "production", "orders", "inventory", "suppliers"],
    quickActions: [
      { label: "New Order", action: "open-create-invoice", route: "/invoicing" },
      { label: "Add SKU", action: "open-add-product", route: "/inventory/products" },
      { label: "Add Buyer", action: "open-add-customer", route: "/customers" },
      { label: "Add Transaction", action: "open-record-transaction", route: "/bookkeeping" },
    ],
    navOverrides: {
      "/customers": "Buyers & Distributors",
      "/inventory": "Warehouse",
      "/invoicing": "Orders",
    },
    hiddenModules: [],
    kpis: [
      { key: "revenue", label: "Order Revenue", helper: "Fulfilled orders" },
      { key: "production", label: "Production (7d)", helper: "Units produced" },
      { key: "orders", label: "Open Orders", helper: "In progress" },
      { key: "warehouse", label: "Warehouse Value", helper: "On-hand stock" },
    ],
  },
};

export const BUSINESS_CATEGORIES = Object.keys(INDUSTRY_CONFIG) as BusinessCategory[];

export function getIndustryConfig(category?: string | null): IndustryConfig {
  if (category && (category in INDUSTRY_CONFIG)) {
    return INDUSTRY_CONFIG[category as BusinessCategory];
  }
  return INDUSTRY_CONFIG.MSMEs;
}
