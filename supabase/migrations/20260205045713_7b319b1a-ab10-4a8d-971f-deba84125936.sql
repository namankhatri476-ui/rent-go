-- Fix RLS for payments table - add INSERT policy for customers
CREATE POLICY "Customers can create payment records"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.id = order_id 
    AND o.customer_id = auth.uid()
  )
);

-- Ensure orders policies use PERMISSIVE instead of RESTRICTIVE
-- First drop and recreate the admin policy for orders to ensure it's permissive
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;

CREATE POLICY "Admins can manage all orders"
ON public.orders
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix payments admin policy too
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;

CREATE POLICY "Admins can manage all payments"
ON public.payments
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));