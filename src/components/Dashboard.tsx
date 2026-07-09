import { useState, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { useDocuments, type DocumentWithDetails } from "../hooks/useDocuments";
import { useDocumentProcessor } from "../hooks/useDocumentProcessor";
import { PDFUpload } from "./PDFUpload";
import { DocumentLibrary } from "./DocumentLibrary";
import { SummaryView } from "./SummaryView";
import { LabResultsView } from "./LabResultsView";
import { DocumentFilters } from "./DocumentFilters";
import type { DocumentType } from "../types/database";
import {
  FileText,
  LogOut,
  Menu,
  X,
  RefreshCw,
} from "lucide-react";

type View = "list" | "summary" | "lab";

export function Dashboard() {
  const { user, profile, signOut } = useAuth();
  const {
    loading,
    error,
    fetchDocuments,
    deleteDocument,
    filteredDocuments,
  } = useDocuments();

  const { processingState, processDocument } = useDocumentProcessor();

  const [selectedDocument, setSelectedDocument] = useState<DocumentWithDetails | null>(null);
  const [view, setView] = useState<View>("list");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filters, setFilters] = useState<{
    type?: DocumentType;
    search?: string;
    dateRange?: { start: string; end: string };
  }>({});

  const handleUploadComplete = async (
    documentId: string,
    documentType: DocumentType,
    storagePath: string
  ) => {
    // Refresh document list first so it appears
    await fetchDocuments();
    // Then immediately start AI processing
    processDocument(documentId, documentType, storagePath).then((success) => {
      if (success) {
        setTimeout(() => fetchDocuments(), 500);
      }
    });
  };

  const handleSelectDocument = (doc: DocumentWithDetails) => {
    if (doc.document_type === "lab_result") {
      setSelectedDocument(doc);
      setView("lab");
    } else {
      setSelectedDocument(doc);
      setView("summary");
    }

    // If pending or errored, kick off processing
    if (doc.status === "pending" || doc.status === "error") {
      handleProcessDocument(doc);
    }
  };

  const handleProcessDocument = async (doc: DocumentWithDetails) => {
    const result = await processDocument(
      doc.id,
      doc.document_type,
      doc.storage_path
    );

    if (result) {
      setTimeout(() => fetchDocuments(), 500);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (confirm("Are you sure you want to delete this document?")) {
      await deleteDocument(id);
    }
  };

  const handleFilter = useCallback(
    (newFilters: { type?: DocumentType; search?: string; dateRange?: { start: string; end: string } }) => {
      setFilters(newFilters);
    },
    []
  );

  const handleBack = () => {
    setView("list");
    setSelectedDocument(null);
    fetchDocuments();
  };

  const getDisplayDocuments = () => {
    return filteredDocuments(filters.type, filters.search, filters.dateRange);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? (
                  <X className="w-5 h-5 text-slate-600" />
                ) : (
                  <Menu className="w-5 h-5 text-slate-600" />
                )}
              </button>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-600 rounded-lg">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold text-slate-800 hidden sm:inline">
                  Medical Records Summarizer
                </span>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <button
                onClick={fetchDocuments}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5 text-slate-500" />
              </button>

              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-slate-800">
                    {profile?.display_name || user?.email?.split("@")[0]}
                  </p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>

                <button
                  onClick={signOut}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === "list" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Upload Section */}
            <div className="lg:col-span-1">
              <PDFUpload onUploadComplete={handleUploadComplete} />
            </div>

            {/* Documents Section */}
            <div className="lg:col-span-2">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-800 mb-4">
                  Your Documents
                </h2>
                <DocumentFilters onFilter={handleFilter} />
                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}
              </div>

              <DocumentLibrary
                documents={getDisplayDocuments()}
                processingState={processingState}
                loading={loading}
                onSelect={handleSelectDocument}
                onDelete={handleDeleteDocument}
                onProcess={handleProcessDocument}
              />
            </div>
          </div>
        )}

        {view === "summary" && selectedDocument && (
          <SummaryView
            summary={selectedDocument.summaries[0]}
            filename={selectedDocument.filename}
            onBack={handleBack}
          />
        )}

        {view === "lab" && selectedDocument && (
          <LabResultsView
            results={selectedDocument.lab_results}
            filename={selectedDocument.filename}
            onBack={handleBack}
          />
        )}
      </main>
    </div>
  );
}
