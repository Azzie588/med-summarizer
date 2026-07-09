import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface SummarizeRequest {
  documentId: string;
  documentType: "visit_summary" | "progress_note" | "lab_result" | "other";
  text: string;
}

interface VisitSummary {
  visit_date: string | null;
  provider_name: string | null;
  provider_specialty: string | null;
  visit_reason: string | null;
  synopsis: string;
  overall_summary: string;
}

interface LabResult {
  draw_date: string | null;
  ordering_provider: string | null;
  tests: Array<{
    test_name: string;
    result_value: string;
    unit: string | null;
    reference_range: string | null;
    flag: string | null;
    is_abnormal: boolean;
  }>;
}

async function summarizeWithClaude(
  text: string,
  documentType: string,
  apiKey: string
): Promise<{ summary?: VisitSummary; labResults?: LabResult; error?: string }> {
  const prompt = documentType === "lab_result"
    ? `You are a medical records assistant. Extract lab test results from the following medical document text. Return a JSON object with this exact structure:

{
  "draw_date": "YYYY-MM-DD format date the blood was drawn, or null if not found",
  "ordering_provider": "Name of the doctor who ordered the tests, or null",
  "tests": [
    {
      "test_name": "Name of the test",
      "result_value": "The result value as a string",
      "unit": "Unit of measurement or null",
      "reference_range": "Normal range or null",
      "flag": "H, L, or null for high/low flags",
      "is_abnormal": true/false
    }
  ]
}

Extract ALL lab tests mentioned. If a test has multiple components (like a CBC), each component is a separate test. Be thorough.

Document text:
${text}`
    : `You are a medical records assistant. Extract key information from this ${documentType === "visit_summary" ? "visit summary" : documentType === "progress_note" ? "progress note" : "medical document"}. Return a JSON object with this exact structure:

{
  "visit_date": "YYYY-MM-DD format date of the visit, or null if not found",
  "provider_name": "Name of the healthcare provider, or null",
  "provider_specialty": "Specialty of the provider (e.g., Cardiology, Primary Care), or null",
  "visit_reason": "Brief reason for the appointment (1-2 sentences), or null",
  "synopsis": "A 2-4 sentence synopsis of what was discussed/accomplished",
  "overall_summary": "A comprehensive paragraph summary (4-8 sentences) covering the main points, findings, and any next steps"
}

Be accurate and do not hallucinate information not in the document.

Document text:
${text}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: `Claude API error: ${response.status} - ${errorText}` };
    }

    const data = await response.json();
    const contentText = data.content[0]?.text || "";

    // Extract JSON from the response
    const jsonMatch = contentText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { error: "Failed to extract JSON from Claude response" };
    }

    return documentType === "lab_result"
      ? { labResults: JSON.parse(jsonMatch[0]) }
      : { summary: JSON.parse(jsonMatch[0]) };
  } catch (err) {
    return { error: `Claude API call failed: ${err.message}` };
  }
}

function generateStandardFilename(
  documentType: string,
  visitDate: string | null,
  providerName: string | null,
  uploadDate: string
): string {
  const date = visitDate || uploadDate.split("T")[0];

  if (documentType === "lab_result") {
    return `${date}_Lab-Results.pdf`;
  }

  if (providerName) {
    const sanitized = providerName
      .replace(/[^a-zA-Z\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    return `${date}_${sanitized}.pdf`;
  }

  return `${date}_Medical-Record.pdf`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the ANTHROPIC_API_KEY from secrets
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return new Response(
        JSON.stringify({ error: "Anthropic API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: SummarizeRequest = await req.json();
    const { documentId, documentType, text } = body;

    if (!documentId || !documentType || !text) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: documentId, documentType, text" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user owns the document by checking the auth token
    const token = authHeader.replace("Bearer ", "");

    // Get user from the token using service role to verify
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the document belongs to the user
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("user_id")
      .eq("id", documentId)
      .maybeSingle();

    if (docError || !document || document.user_id !== userData.user.id) {
      return new Response(
        JSON.stringify({ error: "Document not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Claude API for summarization
    const result = await summarizeWithClaude(text, documentType, anthropicApiKey);

    if (result.error) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save results to database based on document type
    if (documentType === "lab_result" && result.labResults) {
      const labData = result.labResults;

      if (labData.tests && labData.tests.length > 0) {
        const labRecords = labData.tests.map(test => ({
          document_id: documentId,
          user_id: userData.user.id,
          draw_date: labData.draw_date,
          ordering_provider: labData.ordering_provider,
          test_name: test.test_name,
          result_value: test.result_value,
          unit: test.unit,
          reference_range: test.reference_range,
          flag: test.flag,
          is_abnormal: test.is_abnormal,
        }));

        const { error: insertError } = await supabase
          .from("lab_results")
          .insert(labRecords);

        if (insertError) {
          console.error("Failed to insert lab results:", insertError);
        }
      }

      // Rename document to standard format
      const { data: doc } = await supabase
        .from("documents")
        .select("created_at")
        .eq("id", documentId)
        .single();

      const standardFilename = generateStandardFilename(
        "lab_result",
        labData.draw_date,
        null,
        doc?.created_at ?? new Date().toISOString()
      );

      await supabase
        .from("documents")
        .update({ filename: standardFilename } as any)
        .eq("id", documentId);

      return new Response(
        JSON.stringify({
          success: true,
          type: "lab_result",
          data: labData,
          filename: standardFilename,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (result.summary) {
      const { error: insertError } = await supabase
        .from("summaries")
        .insert({
          document_id: documentId,
          user_id: userData.user.id,
          visit_date: result.summary.visit_date,
          provider_name: result.summary.provider_name,
          provider_specialty: result.summary.provider_specialty,
          visit_reason: result.summary.visit_reason,
          synopsis: result.summary.synopsis,
          overall_summary: result.summary.overall_summary,
          raw_extraction: result.summary,
        });

      if (insertError) {
        console.error("Failed to insert summary:", insertError);
      }

      // Rename document to standard format
      const { data: doc } = await supabase
        .from("documents")
        .select("created_at")
        .eq("id", documentId)
        .single();

      const standardFilename = generateStandardFilename(
        documentType,
        result.summary.visit_date,
        result.summary.provider_name,
        doc?.created_at ?? new Date().toISOString()
      );

      await supabase
        .from("documents")
        .update({ filename: standardFilename } as any)
        .eq("id", documentId);

      return new Response(
        JSON.stringify({
          success: true,
          type: "summary",
          data: result.summary,
          filename: standardFilename,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unexpected response format" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
