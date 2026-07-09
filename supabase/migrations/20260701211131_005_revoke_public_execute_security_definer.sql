-- Revoke EXECUTE on update_updated_at_column() from PUBLIC
-- This function is SECURITY DEFINER and only used internally by triggers, not via RPC.
-- Previous migration (004) revoked from anon/authenticated individually, but the broader
-- PUBLIC grant still allowed both roles to execute. Revoking from PUBLIC closes that gap.
REVOKE EXECUTE ON FUNCTION update_updated_at_column() FROM PUBLIC;