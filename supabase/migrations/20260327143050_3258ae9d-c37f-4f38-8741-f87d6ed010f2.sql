
-- Fix overly permissive INSERT policy - restrict to system/owner inserts
DROP POLICY "System can insert notifications" ON public.notifications;

CREATE POLICY "Users can insert own notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
