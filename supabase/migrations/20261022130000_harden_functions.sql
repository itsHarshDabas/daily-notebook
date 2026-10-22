-- Fixes from the Supabase security advisor: pin search_path, and keep the signup trigger
-- function out of the public RPC API (it only needs to run as a trigger).
alter function public.touch_updated_at() set search_path = '';
revoke execute on function public.handle_new_user() from public, anon, authenticated;
