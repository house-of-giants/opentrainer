import { toast } from "@/components/ui/toast";

// TEMP DIAGNOSTIC (remove once SSO is stable): surface every failing Clerk
// API call as a visible toast so TestFlight builds can be debugged without a
// dev server. Captures endpoint, HTTP status, and Clerk's error code — the
// discriminator between e.g. signed_out / client_not_found /
// rotating_token_invalid.
let shown = 0;
const MAX_TOASTS = 6;

export function installClerkFetchDiagnostics() {
  const original = global.fetch;
  if ((global.fetch as unknown as { __clerkDiag?: boolean }).__clerkDiag) return;

  const wrapped: typeof fetch = async (input, init) => {
    const response = await original(input, init);
    try {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (/clerk\.opentrainer\.app|clerk\.accounts\.dev/.test(url) && response.status >= 400) {
        const clone = response.clone();
        let code = "?";
        let msg = "";
        try {
          const body = (await clone.json()) as {
            errors?: { code?: string; long_message?: string }[];
          };
          code = body?.errors?.[0]?.code ?? "?";
          msg = body?.errors?.[0]?.long_message ?? "";
        } catch {
          // non-JSON body
        }
        const path = new URL(url).pathname;
        const method = init?.method ?? "GET";
        console.log(`[clerk-diag] ${method} ${path} -> ${response.status} ${code} ${msg}`);
        if (shown < MAX_TOASTS) {
          shown += 1;
          toast.error(
            `diag: ${method} ${path} → ${response.status}`,
            `code: ${code}`,
          );
        }
      }
    } catch {
      // diagnostics must never break the request path
    }
    return response;
  };
  (wrapped as unknown as { __clerkDiag?: boolean }).__clerkDiag = true;
  global.fetch = wrapped;
}
