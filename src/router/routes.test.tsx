import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createCatalog } from "../catalog/catalog.test-data";
import { getBootstrapQueryKey } from "../api/useBootstrapQuery";
import { createAppRouter } from "./router";
import { RouterProvider } from "@tanstack/react-router";

const mountedRoots: Root[] = [];
const mountedContainers: HTMLElement[] = [];

async function mountRouter(
  initialEntries: string[] = ["/"],
  catalog = createCatalog(),
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(getBootstrapQueryKey(catalog.user.telegramId), catalog);
  const router = createAppRouter(
    {
      runtimeMode: "dev-mock",
      telegramId: catalog.user.telegramId,
      startupError: null,
    },
    initialEntries,
  );
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push(root);
  mountedContainers.push(container);
  await act(async () => {
    root.render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(RouterProvider, { router }),
      ),
    );
  });
  return { catalog, container, router };
}

afterEach(async () => {
  for (const root of mountedRoots.splice(0)) {
    await act(async () => root.unmount());
  }
  for (const container of mountedContainers.splice(0)) container.remove();
});

describe("catalog routes", () => {
  it("renders every collection and shows the first three owned previews in catalog order", async () => {
    const { container } = await mountRouter();
    const folders = [...container.querySelectorAll('[role="button"]')];
    const firstFolder = folders.find((folder) => folder.textContent?.includes("Первая"));

    expect(folders.map((folder) => folder.textContent)).toEqual(
      expect.arrayContaining([expect.stringContaining("Первая"), expect.stringContaining("Вторая"), expect.stringContaining("Пустая")]),
    );
    expect(firstFolder).toBeDefined();
    expect([...firstFolder!.querySelectorAll("img")].map((image) => image.alt)).toEqual([
      "Третий",
      "Четвёртый",
      "Пятый",
    ]);
    expect(container.textContent).toContain("Тест Пользователь");
    expect(container.querySelectorAll('button[aria-label="Назад"], button[aria-label="Обновить"], button[aria-label="Повторить"]')).toHaveLength(0);
  });

  it("opens a disabled sticker for viewing without its award date", async () => {
    const { container, router } = await mountRouter();
    const folder = [...container.querySelectorAll('[role="button"]')].find((item) =>
      item.textContent?.includes("Первая"),
    );
    expect(folder).toBeDefined();

    await act(async () => {
      folder!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(router.state.location.pathname).toBe("/collections/collection-a");

    const disabledFigure = container.querySelector('img[alt="Первый"]')?.closest("figure");
    expect(disabledFigure).not.toBeNull();
    await act(async () => {
      disabledFigure!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(router.state.location.pathname).toBe("/stickers/s1");
    expect(container.textContent).toContain("Описание s1");
    expect(container.textContent).not.toContain("3 марта 2026");
    expect(container.querySelectorAll("img")).toHaveLength(1);
    expect(container.querySelector("img")?.className).toContain("disabled");
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.textContent).not.toMatch(/Повторить|Обновить|Достижение ещё не получено/);
  });

  it("opens a received sticker with its catalog description and award date", async () => {
    const { container, router } = await mountRouter();
    await act(async () => {
      await router.navigate({ to: "/collections/$collectionId", params: { collectionId: "collection-a" } });
    });
    const receivedFigure = container.querySelector('img[alt="Третий"]')?.closest("figure");
    expect(receivedFigure).not.toBeNull();

    await act(async () => {
      receivedFigure!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(router.state.location.pathname).toBe("/stickers/s3");
    expect(container.textContent).toContain("Описание s3");
    expect(container.textContent).toContain("3 марта 2026");
    expect(container.querySelectorAll("img")).toHaveLength(2);
    expect([...container.querySelectorAll("img")].map((image) => image.alt)).toEqual([
      "Третий",
      "Третий",
    ]);
  });

  it("renders a known empty collection without substitute stickers", async () => {
    const { container, router } = await mountRouter();
    await act(async () => {
      await router.navigate({ to: "/collections/$collectionId", params: { collectionId: "collection-empty" } });
    });

    expect(container.querySelector("h1")?.textContent).toBe("Пустая");
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(container.textContent).toContain("Пустое описание");
  });

  it("shows every owned sticker in the laptop and preserves selection and color across routes", async () => {
    const catalog = createCatalog();
    catalog.stickers.push(
      ...Array.from({ length: 12 }, (_, index) => ({
        id: `laptop-extra-${index + 1}`,
        collectionId: "collection-a",
        title: `Ноутбук ${index + 1}`,
        description: `Тестовый стикер ${index + 1}`,
        imageUrl: `/laptop-extra-${index + 1}.webp`,
        sortOrder: 10 + index,
        owned: true,
        awardedAt: null,
      })),
    );
    const { container, router } = await mountRouter(["/"], catalog);

    const laptopButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Открыть ноутбук"]',
    );
    expect(laptopButton).not.toBeNull();
    await act(async () => laptopButton!.click());
    expect(router.state.location.pathname).toBe("/laptop");
    expect(container.querySelectorAll("button[aria-pressed]")).toHaveLength(17);
    expect(container.textContent).toContain("DES Ачивки @test_user");

    const stickerButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Выбрать стикер Третий"]',
    );
    expect(stickerButton).not.toBeNull();
    await act(async () => stickerButton!.click());
    expect(stickerButton!.getAttribute("aria-pressed")).toBe("true");

    const colorInput = container.querySelector<HTMLInputElement>('input[type="color"]');
    expect(colorInput).not.toBeNull();
    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      valueSetter?.call(colorInput, "#123456");
      colorInput!.dispatchEvent(new Event("input", { bubbles: true }));
      colorInput!.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await act(async () => {
      await router.navigate({ to: "/collections/$collectionId", params: { collectionId: "collection-a" } });
    });
    await act(async () => {
      await router.navigate({ to: "/laptop" });
    });

    expect(router.state.location.pathname).toBe("/laptop");
    expect(
      container.querySelector('button[aria-label="Выбрать стикер Третий"]')?.getAttribute("aria-pressed"),
    ).toBe("true");
    expect(container.querySelector('input[type="color"]')?.getAttribute("value")).toBe(
      "#123456",
    );
    expect([...container.querySelectorAll("img")].filter((image) => image.alt === "Третий")).toHaveLength(2);
  });

  it("uses the user's name without inventing a username and keeps an empty laptop empty", async () => {
    const catalog = createCatalog([]);
    catalog.user.username = null;
    const { container, router } = await mountRouter(["/"], catalog);

    await act(async () => {
      await router.navigate({ to: "/laptop" });
    });

    expect(container.textContent).toContain("DES Ачивки Тест Пользователь");
    expect(container.textContent).not.toContain("@Тест");
    expect(container.textContent).toContain("Пока нет полученных стикеров");
    expect(container.querySelectorAll("button[aria-pressed]")).toHaveLength(0);
    expect(container.querySelectorAll("img")).toHaveLength(0);
    const shuffle = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Перемешать расположение стикеров"]',
    );
    expect(shuffle).not.toBeNull();
    await act(async () => shuffle!.click());
    expect(container.querySelectorAll("img")).toHaveLength(0);
  });

  it("shows ErrorPage for truly unknown IDs and routes without action buttons", async () => {
    const { container, router } = await mountRouter();
    await act(async () => {
      await router.navigate({ to: "/stickers/$stickerId", params: { stickerId: "missing-sticker" } });
    });

    expect(container.textContent).toContain("Стикер не найден.");
    expect(container.querySelectorAll("button, a")).toHaveLength(0);

    await act(async () => {
      await router.navigate({ to: "/collections/$collectionId", params: { collectionId: "missing-collection" } });
    });
    expect(container.textContent).toContain("Коллекция не найдена.");
    expect(container.querySelectorAll("button, a")).toHaveLength(0);

    await act(async () => {
      await router.navigate({ to: "/not-a-route" as never });
    });
    expect(container.textContent).toContain("Страница не найдена.");
    expect(container.querySelectorAll("button, a")).toHaveLength(0);
  });

});
