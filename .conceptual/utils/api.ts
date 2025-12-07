import { getAccessToken, getApiUrl } from "./config.ts";

export interface ApiError {
  error: string;
}

/**
 * Make a POST request to the API
 */
export async function apiRequest<T>(
  endpoint: string,
  body: unknown,
  options: { requireAuth?: boolean; timeout?: number } = {},
): Promise<T> {
  const apiUrl = getApiUrl();
  const url = `${apiUrl}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Get access token if available
  let accessToken: string | undefined;
  if (options.requireAuth !== false) {
    accessToken = await getAccessToken();
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }
  }

  // Include accessToken in request body (as expected by Requesting concept)
  const requestBody =
    typeof body === "object" && body !== null && !Array.isArray(body)
      ? {
        ...body as Record<string, unknown>,
        ...(accessToken && { accessToken }),
      }
      : body;

  // Create AbortController for timeout
  const timeout = options.timeout || 60000; // Default 60 seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json() as ApiError;
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // If response is not JSON, use the status text
      }
      throw new Error(errorMessage);
    }

    return await response.json() as T;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeout}ms`);
    }
    throw error;
  }
}
