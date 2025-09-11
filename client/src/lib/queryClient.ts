import { QueryClient, QueryFunction, MutationCache, QueryCache } from "@tanstack/react-query";

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
  const isGetOrHead = method.toUpperCase() === 'GET' || method.toUpperCase() === 'HEAD';
  
  const res = await fetch(url, {
    method,
    headers: (!isGetOrHead && data) ? { "Content-Type": "application/json" } : {},
    body: (!isGetOrHead && data) ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

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

// Global 401 error handler
function handle401Error() {
  // Only redirect to login if we're not already on an auth page
  if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
    console.log('401 error detected, redirecting to login');
    window.location.href = '/login';
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      // Handle 401 errors globally
      if (error.message.includes('401:')) {
        handle401Error();
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      // Handle 401 errors globally for mutations too
      if (error.message.includes('401:')) {
        handle401Error();
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
