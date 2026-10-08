import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import CollectionFolder from "./CollectionFolder";

const mountedRoots: Root[] = [];
const mountedContainers: HTMLElement[] = [];

afterEach(async () => {
  for (const root of mountedRoots.splice(0)) {
    await act(async () => root.unmount());
  }
  for (const container of mountedContainers.splice(0)) container.remove();
});

describe("CollectionFolder", () => {
  it.each([0, 1, 2, 3, 4])("renders exactly min(%i, 3) preview images", async (count) => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    mountedRoots.push(root);
    mountedContainers.push(container);
    const onOpen = vi.fn();
    const stickers = Array.from({ length: count }, (_, index) => ({
      id: `sticker-${index + 1}`,
      src: `/sticker-${index + 1}.webp`,
      alt: `Стикер ${index + 1}`,
    }));

    await act(async () => {
      root.render(
        createElement(CollectionFolder, {
          title: "Коллекция",
          stickers,
          onOpen,
        }),
      );
    });

    const images = [...container.querySelectorAll("img")];
    expect(images).toHaveLength(Math.min(count, 3));
    expect(images.map((image) => image.alt)).toEqual(
      stickers.slice(0, 3).map((sticker) => sticker.alt),
    );
  });
});
