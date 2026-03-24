
-- =============================================
-- Phase 3A: POS System Tables
-- =============================================

CREATE TABLE public.cash_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  location_id uuid REFERENCES public.inventory_locations(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  cash_register_id uuid NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  opening_amount numeric NOT NULL DEFAULT 0,
  closing_amount numeric,
  status text NOT NULL DEFAULT 'open',
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  notes text
);
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  shift_id uuid REFERENCES public.shifts(id),
  customer_id uuid REFERENCES public.customers(id),
  sale_number text,
  subtotal numeric NOT NULL DEFAULT 0,
  vat_rate numeric DEFAULT 7.50,
  vat_amount numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  change_amount numeric DEFAULT 0,
  payment_method text DEFAULT 'cash',
  status text NOT NULL DEFAULT 'completed',
  currency text NOT NULL DEFAULT 'NGN',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  product_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  discount numeric DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Phase 3B: Payroll & HR Tables
-- =============================================

CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  manager_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.employees_hr (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid,
  department_id uuid REFERENCES public.departments(id),
  employee_number text,
  full_name text NOT NULL,
  email text,
  phone text,
  position text,
  employment_type text NOT NULL DEFAULT 'full_time',
  hire_date date NOT NULL DEFAULT CURRENT_DATE,
  termination_date date,
  basic_salary numeric NOT NULL DEFAULT 0,
  bank_name text,
  account_number text,
  tax_id text,
  pension_id text,
  status text NOT NULL DEFAULT 'active',
  currency text NOT NULL DEFAULT 'NGN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.employees_hr ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  run_date date NOT NULL DEFAULT CURRENT_DATE,
  total_gross numeric NOT NULL DEFAULT 0,
  total_deductions numeric NOT NULL DEFAULT 0,
  total_net numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid,
  notes text,
  currency text NOT NULL DEFAULT 'NGN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.payroll_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id uuid NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees_hr(id) ON DELETE CASCADE,
  basic_salary numeric NOT NULL DEFAULT 0,
  allowances numeric NOT NULL DEFAULT 0,
  overtime numeric NOT NULL DEFAULT 0,
  gross_pay numeric NOT NULL DEFAULT 0,
  tax_deduction numeric NOT NULL DEFAULT 0,
  pension_deduction numeric NOT NULL DEFAULT 0,
  other_deductions numeric NOT NULL DEFAULT 0,
  net_pay numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees_hr(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  clock_in timestamptz,
  clock_out timestamptz,
  status text NOT NULL DEFAULT 'present',
  hours_worked numeric DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees_hr(id) ON DELETE CASCADE,
  leave_type text NOT NULL DEFAULT 'annual',
  start_date date NOT NULL,
  end_date date NOT NULL,
  days_count integer NOT NULL DEFAULT 1,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Phase 3C: Debt & Credit Tables
-- =============================================

CREATE TABLE public.receivables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id),
  invoice_id uuid REFERENCES public.invoices(id),
  description text,
  amount numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  due_date date,
  status text NOT NULL DEFAULT 'outstanding',
  currency text NOT NULL DEFAULT 'NGN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.payables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id),
  purchase_order_id uuid REFERENCES public.purchase_orders(id),
  description text,
  amount numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  due_date date,
  status text NOT NULL DEFAULT 'outstanding',
  currency text NOT NULL DEFAULT 'NGN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payables ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.payment_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  payable_id uuid REFERENCES public.payables(id),
  receivable_id uuid REFERENCES public.receivables(id),
  scheduled_date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  is_paid boolean NOT NULL DEFAULT false,
  paid_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies for all tables
-- =============================================

-- cash_registers
CREATE POLICY "Business members can view cash registers" ON public.cash_registers FOR SELECT TO authenticated USING (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business owners can manage cash registers" ON public.cash_registers FOR ALL TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Super admin views all cash registers" ON public.cash_registers FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- shifts
CREATE POLICY "Business members can view shifts" ON public.shifts FOR SELECT TO authenticated USING (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business members can insert shifts" ON public.shifts FOR INSERT TO authenticated WITH CHECK (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business owners can manage shifts" ON public.shifts FOR ALL TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Super admin views all shifts" ON public.shifts FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- sales
CREATE POLICY "Business members can view sales" ON public.sales FOR SELECT TO authenticated USING (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business members can insert sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business owners can manage sales" ON public.sales FOR ALL TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Super admin views all sales" ON public.sales FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- sale_items
CREATE POLICY "Business members can view sale items" ON public.sale_items FOR SELECT TO authenticated USING (sale_id IN (SELECT id FROM sales WHERE user_belongs_to_business(auth.uid(), business_id)));
CREATE POLICY "Business members can insert sale items" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (sale_id IN (SELECT id FROM sales WHERE user_belongs_to_business(auth.uid(), business_id)));
CREATE POLICY "Business owners can manage sale items" ON public.sale_items FOR ALL TO authenticated USING (sale_id IN (SELECT s.id FROM sales s WHERE s.business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())));
CREATE POLICY "Super admin views all sale items" ON public.sale_items FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- departments
CREATE POLICY "Business members can view departments" ON public.departments FOR SELECT TO authenticated USING (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business owners can manage departments" ON public.departments FOR ALL TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Super admin views all departments" ON public.departments FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- employees_hr
CREATE POLICY "Business members can view employees" ON public.employees_hr FOR SELECT TO authenticated USING (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business owners can manage employees" ON public.employees_hr FOR ALL TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Super admin views all employees" ON public.employees_hr FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- payroll_runs
CREATE POLICY "Business members can view payroll" ON public.payroll_runs FOR SELECT TO authenticated USING (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business owners can manage payroll" ON public.payroll_runs FOR ALL TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Super admin views all payroll" ON public.payroll_runs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- payroll_items
CREATE POLICY "Business members can view payroll items" ON public.payroll_items FOR SELECT TO authenticated USING (payroll_run_id IN (SELECT id FROM payroll_runs WHERE user_belongs_to_business(auth.uid(), business_id)));
CREATE POLICY "Business owners can manage payroll items" ON public.payroll_items FOR ALL TO authenticated USING (payroll_run_id IN (SELECT pr.id FROM payroll_runs pr WHERE pr.business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())));
CREATE POLICY "Super admin views all payroll items" ON public.payroll_items FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- attendance
CREATE POLICY "Business members can view attendance" ON public.attendance FOR SELECT TO authenticated USING (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business members can insert attendance" ON public.attendance FOR INSERT TO authenticated WITH CHECK (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business owners can manage attendance" ON public.attendance FOR ALL TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Super admin views all attendance" ON public.attendance FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- leave_requests
CREATE POLICY "Business members can view leave requests" ON public.leave_requests FOR SELECT TO authenticated USING (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business members can insert leave requests" ON public.leave_requests FOR INSERT TO authenticated WITH CHECK (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business owners can manage leave requests" ON public.leave_requests FOR ALL TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Super admin views all leave requests" ON public.leave_requests FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- receivables
CREATE POLICY "Business members can view receivables" ON public.receivables FOR SELECT TO authenticated USING (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business members can insert receivables" ON public.receivables FOR INSERT TO authenticated WITH CHECK (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business owners can manage receivables" ON public.receivables FOR ALL TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Super admin views all receivables" ON public.receivables FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- payables
CREATE POLICY "Business members can view payables" ON public.payables FOR SELECT TO authenticated USING (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business members can insert payables" ON public.payables FOR INSERT TO authenticated WITH CHECK (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business owners can manage payables" ON public.payables FOR ALL TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Super admin views all payables" ON public.payables FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- payment_schedules
CREATE POLICY "Business members can view payment schedules" ON public.payment_schedules FOR SELECT TO authenticated USING (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business members can insert payment schedules" ON public.payment_schedules FOR INSERT TO authenticated WITH CHECK (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business owners can manage payment schedules" ON public.payment_schedules FOR ALL TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Super admin views all payment schedules" ON public.payment_schedules FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));
