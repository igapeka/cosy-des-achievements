import { describe, expect, it, vi } from "vitest";
import { createCatalog } from "../catalog/catalog.test-data";
import { ApiError } from "./bootstrap";
import {
  clearUserAccessDeniedForTests,
  createBootstrapQueryClient,
  getUserAccessDenied,
  removePreviousBootstrapCaches,
  shouldRetryBootstrap,
} from "./query-client";
import { getBootstrapQueryKey } from "./useBootstrapQuery";

describe("bootstrap query cache", () => {
  it("partitions the in-memory catalog by Telegram ID and removes a previous user's data", async () => {
    const client = createBootstrapQueryClient();
    const firstCatalog = createCatalog();
    const secondCatalog = createCatalog();
    secondCatalog.user.telegramId = "telegram-user-2";
    const firstKey = getBootstrapQueryKey(firstCatalog.user.telegramId);
    const secondKey = getBootstrapQueryKey(secondCatalog.user.telegramId);

    client.setQueryData(firstKey, firstCatalog);
    client.setQueryData(secondKey, secondCatalog);
    await removePreviousBootstrapCaches(client, secondCatalog.user.telegramId);

    expect(client.getQueryData(firstKey)).toBeUndefined();
    expect(client.getQueryData(secondKey)).toEqual(secondCatalog);
    expect(getBootstrapQueryKey("telegram-user-1")).toEqual([
      "bootstrap",
      "telegram-user-1",
    ]);
  });

  it("clears a successful personal catalog and records denial after a later 401/403", async () => {
    const userKey = "transport-denial-user";
    clearUserAccessDeniedForTests(userKey);
    const client = createBootstrapQueryClient();
    const queryKey = getBootstrapQueryKey(userKey);
    const catalog = createCatalog();
    const successfulQuery = {
      queryKey,
      queryFn: async () => catalog,
      staleTime: 0,
    };
    await client.fetchQuery(successfulQuery);
    expect(client.getQueryData(queryKey)).toEqual(catalog);

    await expect(
      client.fetchQuery({
        ...successfulQuery,
        queryFn: async () => {
          throw new ApiError("Доступ не предоставлен", "http", 403, "ACCESS_DENIED");
        },
      }),
    ).rejects.toMatchObject({ status: 403 });

    await vi.waitFor(() => {
      expect(getUserAccessDenied(userKey)).toEqual({
        code: "ACCESS_DENIED",
        message: "Доступ не предоставлен",
      });
      expect(client.getQueryData(queryKey)).toBeUndefined();
    });
  });

  it("does not retry auth/client errors and retries network or server failures once", () => {
    for (const status of [400, 401, 403, 404]) {
      expect(shouldRetryBootstrap(0, new ApiError("error", "http", status))).toBe(
        false,
      );
    }
    expect(shouldRetryBootstrap(0, new ApiError("server", "http", 500))).toBe(
      true,
    );
    expect(shouldRetryBootstrap(1, new ApiError("server", "http", 500))).toBe(
      false,
    );
    expect(shouldRetryBootstrap(0, new ApiError("offline", "network"))).toBe(
      true,
    );
    expect(shouldRetryBootstrap(1, new ApiError("offline", "network"))).toBe(
      false,
    );
  });
});
