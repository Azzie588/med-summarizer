import { useState } from "react";
import type { DocumentWithDetails, DocumentType } from "../hooks/useDocuments";
import type { ProcessingState } from "../hooks/useDocumentProcessor";
import {
  FileText,
  Calendar,
  User,
  Stethoscope,
  TestTube,
  MoreVertical,
  Trash2,
  RefreshCw,
  Tag,
  Loader2,
  Clock,
  AlertCircle,
} from "lucide-react";

interface DocumentLibraryProps {
  documents: DocumentWithDetails[];
  processingState: Record<string, ProcessingState>;
  loading: boolean;
  onSelect: (doc: DocumentWithDetails) => void;
  onDelete: (id: string) => void;
  onProcess: (doc: DocumentWithDetails) => void;
}

const documentTypeIcons: Record<DocumentType, React.ReactNode> = {
  visit_summary: <Stethoscope className="w-4 h-4" />,
  progress_note: <FileText className="w-4 h-4" />,
  lab_result: <TestTube className="w-4 h-4" />,
  other: <FileText className="w-4 h-4" />,
};

const documentTypeColors: Record<DocumentType, string> = {
  visit_summary: "bg-blue-100 text-blue-700",
  progress_note: "bg-purple-100 text-purple-700",
  lab_result: "bg-amber-100 text-amber-700",
  other: "bg-slate-100 text-slate-700",
};

export function DocumentLibrary({
  documents,
  processingState,
  loading,
  onSelect,
  onDelete,
  onProcess,
}: DocumentLibraryProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getProvider = (doc: DocumentWithDetails): string | null => {
    if (doc.summaries[0]?.provider_name) {
      return doc.summaries[0].provider_name;
    }
    if (doc.lab_results[0]?.ordering_provider) {
      return doc.lab_results[0].ordering_provider;
    }
    return null;
  };

  const getVisitDate = (doc: DocumentWithDetails): string | null => {
    if (doc.summaries[0]?.visit_date) {
      return doc.summaries[0].visit_date;
    }
    if (doc.lab_results[0]?.draw_date) {
      return doc.lab_results[0].draw_date;
    }
    return null;
  };

  const getStatusBadge = (doc: DocumentWithDetails) => {
    const processing = processingState[doc.id];

    if (processing) {
      if (processing.status === "extracting" || processing.status === "summarizing") {
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-teal-50 text-teal-700 text-xs rounded-full">
            <Loader2 className="w-3 h-3 animate-spin" />
            {processing.message}
          </span>
        );
      }
      if (processing.status === "error") {
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-red-50 text-red-700 text-xs rounded-full">
            <AlertCircle className="w-3 h-3" />
            Error
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
          <FileText className="w-3 h-3" />
          Completed
        </span>
      );
    }

    switch (doc.status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-teal-50 text-teal-700 text-xs rounded-full">
            <Loader2 className="w-3 h-3 animate-spin" />
            Processing
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
            <FileText className="w-3 h-3" />
            Completed
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-red-50 text-red-700 text-xs rounded-full">
            <AlertCircle className="w-3 h-3" />
            Error
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-600 font-medium">No documents yet</p>
        <p className="text-sm text-slate-400 mt-1">
          Upload your first medical record to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => {
        const processing = processingState[doc.id];
        const isProcessing =
          processing?.status === "extracting" ||
          processing?.status === "summarizing";

        return (
          <div
            key={doc.id}
            className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => onSelect(doc)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                      documentTypeColors[doc.document_type]
                    }`}
                  >
                    {documentTypeIcons[doc.document_type]}
                    {doc.document_type.replace("_", " ")}
                  </span>
                  {getStatusBadge(doc)}
                </div>

                <h3 className="font-medium text-slate-800 truncate mb-1">
                  {doc.filename}
                </h3>

                <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Uploaded {formatDate(doc.created_at)}
                  </span>

                  {getVisitDate(doc) && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Visit: {getVisitDate(doc)}
                    </span>
                  )}

                  {getProvider(doc) && (
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      {getProvider(doc)}
                    </span>
                  )}
                </div>

                {doc.tags && doc.tags.length > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    <div className="flex flex-wrap gap-1">
                      {doc.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {processing?.error && (
                  <p className="mt-2 text-sm text-red-600">
                    {processing.error}
                  </p>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setOpenMenuId(openMenuId === doc.id ? null : doc.id)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  disabled={isProcessing}
                >
                  <MoreVertical className="w-5 h-5 text-slate-500" />
                </button>

                {openMenuId === doc.id && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                    {(doc.status === "pending" || doc.status === "error") && (
                      <button
                        onClick={() => {
                          onProcess(doc);
                          setOpenMenuId(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        {doc.status === "error" ? "Retry" : "Process"}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onDelete(doc.id);
                        setOpenMenuId(null);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
