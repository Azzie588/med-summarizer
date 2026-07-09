/*
# Storage Bucket for Medical PDFs

1. Purpose
Creates a storage bucket for uploaded PDF medical records with appropriate security policies.

2. Changes
- Create 'medical-pdfs' storage bucket
- Set up RLS policies for storage objects
- Users can only upload/read/delete their own files

3. Security
- Files are stored with user_id in the path for automatic isolation
- Storage policies enforce user ownership
*/

-- Create the storage bucket for medical PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-pdfs',
  'medical-pdfs',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for user-scoped access
DROP POLICY IF EXISTS "Users can upload own PDFs" ON storage.objects;
CREATE POLICY "Users can upload own PDFs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'medical-pdfs' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can read own PDFs" ON storage.objects;
CREATE POLICY "Users can read own PDFs" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'medical-pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own PDFs" ON storage.objects;
CREATE POLICY "Users can delete own PDFs" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'medical-pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );