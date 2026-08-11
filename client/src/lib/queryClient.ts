import { QueryClient, QueryFunction, QueryCache } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

/**
 * Variant of apiRequest for admin-protected endpoints.
 * On a 401 response, redirects to /admin (login page) to handle expired sessions.
 */
export async function adminApiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (res.status === 401) {
    queryClient.clear();
    window.location.href = "/admin";
    // Return the response so the error propagates no further
    return res;
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

/**
 * Query function for admin-protected endpoints.
 * Any 401 redirects to /admin immediately, clearing all cached state.
 */
export const adminQueryFn: QueryFunction<unknown> = async ({ queryKey }) => {
  const res = await fetch(queryKey.join("/") as string, {
    credentials: "include",
  });

  if (res.status === 401) {
    queryClient.clear();
    window.location.href = "/admin";
    return null;
  }

  await throwIfResNotOk(res);
  return await res.json();
};

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Redirect to login on 401 for any admin query
      if (
        error.message.startsWith("401:") &&
        typeof query.queryKey[0] === "string" &&
        (query.queryKey[0] as string).startsWith("/api/admin/")
      ) {
        queryClient.clear();
        window.location.href = "/admin";
      }
    },
  }),
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
