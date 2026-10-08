import { describe, expect, it, vi } from "vitest";
import { createCatalog } from "../catalog/catalog.test-data";
import {
  ApiError,
  createDevMockTransport,
  createHttpTransport,
  fetchBootstrap,
  isBootstrapResponse,
} from "./bootstrap";

const request = {
  supabaseUrl: "https://example.supabase.co",
  initData: "signed-init-data-do-not-log",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("bootstrap transport", () => {
  it("sends the raw initData only in the POST body and validates a successful contract", async () => {
    const catalog = createCatalog();
    const transport = vi.fn(async () => response(catalog));
    const result = await fetchBootstrap(request, transport);

    expect(result).toEqual(catalog);
    expect(transport).toHaveBeenCalledWith(request);
  });

  it("uses the documented endpoint, POST headers, body and AbortSignal", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn(async () => response(createCatalog()));
    const transport = createHttpTransport(fetcher);
    await transport({ ...request, signal: controller.signal });

    expect(fetcher).toHaveBeenCalledWith(
      "https://example.supabase.co/functions/v1/miniapp-bootstrap",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: request.initData }),
        signal: controller.signal,
      }),
    );
  });

  it("fails clearly when endpoint configuration or initData is missing", async () => {
    await expect(
      fetchBootstrap(
        { ...request, supabaseUrl: "" },
        createHttpTransport(vi.fn()),
      ),
    ).rejects.toMatchObject({ kind: "configuration", code: "MISSING_SUPABASE_URL" });
    await expect(
      fetchBootstrap(
        { ...request, initData: null },
        createHttpTransport(vi.fn()),
      ),
    ).rejects.toMatchObject({ kind: "credentials", code: "MISSING_INIT_DATA" });
  });

  it.each([
    [401, "INVALID_TELEGRAM_DATA"],
    [403, "ACCESS_DENIED"],
  ])("returns typed auth error for %i", async (status, code) => {
    await expect(
      fetchBootstrap(request, async () =>
        response({ error: { code, message: "Нет доступа" } }, status),
      ),
    ).rejects.toMatchObject({
      name: "ApiError",
      kind: "http",
      status,
      code,
      message: "Нет доступа",
    });
  });

  it("keeps 400 and 500 as typed HTTP errors", async () => {
    for (const status of [400, 500]) {
      await expect(
        fetchBootstrap(request, async () =>
          response({ error: { code: `HTTP_${status}`, message: "Ошибка" } }, status),
        ),
      ).rejects.toMatchObject({ kind: "http", status });
    }
    await expect(
      fetchBootstrap(request, async () => new Response("unavailable", { status: 500 })),
    ).rejects.toMatchObject({ kind: "http", status: 500 });
  });

  it("surfaces network errors with a readable typed error", async () => {
    await expect(
      fetchBootstrap(request, async () => {
        throw new TypeError("offline");
      }),
    ).rejects.toMatchObject({ kind: "network", code: "NETWORK_ERROR" });
  });

  it("does not convert cancellation into a network error", async () => {
    const controller = new AbortController();
    controller.abort();
    const abortError = new DOMException("Aborted", "AbortError");

    await expect(
      fetchBootstrap({ ...request, signal: controller.signal }, async () => {
        throw abortError;
      }),
    ).rejects.toBe(abortError);
  });

  it("rejects invalid JSON and invalid API versions or payload shapes", async () => {
    await expect(
      fetchBootstrap(request, async () => new Response("not json", { status: 200 })),
    ).rejects.toMatchObject({ kind: "invalid-json" });

    const wrongVersion = { ...createCatalog(), apiVersion: 2 };
    await expect(
      fetchBootstrap(request, async () => response(wrongVersion)),
    ).rejects.toMatchObject({ kind: "invalid-response", code: "INVALID_BOOTSTRAP_RESPONSE" });

    const malformed = createCatalog();
    (malformed.stickers[0] as { owned: unknown }).owned = "yes";
    expect(isBootstrapResponse(malformed)).toBe(false);
  });

  it("routes dev mock through fixture transport without sending a fake user identity", async () => {
    const fetcher = vi.fn(async () => response(createCatalog()));
    const transport = createDevMockTransport(fetcher);
    const controller = new AbortController();
    const result = await fetchBootstrap(
      { supabaseUrl: "", initData: null, signal: controller.signal },
      transport,
    );

    expect(result.apiVersion).toBe(1);
    expect(fetcher).toHaveBeenCalledWith(
      "/__local-mocks/bootstrap.json",
      { method: "GET", signal: controller.signal },
    );
  });

  it("does not replace a server transport error with mock data", async () => {
    await expect(
      fetchBootstrap(request, async () => {
        throw new ApiError("denied", "http", 403, "ACCESS_DENIED");
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
});
