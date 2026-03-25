
-- Fix overly permissive anon INSERT policies for orders/order_items
-- Replace with check that storefront exists and is published
DROP POLICY "Anyone can insert orders" ON public.orders;
CREATE POLICY "Anyone can insert orders for published stores" ON public.orders FOR INSERT TO anon WITH CHECK (
  storefront_id IN (SELECT id FROM storefronts WHERE is_published = true)
);

DROP POLICY "Anyone can insert order items" ON public.order_items;
CREATE POLICY "Authenticated can insert order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (
  order_id IN (SELECT o.id FROM orders o WHERE user_belongs_to_business(auth.uid(), o.business_id))
);
