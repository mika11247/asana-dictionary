-- Apply only after the atomic creation path is live and verified.
revoke delete on table public.crm_customers from public, anon, authenticated;
