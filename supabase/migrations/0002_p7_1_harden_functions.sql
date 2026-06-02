-- Address Supabase security advisors for the P7.1 functions (0 lints after this).

-- 1) Pin search_path so the function cannot be hijacked via a mutable path.
--    touch_updated_at only calls now() (pg_catalog), so an empty path is safe.
alter function public.touch_updated_at() set search_path = '';

-- 2) handle_new_user is a SECURITY DEFINER trigger function and must NOT be
--    callable from the public REST RPC endpoint. Triggers still fire (they run
--    in the table-owner context, independent of EXECUTE grants); revoking
--    EXECUTE only closes the /rest/v1/rpc/handle_new_user attack surface.
revoke execute on function public.handle_new_user() from anon, authenticated, public;
