import { useEffect, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bootstrapHttpTransport,
  createDevMockTransport,
  fetchBootstrap,
  type BootstrapTransport,
} from "./bootstrap";
import { mockMode, supabaseUrl } from "./environment";
import {
  getUserAccessDenied,
  removePreviousBootstrapCaches,
  subscribeUserAccessDenied,
} from "./query-client";
import { getTelegramSession } from "../telegram/telegram";
import type { RuntimeMode } from "../telegram/runtime";

export function getBootstrapQueryKey(telegramId: string | null) {
  return ["bootstrap", telegramId ?? "telegram-unavailable"] as const;
}

export function createBootstrapTransport(isMock: boolean): BootstrapTransport {
  return isMock ? createDevMockTransport() : bootstrapHttpTransport;
}

export function shouldLoadMock(mode: RuntimeMode) {
  return mode === "dev-mock" && mockMode;
}

export function useBootstrapQuery({
  runtimeMode,
  telegramId,
}: {
  runtimeMode: RuntimeMode;
  telegramId: string | null;
}) {
  const queryClient = useQueryClient();
  const useMockTransport = shouldLoadMock(runtimeMode);
  const userKey = useMockTransport
    ? telegramId ?? "dev-mock"
    : telegramId ?? "telegram-unavailable";
  const queryKey = getBootstrapQueryKey(userKey);
  const accessDenied = useSyncExternalStore(
    (listener) => subscribeUserAccessDenied(userKey, listener),
    () => getUserAccessDenied(userKey),
    () => null,
  );
  const telegramSession = getTelegramSession();
  const enabled =
    !accessDenied &&
    (useMockTransport || Boolean(telegramId && telegramSession.initData));

  useEffect(() => {
    void removePreviousBootstrapCaches(queryClient, userKey);
  }, [queryClient, userKey]);

  const query = useQuery({
    queryKey,
    enabled,
    queryFn: ({ signal }) =>
      fetchBootstrap(
        {
          supabaseUrl,
          initData: useMockTransport ? null : telegramSession.initData,
          signal,
        },
        createBootstrapTransport(useMockTransport),
      ),
  });

  return { ...query, accessDenied, enabled, userKey };
}
