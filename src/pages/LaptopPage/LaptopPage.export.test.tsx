import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCatalog } from "../../catalog/catalog.test-data";
import { getBootstrapQueryKey } from "../../api/useBootstrapQuery";
import { createAppRouter } from "../../router/router";
import { RouterProvider } from "@tanstack/react-router";

const nativeBack = vi.hoisted(() => ({ handler: null as null | VoidFunction }));

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

const mounted: Array<{ root: Root; container: HTMLElement }> = [];

async function mountLaptop() {
  const catalog = createCatalog();
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

afterEach(async () => {
  for (const { root, container } of mounted.splice(0)) {
    await act(async () => root.unmount());
    container.remove();
  }
  nativeBack.handler = null;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("laptop screenshot preview", () => {
  it("opens the live image without controls or image export", async () => {
    const container = await mountLaptop();

    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[aria-label="Выбрать стикер Третий"]')!.click();
    });
    await act(async () => {
      [...container.querySelectorAll<HTMLButtonElement>("button")]
        .find((button) => button.textContent?.includes("Сохранить"))!.click();
    });

    expect(container.textContent).toContain("Паршивый телеграм не даёт сохранять картинки");
    expect(container.querySelector('img[alt="Третий"]')).not.toBeNull();
    expect(container.querySelectorAll("button")).toHaveLength(0);
  });

  it("native Back returns to the unchanged draft", async () => {
    const container = await mountLaptop();

    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[aria-label="Выбрать стикер Третий"]')!.click();
    });
    await act(async () => {
      [...container.querySelectorAll<HTMLButtonElement>("button")]
        .find((button) => button.textContent?.includes("Сохранить"))!.click();
    });
    expect(container.textContent).toContain("Паршивый телеграм не даёт сохранять картинки");
    expect(nativeBack.handler).toBeTypeOf("function");

    await act(async () => nativeBack.handler?.());

    expect(container.textContent).toContain("DES Ачивки");
    expect(container.querySelector('button[aria-label="Выбрать стикер Третий"]')?.getAttribute("aria-pressed")).toBe("true");
  });
});
