
-- Notifications table for in-app notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id UUID,
  _title TEXT,
  _message TEXT DEFAULT NULL,
  _type TEXT DEFAULT 'info',
  _business_id UUID DEFAULT NULL,
  _action_url TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  _id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, business_id, action_url, metadata)
  VALUES (_user_id, _title, _message, _type, _business_id, _action_url, _metadata)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- Trigger: notify on low stock
CREATE OR REPLACE FUNCTION public.check_low_stock_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  _owner_id UUID;
  _threshold INT;
  _product_name TEXT;
BEGIN
  -- Get product details
  SELECT p.name, p.low_stock_threshold, b.owner_id
  INTO _product_name, _threshold, _owner_id
  FROM public.products p
  JOIN public.businesses b ON b.id = p.business_id
  WHERE p.id = NEW.product_id;

  -- This would check stock movements; for now check if product stock is tracked
  RETURN NEW;
END;
$$;

-- Trigger: notify on overdue invoices (function for scheduled use)
CREATE OR REPLACE FUNCTION public.check_overdue_invoices()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  inv RECORD;
  _owner_id UUID;
BEGIN
  FOR inv IN
    SELECT i.id, i.invoice_number, i.due_date, i.total_amount, i.business_id, b.owner_id
    FROM public.invoices i
    JOIN public.businesses b ON b.id = i.business_id
    WHERE i.status IN ('sent', 'partially_paid')
      AND i.due_date < CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.metadata->>'invoice_id' = i.id::text
          AND n.type = 'warning'
          AND n.created_at > CURRENT_DATE - INTERVAL '1 day'
      )
  LOOP
    PERFORM public.create_notification(
      inv.owner_id,
      'Invoice Overdue',
      'Invoice ' || COALESCE(inv.invoice_number, 'N/A') || ' is past due',
      'warning',
      inv.business_id,
      '/invoicing',
      jsonb_build_object('invoice_id', inv.id)
    );
  END LOOP;
END;
$$;

-- Trigger: notify on budget overspend
CREATE OR REPLACE FUNCTION public.check_budget_overspend()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  _budget RECORD;
  _owner_id UUID;
BEGIN
  SELECT bu.name, bu.total_amount, bu.business_id, b.owner_id
  INTO _budget
  FROM public.budgets bu
  JOIN public.businesses b ON b.id = bu.business_id
  WHERE bu.id = NEW.budget_id;

  IF NEW.spent_amount > (SELECT allocated_amount FROM public.budget_items WHERE id = NEW.id) THEN
    PERFORM public.create_notification(
      _budget.owner_id,
      'Budget Alert',
      'Budget item in "' || _budget.name || '" has exceeded its allocation',
      'warning',
      _budget.business_id,
      '/budgeting',
      jsonb_build_object('budget_id', NEW.budget_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_budget_item_update
  AFTER UPDATE OF spent_amount ON public.budget_items
  FOR EACH ROW
  WHEN (NEW.spent_amount > OLD.spent_amount)
  EXECUTE FUNCTION public.check_budget_overspend();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
