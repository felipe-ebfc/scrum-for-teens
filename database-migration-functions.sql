-- Database Migration Functions for Supabase
-- Run this in your Supabase SQL Editor

-- Function to get table schema information
CREATE OR REPLACE FUNCTION get_table_schema(table_name TEXT)
RETURNS TABLE (
  column_name TEXT,
  data_type TEXT,
  is_nullable TEXT,
  column_default TEXT,
  constraint_type TEXT,
  constraint_definition TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::TEXT,
    c.data_type::TEXT,
    c.is_nullable::TEXT,
    c.column_default::TEXT,
    tc.constraint_type::TEXT,
    cc.check_clause::TEXT as constraint_definition
  FROM information_schema.columns c
  LEFT JOIN information_schema.constraint_column_usage ccu ON c.column_name = ccu.column_name 
    AND c.table_name = ccu.table_name
  LEFT JOIN information_schema.table_constraints tc ON ccu.constraint_name = tc.constraint_name
  LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
  WHERE c.table_name = $1
    AND c.table_schema = 'public'
  ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to execute SQL migrations
CREATE OR REPLACE FUNCTION execute_migration_sql(sql_text TEXT)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Execute the SQL
  EXECUTE sql_text;
  
  -- Return success
  result := json_build_object(
    'success', true,
    'message', 'Migration executed successfully'
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'sqlstate', SQLSTATE
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_table_schema(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_migration_sql(TEXT) TO authenticated;