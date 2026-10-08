import { describe, expect, it } from "vitest";
import { createCatalog } from "./catalog.test-data";
import {
  getAchievementData,
  getCollectionPageData,
  getCollectionStickerPreview,
  getOwnedStickersInCatalogOrder,
  getSortedCollections,
  getUserDisplayName,
} from "./selectors";

describe("catalog selectors", () => {
  it.each([0, 1, 2, 3, 4, 6])("returns the right number of owned previews for %i awards", (count) => {
    const catalog = createCatalog(Array.from({ length: count }, (_, index) => `s${index + 1}`));
    const preview = getCollectionStickerPreview(catalog, "collection-a");

    expect(preview).toHaveLength(Math.min(count, 3));
    expect(preview.every((sticker) => sticker.owned)).toBe(true);
  });

  it("filters ownership after catalog ordering and takes the first three owned stickers", () => {
    const catalog = createCatalog(["s3", "s4", "s5", "s6"]);
    const originalIds = catalog.stickers.map((sticker) => sticker.id);

    expect(getCollectionStickerPreview(catalog, "collection-a").map(({ id }) => id)).toEqual([
      "s3",
      "s4",
      "s5",
    ]);
    expect(catalog.stickers.map((sticker) => sticker.id)).toEqual(originalIds);
  });

  it("orders collections by sortOrder then ID without mutating the catalog", () => {
    const catalog = createCatalog();
    const originalIds = catalog.collections.map((collection) => collection.id);

    expect(getSortedCollections(catalog).map(({ id }) => id)).toEqual([
      "collection-a",
      "collection-b",
      "collection-empty",
    ]);
    expect(catalog.collections.map((collection) => collection.id)).toEqual(originalIds);
  });

  it("returns every owned sticker grouped by collection order, then sticker order", () => {
    const catalog = createCatalog();
    const originalStickerIds = catalog.stickers.map((sticker) => sticker.id);

    expect(getOwnedStickersInCatalogOrder(catalog).map(({ id }) => id)).toEqual([
      "s3",
      "s4",
      "s5",
      "s6",
      "b1",
    ]);
    expect(catalog.stickers.map((sticker) => sticker.id)).toEqual(originalStickerIds);
  });

  it("does not truncate the laptop catalog at ten stickers", () => {
    const catalog = createCatalog();
    const extraStickers = Array.from({ length: 12 }, (_, index) => ({
      id: `extra-${index + 1}`,
      collectionId: "collection-a",
      title: `Дополнительный ${index + 1}`,
      description: "Синтетические тестовые данные",
      imageUrl: `/extra-${index + 1}.webp`,
      sortOrder: 10 + index,
      owned: true,
      awardedAt: null,
    }));
    catalog.stickers.push(...extraStickers);

    expect(getOwnedStickersInCatalogOrder(catalog)).toHaveLength(17);
    expect(getOwnedStickersInCatalogOrder(catalog).map(({ id }) => id)).toContain(
      "extra-12",
    );
  });

  it("returns collection metadata and every sticker in catalog order, including unowned stickers", () => {
    const catalog = createCatalog();
    const result = getCollectionPageData(catalog, "collection-a");

    expect(result?.collection).toMatchObject({
      title: "Первая",
      description: "Описание первой",
    });
    expect(result?.stickers.map(({ id }) => id)).toEqual([
      "s1",
      "s2",
      "s3",
      "s4",
      "s5",
      "s6",
    ]);
    expect(result?.stickers.filter(({ owned }) => !owned).map(({ id }) => id)).toEqual([
      "s1",
      "s2",
    ]);
  });

  it("treats known empty collections as valid and unknown collections as missing", () => {
    const catalog = createCatalog();

    expect(getCollectionPageData(catalog, "collection-empty")?.stickers).toEqual([]);
    expect(getCollectionStickerPreview(catalog, "collection-empty")).toEqual([]);
    expect(getCollectionPageData(catalog, "unknown-collection")).toBeNull();
  });

  it("distinguishes an unowned sticker from an unknown sticker", () => {
    const catalog = createCatalog(["s3"]);

    expect(getAchievementData(catalog, "s3")).toMatchObject({
      status: "owned",
      sticker: { imageUrl: "/s3.webp", description: "Описание s3", awardedAt: "2026-03-03T00:00:00.000Z" },
    });
    expect(getAchievementData(catalog, "s1")).toEqual({ status: "not-owned" });
    expect(getAchievementData(catalog, "unknown-sticker")).toEqual({ status: "missing" });
  });

  it("uses the user's first and last name fields", () => {
    expect(getUserDisplayName(createCatalog())).toBe("Тест Пользователь");
  });
});
