/**
 * Custom fetch wrapper to handle central authentication checks and session invalidation.
 * Dispatches a custom event "auth-unauthorized" if a 401 Unauthorized occurs on an API call.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  
  if (response.status === 401) {
    const url = typeof input === "string" ? input : (input as any).url || "";
    // Avoid intercepting deliberate auth endpoint login/register 401s if they carry custom error text
    if (url.includes("/api/") && !url.includes("/api/auth/")) {
      window.dispatchEvent(new CustomEvent("auth-unauthorized"));
    }
  }
  
  return response;
}
