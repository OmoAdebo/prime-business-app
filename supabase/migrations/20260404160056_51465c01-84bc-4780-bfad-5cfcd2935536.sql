
-- Staff wallets table for banking admin sub-wallet management
CREATE TABLE public.staff_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES public.employees_hr(id) ON DELETE CASCADE,
  wallet_name TEXT NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0,
  spending_limit NUMERIC DEFAULT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage staff wallets"
  ON public.staff_wallets FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business members can view staff wallets"
  ON public.staff_wallets FOR SELECT TO authenticated
  USING (user_belongs_to_business(auth.uid(), business_id));

CREATE POLICY "Super admin views all staff wallets"
  ON public.staff_wallets FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Auto-generate invoice trigger function
CREATE OR REPLACE FUNCTION public.auto_create_invoice_from_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _invoice_id UUID;
  _invoice_number TEXT;
  _invoice_count INT;
  _item RECORD;
BEGIN
  -- Only trigger when status changes to 'delivered' or 'completed'
  IF NEW.status IN ('delivered', 'completed') AND OLD.status NOT IN ('delivered', 'completed') THEN
    -- Generate invoice number
    SELECT COUNT(*) + 1 INTO _invoice_count FROM public.invoices WHERE business_id = NEW.business_id;
    _invoice_number := 'INV-' || LPAD(_invoice_count::text, 5, '0');

    -- Create invoice
    INSERT INTO public.invoices (
      business_id, customer_id, invoice_number, status, subtotal,
      vat_rate, vat_amount, total_amount, amount_paid, currency,
      issue_date, due_date, notes, created_by
    ) VALUES (
      NEW.business_id, NEW.customer_id, _invoice_number, 'draft',
      NEW.subtotal, 7.50, COALESCE(NEW.vat_amount, 0), NEW.total_amount,
      NEW.amount_paid, NEW.currency, CURRENT_DATE,
      CURRENT_DATE + INTERVAL '30 days',
      'Auto-generated from order ' || COALESCE(NEW.order_number, NEW.id::text),
      NULL
    ) RETURNING id INTO _invoice_id;

    -- Copy order items to invoice items
    FOR _item IN SELECT * FROM public.order_items WHERE order_id = NEW.id LOOP
      INSERT INTO public.invoice_items (invoice_id, product_id, description, quantity, unit_price, total_price)
      VALUES (_invoice_id, _item.product_id, _item.product_name, _item.quantity, _item.unit_price, _item.total_price);
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to orders table
CREATE TRIGGER trigger_auto_invoice_on_order_complete
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_invoice_from_order();
