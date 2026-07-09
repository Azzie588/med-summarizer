import { useState } from "react";
import type { DocumentType } from "../types/database";
import { Search, X, SlidersHorizontal } from "lucide-react";

interface DocumentFiltersProps {
  onFilter: (filters: {
    type?: DocumentType;
    search?: string;
    dateRange?: { start: string; end: string };
  }) => void;
}

const documentTypes: { value: DocumentType | undefined; label: string }[] = [
  { value: undefined, label: "All types" },
  { value: "visit_summary", label: "Visit Summary" },
  { value: "progress_note", label: "Progress Note" },
  { value: "lab_result", label: "Lab Result" },
  { value: "other", label: "Other" },
];

export function DocumentFilters({ onFilter }: DocumentFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<DocumentType | undefined>(undefined);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  const handleSearch = () => {
    onFilter({
      type,
      search: search || undefined,
      dateRange:
        dateStart && dateEnd ? { start: dateStart, end: dateEnd } : undefined,
    });
  };

  const handleClear = () => {
    setSearch("");
    setType(undefined);
    setDateStart("");
    setDateEnd("");
    onFilter({});
  };

  const hasFilters = search || type || (dateStart && dateEnd);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search documents, providers, tests..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-800"
          />
        </div>

        {/* Toggle Filters Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg transition-colors ${
            showFilters
              ? "bg-teal-50 border-teal-300 text-teal-700"
              : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </button>

        {/* Search/Clear Buttons */}
        <button
          onClick={handleSearch}
          className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors"
        >
          Search
        </button>

        {hasFilters && (
          <button
            onClick={handleClear}
            className="p-2.5 hover:bg-slate-100 rounded-lg transition-colors"
            title="Clear filters"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        )}
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Document Type
            </label>
            <select
              value={type || ""}
              onChange={(e) =>
                setType(e.target.value ? (e.target.value as DocumentType) : undefined)
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-800"
            >
              {documentTypes.map((dt) => (
                <option key={dt.label} value={dt.value || ""}>
                  {dt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              From Date
            </label>
            <input
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              To Date
            </label>
            <input
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-800"
            />
          </div>
        </div>
      )}
    </div>
  );
}
