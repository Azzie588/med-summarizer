import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { DocumentType } from "../types/database";

export interface ProcessingState {
  status: "idle" | "extracting" | "summarizing" | "completed" | "error";
  message: string;
  error: string | null;
}

export function useDocumentProcessor() {
  const [processingState, setProcessingState] = useState<
    Record<string, ProcessingState>
  >({});

  const processDocument = useCallback(
    async (
      documentId: string,
      documentType: DocumentType,
      storagePath: string
    ) => {
      setProcessingState((prev) => ({
        ...prev,
        [documentId]: {
          status: "extracting",
          message: "Loading PDF engine...",
          error: null,
        },
      }));

      try {
        const [{ extractTextFromPDF }, { data: fileData, error: downloadError }] =
          await Promise.all([
            import("../lib/pdfExtract"),
            supabase.storage.from("medical-pdfs").download(storagePath),
          ]);

        if (downloadError || !fileData) {
          throw new Error("Failed to download PDF from storage");
        }

        setProcessingState((prev) => ({
          ...prev,
          [documentId]: {
            status: "extracting",
            message: "Extracting text from PDF...",
            error: null,
          },
        }));

        // Extract text from PDF
        const text = await extractTextFromPDF(fileData as File);

        if (!text.trim()) {
          throw new Error("No text could be extracted from this PDF");
        }

        setProcessingState((prev) => ({
          ...prev,
          [documentId]: {
            status: "summarizing",
            message: "Generating AI summary...",
            error: null,
          },
        }));

        // Get current session for auth token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Not authenticated");
        }

        // Call edge function for summarization
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/summarize-document`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              documentId,
              documentType,
              text,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Request failed (${response.status})`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Summarization failed");
        }

        // Update document status
        await supabase
          .from("documents")
          .update({ status: "completed" } as any)
          .eq("id", documentId);

        setProcessingState((prev) => ({
          ...prev,
          [documentId]: {
            status: "completed",
            message: "Processing complete!",
            error: null,
          },
        }));

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Processing failed";

        // Update document status to error
        await supabase
          .from("documents")
          .update({ status: "error" } as any)
          .eq("id", documentId);

        setProcessingState((prev) => ({
          ...prev,
          [documentId]: {
            status: "error",
            message: "Processing failed",
            error: errorMessage,
          },
        }));

        return false;
      }
    },
    []
  );

  const clearProcessingState = useCallback((documentId: string) => {
    setProcessingState((prev) => {
      const newState = { ...prev };
      delete newState[documentId];
      return newState;
    });
  }, []);

  return {
    processingState,
    processDocument,
    clearProcessingState,
  };
}
