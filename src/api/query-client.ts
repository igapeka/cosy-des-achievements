import { QueryCache, QueryClient } from "@tanstack/react-query";
import { isAccessDenied } from "./bootstrap";

export type AccessDeniedState = {
  code: string;
  message: string;
};

const deniedUsers = new Map<string, AccessDeniedState>();
const deniedListeners = new Map<string, Set<VoidFunction>>();

export function setUserAccessDenied(userKey: string, error: unknown) {
  if (!isAccessDenied(error)) return;
  deniedUsers.set(userKey, { code: error.code, message: error.message });
  deniedListeners.get(userKey)?.forEach((listener) => listener());
}

export function getUserAccessDenied(userKey: string) {
  return deniedUsers.get(userKey) ?? null;
}

export function subscribeUserAccessDenied(
  userKey: string,
  listener: VoidFunction,
) {
  const listeners = deniedListeners.get(userKey) ?? new Set<VoidFunction>();
  listeners.add(listener);
  deniedListeners.set(userKey, listeners);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) deniedListeners.delete(userKey);
  };
}

export function clearUserAccessDeniedForTests(userKey: string) {
  deniedUsers.delete(userKey);
  deniedListeners.get(userKey)?.forEach((listener) => listener());
}

type BootstrapQueryReference = { queryKey: readonly unknown[] };

function isBootstrapQuery(query: BootstrapQueryReference) {
  return query.queryKey[0] === "bootstrap";
}

export function clearBootstrapCachesAfterAccessDenied(
  queryClient: QueryClient,
  failedQuery: BootstrapQueryReference,
) {
  void queryClient
    .cancelQueries({
      queryKey: ["bootstrap"],
      predicate: (query) => isBootstrapQuery(query) && query !== failedQuery,
    })
    .then(() => {
      queryClient.removeQueries({ queryKey: ["bootstrap"] });
    });
}

export function shouldRetryBootstrap(failureCount: number, error: unknown) {
  if (isAccessDenied(error)) return false;
  if (error instanceof Error && "kind" in error) {
    if (error.kind === "network") return failureCount < 1;
    if (error.kind !== "http") return false;
  }
  if (
    error instanceof Error &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    if (error.status >= 400 && error.status < 500) return false;
    return error.status >= 500 && failureCount < 1;
  }
  return false;
}

export function removePreviousBootstrapCaches(
  queryClient: QueryClient,
  activeUserKey: string,
) {
  return queryClient
    .cancelQueries({
      queryKey: ["bootstrap"],
      predicate: (query) =>
        isBootstrapQuery(query) && query.queryKey[1] !== activeUserKey,
    })
    .then(() => {
      queryClient.removeQueries({
        queryKey: ["bootstrap"],
        predicate: (query) =>
          isBootstrapQuery(query) && query.queryKey[1] !== activeUserKey,
      });
    });
}

export function createBootstrapQueryClient() {
  const queryCache = new QueryCache({
    onError(error, query) {
      if (!isBootstrapQuery(query) || !isAccessDenied(error)) return;
      const userKey = String(query.queryKey[1] ?? "unknown");
      setUserAccessDenied(userKey, error);
      clearBootstrapCachesAfterAccessDenied(client, query);
    },
  });

  const client = new QueryClient({
    queryCache,
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: shouldRetryBootstrap,
      },
    },
  });

  return client;
}

export const queryClient = createBootstrapQueryClient();
