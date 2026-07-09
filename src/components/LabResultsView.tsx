import type { LabResult } from "../types/database";
import {
  Calendar,
  User,
  TestTube,
  ArrowLeft,
  Download,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";

interface LabResultsViewProps {
  results: LabResult[];
  filename: string;
  onBack: () => void;
}

export function LabResultsView({ results, filename, onBack }: LabResultsViewProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Not specified";
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const drawDate = results[0]?.draw_date;
  const orderingProvider = results[0]?.ordering_provider;

  const handleExport = () => {
    const resultsText = results
      .map((r) => {
        const flag = r.flag ? ` [${r.flag}]` : "";
        const range = r.reference_range ? ` (Ref: ${r.reference_range})` : "";
        return `${r.test_name}: ${r.result_value || "N/A"}${r.unit ? ` ${r.unit}` : ""}${flag}${range}`;
      })
      .join("\n");

    const content = `Lab Results
===========

Draw Date: ${formatDate(drawDate)}
Ordering Provider: ${orderingProvider || "Not specified"}

Results:
--------
${resultsText}

---
Document: ${filename}
Generated: ${new Date().toLocaleDateString()}
`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lab-results-${drawDate || "unknown"}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getFlagIcon = (flag: string | null, isAbnormal: boolean) => {
    if (!isAbnormal) return <Minus className="w-4 h-4 text-slate-400" />;
    if (flag?.toUpperCase() === "H") return <ArrowUp className="w-4 h-4 text-red-500" />;
    if (flag?.toUpperCase() === "L") return <ArrowDown className="w-4 h-4 text-blue-500" />;
    return <ArrowUp className="w-4 h-4 text-amber-500" />;
  };

  const getFlagColor = (flag: string | null, isAbnormal: boolean) => {
    if (!isAbnormal) return "";
    if (flag?.toUpperCase() === "H") return "text-red-600 font-medium";
    if (flag?.toUpperCase() === "L") return "text-blue-600 font-medium";
    return "text-amber-600 font-medium";
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
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-5">
          <div className="flex items-center gap-3 text-white/80 text-sm mb-2">
            <TestTube className="w-4 h-4" />
            {filename}
          </div>
          <h2 className="text-xl font-semibold text-white">
            Lab Results
          </h2>
        </div>

        {/* Key Details */}
        <div className="p-6 border-b border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Draw Date</p>
                <p className="font-medium text-slate-800">
                  {formatDate(drawDate)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <User className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Ordering Provider</p>
                <p className="font-medium text-slate-800">
                  {orderingProvider || "Not specified"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Test
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Result
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Reference Range
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Flag
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {results.map((result) => (
                <tr
                  key={result.id}
                  className={`hover:bg-slate-50 transition-colors ${
                    result.is_abnormal ? "bg-red-50/50" : ""
                  }`}
                >
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">
                      {result.test_name}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className={`text-slate-800 ${getFlagColor(result.flag, result.is_abnormal)}`}>
                      {result.result_value || "N/A"}
                      {result.unit && (
                        <span className="text-slate-500 ml-1">{result.unit}</span>
                      )}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-slate-600">
                      {result.reference_range || "—"}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getFlagIcon(result.flag, result.is_abnormal)}
                      {result.flag && (
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          result.is_abnormal
                            ? result.flag.toUpperCase() === "H"
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {result.flag}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Stats */}
        <div className="p-6 bg-slate-50 border-t border-slate-200">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-slate-500">Total tests:</span>{" "}
              <span className="font-medium text-slate-800">{results.length}</span>
            </div>
            <div>
              <span className="text-slate-500">Abnormal:</span>{" "}
              <span className="font-medium text-red-600">
                {results.filter((r) => r.is_abnormal).length}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Normal:</span>{" "}
              <span className="font-medium text-green-600">
                {results.filter((r) => !r.is_abnormal).length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
