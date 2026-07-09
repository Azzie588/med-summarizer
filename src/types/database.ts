export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          user_id: string;
          filename: string;
          storage_path: string;
          file_size: number | null;
          document_type: DocumentType;
          status: DocumentStatus;
          tags: string[];
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          filename: string;
          storage_path: string;
          file_size?: number | null;
          document_type?: DocumentType;
          status?: DocumentStatus;
          tags?: string[];
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          filename?: string;
          storage_path?: string;
          file_size?: number | null;
          document_type?: DocumentType;
          status?: DocumentStatus;
          tags?: string[];
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      summaries: {
        Row: {
          id: string;
          document_id: string;
          user_id: string;
          visit_date: string | null;
          provider_name: string | null;
          provider_specialty: string | null;
          visit_reason: string | null;
          synopsis: string;
          overall_summary: string;
          raw_extraction: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          user_id?: string;
          visit_date?: string | null;
          provider_name?: string | null;
          provider_specialty?: string | null;
          visit_reason?: string | null;
          synopsis: string;
          overall_summary: string;
          raw_extraction?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          user_id?: string;
          visit_date?: string | null;
          provider_name?: string | null;
          provider_specialty?: string | null;
          visit_reason?: string | null;
          synopsis?: string;
          overall_summary?: string;
          raw_extraction?: Json | null;
          created_at?: string;
        };
      };
      lab_results: {
        Row: {
          id: string;
          document_id: string;
          user_id: string;
          draw_date: string | null;
          ordering_provider: string | null;
          test_name: string;
          result_value: string | null;
          unit: string | null;
          reference_range: string | null;
          flag: string | null;
          is_abnormal: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          user_id?: string;
          draw_date?: string | null;
          ordering_provider?: string | null;
          test_name: string;
          result_value?: string | null;
          unit?: string | null;
          reference_range?: string | null;
          flag?: string | null;
          is_abnormal?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          user_id?: string;
          draw_date?: string | null;
          ordering_provider?: string | null;
          test_name?: string;
          result_value?: string | null;
          unit?: string | null;
          reference_range?: string | null;
          flag?: string | null;
          is_abnormal?: boolean;
          notes?: string | null;
          created_at?: string;
        };
      };
    };
  };
}

export type DocumentType = "visit_summary" | "progress_note" | "lab_result" | "other";
export type DocumentStatus = "pending" | "processing" | "completed" | "error";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Document = Database["public"]["Tables"]["documents"]["Row"];
export type Summary = Database["public"]["Tables"]["summaries"]["Row"];
export type LabResult = Database["public"]["Tables"]["lab_results"]["Row"];

export type DocumentWithSummary = Document & {
  summaries: Summary[];
};

export type DocumentWithLabResults = Document & {
  lab_results: LabResult[];
};
