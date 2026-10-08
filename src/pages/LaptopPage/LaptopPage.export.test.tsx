import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCatalog } from "../../catalog/catalog.test-data";
import { getBootstrapQueryKey } from "../../api/useBootstrapQuery";
import { createAppRouter } from "../../router/router";
import { RouterProvider } from "@tanstack/react-router";

const nativeBack = vi.hoisted(() => ({ handler: null as null | VoidFunction }));

vi.mock("html-to-image", () => ({ toBlob: vi.fn() }));
vi.mock("../../telegram/telegram", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../telegram/telegram")>();
  return {
    ...actual,
    subscribeToNativeBackButton: (handler: VoidFunction) => {
      nativeBack.handler = handler;
      return () => {
        if (nativeBack.handler === handler) nativeBack.handler = null;
      };
    },
  };
});

import { toBlob } from "html-to-image";

const mounted: Array<{ root: Root; container: HTMLElement }> = [];
const originalDecode = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "decode");
const remoteImage =
  "https://fphxbiwjvyfjxkuyjowm.supabase.co/storage/v1/object/public/stickers/manual/vyezdnye/azerbaydzhan-sticker.webp";

async function mountLaptop(imageUrl = remoteImage) {
  const catalog = createCatalog();
  const sticker = catalog.stickers.find((item) => item.id === "s3")!;
  sticker.imageUrl = imageUrl;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(getBootstrapQueryKey(catalog.user.telegramId), catalog);
  const router = createAppRouter({
    runtimeMode: "dev-mock",
    telegramId: catalog.user.telegramId,
    startupError: null,
  }, ["/laptop"]);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mounted.push({ root, container });
  await act(async () => {
    root.render(createElement(
      QueryClientProvider,
      { client },
      createElement(RouterProvider, { router }),
    ));
  });
  return container;
}

function stubLoadedImages() {
  vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
  vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(72);
  Object.defineProperty(HTMLImageElement.prototype, "decode", {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { ready: Promise.resolve() },
  });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:laptop-export"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
}

afterEach(async () => {
  for (const { root, container } of mounted.splice(0)) {
    await act(async () => root.unmount());
    container.remove();
  }
  nativeBack.handler = null;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (originalDecode) Object.defineProperty(HTMLImageElement.prototype, "decode", originalDecode);
  else Reflect.deleteProperty(HTMLImageElement.prototype, "decode");
});

describe("laptop export", () => {
  it("waits for remote sticker data before downloading the complete PNG", async () => {
    stubLoadedImages();
    const fetchMock = vi.fn().mockResolvedValue(
      {
        ok: true,
        status: 200,
        blob: async () => new Blob(["webp"], { type: "image/webp" }),
      },
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(toBlob).mockResolvedValue(new Blob(["png"], { type: "image/png" }));
    const container = await mountLaptop();

    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[aria-label="Выбрать стикер Третий"]')!.click();
    });
    await act(async () => {
      [...container.querySelectorAll<HTMLButtonElement>("button")]
        .find((button) => button.textContent?.includes("Сохранить"))!.click();
      await vi.waitFor(() => expect(toBlob).toHaveBeenCalledOnce());
    });

    expect(fetchMock).toHaveBeenCalledWith(remoteImage, { mode: "cors", credentials: "omit" });
    expect(container.textContent).not.toContain("Не удалось сохранить ноутбук");
    expect(toBlob).toHaveBeenCalledOnce();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
    expect(container.textContent).not.toContain("Не удалось сохранить ноутбук");
    expect(container.querySelector('button[aria-label="Выбрать стикер Третий"]')?.getAttribute("aria-pressed")).toBe("true");
  });

  it("shows ErrorPage on image failure and native Back restores the unchanged draft", async () => {
    stubLoadedImages();
    const failedImage = `${remoteImage}?failed-export=1`;
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("CORS blocked"));
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(toBlob).mockReset();
    const container = await mountLaptop(failedImage);

    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[aria-label="Выбрать стикер Третий"]')!.click();
    });
    await act(async () => {
      [...container.querySelectorAll<HTMLButtonElement>("button")]
        .find((button) => button.textContent?.includes("Сохранить"))!.click();
    });
    await vi.waitFor(() => expect(container.textContent).toContain("Не удалось сохранить ноутбук"));

    expect(fetchMock).toHaveBeenCalledWith(failedImage, { mode: "cors", credentials: "omit" });
    expect(container.textContent).toContain("Не удалось сохранить ноутбук");
    expect(container.querySelectorAll("button, a")).toHaveLength(0);
    expect(toBlob).not.toHaveBeenCalled();
    expect(nativeBack.handler).toBeTypeOf("function");

    await act(async () => nativeBack.handler?.());

    expect(container.textContent).toContain("DES Ачивки");
    expect(container.querySelector('button[aria-label="Выбрать стикер Третий"]')?.getAttribute("aria-pressed")).toBe("true");
  });
});
