/*
# Initial Schema for Medical Records Summarizer

1. Purpose
This migration establishes the core database structure for a medical records PDF summarization tool. 
It supports multi-user access where each user can only see their own documents and summaries.

2. New Tables
- `profiles`: User profile data linked to Supabase auth, stores display name and preferences
- `documents`: Metadata for uploaded PDF files (filename, storage path, document type, upload date)
- `summaries`: AI-generated summaries with structured extraction for visit notes/progress notes
- `lab_results`: Individual lab test results extracted from lab report documents

3. Security
- Row Level Security (RLS) enabled on all tables
- Owner-scoped policies: users can only CRUD their own records
- All owner columns default to auth.uid() for automatic ownership assignment

4. Notes
- Document types: 'visit_summary', 'progress_note', 'lab_result', 'other'
- Summaries contain both structured fields (date, provider) and free-text summary
- Lab results are normalized for searchability (one row per test)
*/

-- User profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Documents table (PDF metadata)
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  filename text NOT NULL,
  storage_path text NOT NULL,
  file_size bigint,
  document_type text NOT NULL DEFAULT 'other',
  status text NOT NULL DEFAULT 'pending',
  tags text[] DEFAULT '{}',
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_documents" ON documents;
CREATE POLICY "select_own_documents" ON documents FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_documents" ON documents;
CREATE POLICY "insert_own_documents" ON documents FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_documents" ON documents;
CREATE POLICY "update_own_documents" ON documents FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_documents" ON documents;
CREATE POLICY "delete_own_documents" ON documents FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Summaries table (for visit summaries and progress notes)
CREATE TABLE IF NOT EXISTS summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  visit_date date,
  provider_name text,
  provider_specialty text,
  visit_reason text,
  synopsis text,
  overall_summary text NOT NULL,
  raw_extraction jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_summaries" ON summaries;
CREATE POLICY "select_own_summaries" ON summaries FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_summaries" ON summaries;
CREATE POLICY "insert_own_summaries" ON summaries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_summaries" ON summaries;
CREATE POLICY "update_own_summaries" ON summaries FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_summaries" ON summaries;
CREATE POLICY "delete_own_summaries" ON summaries FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Lab results table (individual test results from lab reports)
CREATE TABLE IF NOT EXISTS lab_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  draw_date date,
  ordering_provider text,
  test_name text NOT NULL,
  result_value text,
  result_numeric numeric,
  unit text,
  reference_range text,
  flag text,
  is_abnormal boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_lab_results" ON lab_results;
CREATE POLICY "select_own_lab_results" ON lab_results FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_lab_results" ON lab_results;
CREATE POLICY "insert_own_lab_results" ON lab_results FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_lab_results" ON lab_results;
CREATE POLICY "update_own_lab_results" ON lab_results FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_lab_results" ON lab_results;
CREATE POLICY "delete_own_lab_results" ON lab_results FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_summaries_user_id ON summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_summaries_visit_date ON summaries(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_lab_results_user_id ON lab_results(user_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_draw_date ON lab_results(draw_date DESC);
CREATE INDEX IF NOT EXISTS idx_lab_results_test_name ON lab_results(test_name);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();