import type { Summary } from "../types/database";
import {
  Calendar,
  User,
  Stethoscope,
  FileText,
  ArrowLeft,
  Download,
  Loader2,
} from "lucide-react";

interface SummaryViewProps {
  summary: Summary | undefined;
  filename: string;
  onBack: () => void;
}

export function SummaryView({ summary, filename, onBack }: SummaryViewProps) {
  if (!summary) {
    return (
      <div className="space-y-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to documents
        </button>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <Loader2 className="w-10 h-10 text-teal-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-700 font-medium">Processing your document...</p>
          <p className="text-sm text-slate-500 mt-1">
            Claude is reading and summarizing this record. This usually takes 10–30 seconds.
          </p>
        </div>
      </div>
    );
  }
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Not specified";
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleExport = () => {
    const content = `Medical Visit Summary
==================

Date: ${formatDate(summary.visit_date)}
Provider: ${summary.provider_name || "Not specified"}
Specialty: ${summary.provider_specialty || "Not specified"}

Reason for Visit:
${summary.visit_reason || "Not specified"}

Synopsis:
${summary.synopsis}

Full Summary:
${summary.overall_summary}

---
Document: ${filename}
Generated: ${new Date().toLocaleDateString()}
`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `summary-${summary.visit_date || "unknown"}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to documents
        </button>

        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Title */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
          <div className="flex items-center gap-3 text-white/80 text-sm mb-2">
            <FileText className="w-4 h-4" />
            {filename}
          </div>
          <h2 className="text-xl font-semibold text-white">
            Visit Summary
          </h2>
        </div>

        {/* Key Details */}
        <div className="p-6 border-b border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Visit Date</p>
                <p className="font-medium text-slate-800">
                  {formatDate(summary.visit_date)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <User className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Provider</p>
                <p className="font-medium text-slate-800">
                  {summary.provider_name || "Not specified"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Stethoscope className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Specialty</p>
                <p className="font-medium text-slate-800">
                  {summary.provider_specialty || "Not specified"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Reason for Visit */}
        {summary.visit_reason && (
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Reason for Visit
            </h3>
            <p className="text-slate-700 leading-relaxed">
              {summary.visit_reason}
            </p>
          </div>
        )}

        {/* Synopsis */}
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Brief Synopsis
          </h3>
          <p className="text-slate-700 leading-relaxed">{summary.synopsis}</p>
        </div>

        {/* Full Summary */}
        <div className="p-6">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Detailed Summary
          </h3>
          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
            {summary.overall_summary}
          </p>
        </div>
      </div>
    </div>
  );
}
