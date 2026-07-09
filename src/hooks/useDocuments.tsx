import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { Document, Summary, LabResult, DocumentType } from "../types/database";
import type { PostgrestError } from "@supabase/supabase-js";

export interface DocumentWithDetails extends Document {
  summaries: Summary[];
  lab_results: LabResult[];
}

export type { DocumentType };

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch documents
      const { data: docs, error: docsError } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false }) as { data: Document[] | null; error: PostgrestError | null };

      if (docsError) throw docsError;

      if (!docs || docs.length === 0) {
        setDocuments([]);
        setLoading(false);
        return;
      }

      const docIds = docs.map((d) => d.id);

      // Fetch summaries
      const { data: summaries } = await supabase
        .from("summaries")
        .select("*")
        .in("document_id", docIds) as { data: Summary[] | null; error: PostgrestError | null };

      // Fetch lab results
      const { data: labResults } = await supabase
        .from("lab_results")
        .select("*")
        .in("document_id", docIds) as { data: LabResult[] | null; error: PostgrestError | null };

      // Combine data
      const documentsWithDetails: DocumentWithDetails[] = docs.map((doc) => ({
        ...doc,
        summaries: summaries?.filter((s) => s.document_id === doc.id) || [],
        lab_results: labResults?.filter((l) => l.document_id === doc.id) || [],
      }));

      setDocuments(documentsWithDetails);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const deleteDocument = async (documentId: string) => {
    const doc = documents.find((d) => d.id === documentId);
    if (!doc) return false;

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("medical-pdfs")
      .remove([doc.storage_path]);

    if (storageError) {
      console.error("Storage deletion error:", storageError);
    }

    // Delete from database (cascade will handle summaries and lab_results)
    const { error: dbError } = await supabase
      .from("documents")
      .delete()
      .eq("id", documentId);

    if (dbError) {
      console.error("Database deletion error:", dbError);
      return false;
    }

    setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    return true;
  };

  const updateDocument = async (
    documentId: string,
    updates: { tags?: string[]; notes?: string }
  ) => {
    const { error } = await supabase
      .from("documents")
      .update(updates as any)
      .eq("id", documentId);

    if (error) {
      console.error("Update error:", error);
      return false;
    }

    setDocuments((prev) =>
      prev.map((d) => (d.id === documentId ? { ...d, ...updates } : d))
    );
    return true;
  };

  const filteredDocuments = useCallback(
    (
      type?: DocumentType,
      search?: string,
      dateRange?: { start: string; end: string }
    ) => {
      let filtered = documents;

      if (type) {
        filtered = filtered.filter((d) => d.document_type === type);
      }

      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(
          (d) =>
            d.filename.toLowerCase().includes(searchLower) ||
            d.summaries.some(
              (s) =>
                s.provider_name?.toLowerCase().includes(searchLower) ||
                s.synopsis?.toLowerCase().includes(searchLower) ||
                s.overall_summary?.toLowerCase().includes(searchLower)
            ) ||
            d.lab_results.some(
              (l) =>
                l.test_name.toLowerCase().includes(searchLower) ||
                l.ordering_provider?.toLowerCase().includes(searchLower)
            )
        );
      }

      if (dateRange) {
        filtered = filtered.filter((d) => {
          const docDate = d.created_at.split("T")[0];
          return docDate >= dateRange.start && docDate <= dateRange.end;
        });
      }

      return filtered;
    },
    [documents]
  );

  return {
    documents,
    loading,
    error,
    fetchDocuments,
    deleteDocument,
    updateDocument,
    filteredDocuments,
  };
}
