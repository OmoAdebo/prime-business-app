-- Note: activity_logs table already exists. Add columns we need and triggers.

-- Make existing columns more flexible: ensure 'action' covers our needs
-- Add helper function to log activity
CREATE OR REPLACE FUNCTION public.log_activity(
  _business_id UUID,
  _action TEXT,
  _entity_type TEXT,
  _entity_id UUID DEFAULT NULL,
  _details JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.activity_logs (user_id, business_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), _business_id, _action, _entity_type, _entity_id, _details)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- Generic trigger function for auto-logging
CREATE OR REPLACE FUNCTION public.auto_log_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _action TEXT;
  _biz UUID;
  _entity UUID;
  _details JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN _action := 'created';
  ELSIF TG_OP = 'UPDATE' THEN _action := 'updated';
  ELSIF TG_OP = 'DELETE' THEN _action := 'deleted';
  END IF;

  _biz := COALESCE((NEW).business_id, (OLD).business_id);
  _entity := COALESCE((NEW).id, (OLD).id);
  _details := jsonb_build_object('table', TG_TABLE_NAME);

  INSERT INTO public.activity_logs (user_id, business_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), _biz, _action, TG_TABLE_NAME, _entity, _details);

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach triggers to key tables
DROP TRIGGER IF EXISTS log_invoices_activity ON public.invoices;
CREATE TRIGGER log_invoices_activity
AFTER INSERT OR UPDATE OR DELETE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.auto_log_activity();

DROP TRIGGER IF EXISTS log_products_activity ON public.products;
CREATE TRIGGER log_products_activity
AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.auto_log_activity();

DROP TRIGGER IF EXISTS log_bank_transactions_activity ON public.bank_transactions;
CREATE TRIGGER log_bank_transactions_activity
AFTER INSERT OR UPDATE OR DELETE ON public.bank_transactions
FOR EACH ROW EXECUTE FUNCTION public.auto_log_activity();

DROP TRIGGER IF EXISTS log_journal_entries_activity ON public.journal_entries;
CREATE TRIGGER log_journal_entries_activity
AFTER INSERT OR UPDATE OR DELETE ON public.journal_entries
FOR EACH ROW EXECUTE FUNCTION public.auto_log_activity();

DROP TRIGGER IF EXISTS log_payroll_runs_activity ON public.payroll_runs;
CREATE TRIGGER log_payroll_runs_activity
AFTER INSERT OR UPDATE OR DELETE ON public.payroll_runs
FOR EACH ROW EXECUTE FUNCTION public.auto_log_activity();

DROP TRIGGER IF EXISTS log_customers_activity ON public.customers;
CREATE TRIGGER log_customers_activity
AFTER INSERT OR UPDATE OR DELETE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.auto_log_activity();

DROP TRIGGER IF EXISTS log_bank_accounts_activity ON public.bank_accounts;
CREATE TRIGGER log_bank_accounts_activity
AFTER INSERT OR UPDATE OR DELETE ON public.bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.auto_log_activity();

-- Add team-member-can-see-own-logs policy (owners already covered)
DROP POLICY IF EXISTS "Team members view own logs" ON public.activity_logs;
CREATE POLICY "Team members view own logs"
ON public.activity_logs FOR SELECT TO authenticated
USING (user_id = auth.uid());