import { useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import type { DocumentType } from "../types/database";
import {
  Upload,
  FileText,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface PDFUploadProps {
  onUploadComplete: (documentId: string, documentType: DocumentType, storagePath: string) => void;
}

const documentTypes: { value: DocumentType; label: string; description: string }[] = [
  {
    value: "visit_summary",
    label: "Visit Summary",
    description: "Summary of a doctor's visit or consultation",
  },
  {
    value: "progress_note",
    label: "Progress Note",
    description: "Clinical progress notes from a healthcare provider",
  },
  {
    value: "lab_result",
    label: "Lab Result",
    description: "Blood work, urine tests, or other lab reports",
  },
  {
    value: "other",
    label: "Other",
    description: "Other medical documents",
  },
];

export function PDFUpload({ onUploadComplete }: PDFUploadProps) {
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>("visit_summary");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "application/pdf") {
      setFile(droppedFile);
      setError(null);
      setSuccess(false);
    } else {
      setError("Please upload a PDF file");
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        setError("Please upload a PDF file");
        return;
      }
      setFile(selectedFile);
      setError(null);
      setSuccess(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setUploading(true);
    setError(null);
    setProgress(0);
    setProgressLabel("Uploading PDF...");

    try {
      // Generate unique filename with user_id folder
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `${user.id}/${timestamp}-${sanitizedName}`;

      setProgress(25);

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("medical-pdfs")
        .upload(storagePath, file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      setProgress(55);
      setProgressLabel("Saving document record...");

      // Create document record
      const { data: insertedDoc, error: insertError } = await supabase.from("documents").insert({
        filename: file.name,
        storage_path: storagePath,
        file_size: file.size,
        document_type: documentType,
        status: "pending",
      } as any).select("id").single() as { data: { id: string } | null; error: any };

      if (insertError || !insertedDoc) {
        throw new Error(`Failed to create document record: ${insertError?.message || "Unknown error"}`);
      }

      setProgress(80);
      setProgressLabel("Starting AI processing...");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      setProgress(100);
      setSuccess(true);

      // Notify parent with document info so processing can start immediately
      onUploadComplete(insertedDoc.id, documentType, storagePath);

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
      setProgressLabel("");
    }
  };

  const clearFile = () => {
    setFile(null);
    setError(null);
    setSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Upload Document</h3>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          isDragging
            ? "border-teal-500 bg-teal-50"
            : file
            ? "border-slate-300 bg-slate-50"
            : "border-slate-300 hover:border-slate-400"
        }`}
      >
        {!file ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600 mb-1">
              Drag and drop your PDF here
            </p>
            <p className="text-sm text-slate-400">
              or click to browse
            </p>
          </>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <FileText className="w-8 h-8 text-red-500" />
            <div className="text-left">
              <p className="font-medium text-slate-800 truncate max-w-xs">
                {file.name}
              </p>
              <p className="text-sm text-slate-500">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              onClick={clearFile}
              className="p-1 hover:bg-slate-200 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 flex items-center gap-2 text-green-600 text-sm">
          <CheckCircle2 className="w-4 h-4" />
          Document uploaded successfully!
        </div>
      )}

      {/* Document Type Selection */}
      {file && !uploading && (
        <div className="mt-5">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Document Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {documentTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setDocumentType(type.value)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  documentType === type.value
                    ? "border-teal-500 bg-teal-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <p className="font-medium text-slate-800 text-sm">
                  {type.label}
                </p>
                <p className="text-xs text-slate-500">{type.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upload Button */}
      {file && !uploading && (
        <button
          onClick={handleUpload}
          className="mt-5 w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Upload className="w-5 h-5" />
          Upload Document
        </button>
      )}

      {/* Progress Bar */}
      {uploading && (
        <div className="mt-5">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
            <span className="text-sm text-slate-600">{progressLabel}</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
