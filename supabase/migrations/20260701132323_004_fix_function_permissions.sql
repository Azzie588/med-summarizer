-- Revoke EXECUTE on update_updated_at_column from anon and authenticated
-- This function is only used internally by triggers, not via RPC
REVOKE EXECUTE ON FUNCTION update_updated_at_column() FROM anon;
REVOKE EXECUTE ON FUNCTION update_updated_at_column() FROM authenticated;