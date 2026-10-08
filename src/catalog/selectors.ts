import type { BootstrapResponse } from "../types/api";

type OrderedItem = {
  id: string;
  sortOrder: number;
};

const byCatalogOrder = <T extends OrderedItem>(first: T, second: T) => {
  if (first.sortOrder !== second.sortOrder) {
    return first.sortOrder - second.sortOrder;
  }
  return first.id.localeCompare(second.id);
};

export function getSortedCollections(catalog: BootstrapResponse) {
  return [...catalog.collections].sort(byCatalogOrder);
}

export function getOwnedStickersInCatalogOrder(catalog: BootstrapResponse) {
  return getSortedCollections(catalog).flatMap((collection) =>
    catalog.stickers
      .filter((sticker) => sticker.collectionId === collection.id)
      .slice()
      .sort(byCatalogOrder)
      .filter((sticker) => sticker.owned),
  );
}

export function getCollectionStickerPreview(
  catalog: BootstrapResponse,
  collectionId: string,
) {
  return catalog.stickers
    .filter((sticker) => sticker.collectionId === collectionId)
    .slice()
    .sort(byCatalogOrder)
    .filter((sticker) => sticker.owned)
    .slice(0, 3);
}

export function getCollectionPageData(
  catalog: BootstrapResponse,
  collectionId: string,
) {
  const collection = catalog.collections.find((item) => item.id === collectionId);
  if (!collection) return null;

  return {
    collection,
    stickers: catalog.stickers
      .filter((sticker) => sticker.collectionId === collectionId)
      .slice()
      .sort(byCatalogOrder),
  };
}

export function getAchievementData(
  catalog: BootstrapResponse,
  stickerId: string,
) {
  const sticker = catalog.stickers.find((item) => item.id === stickerId);
  if (!sticker) return { status: "missing" as const };
  if (!sticker.owned) return { status: "not-owned" as const };
  return { status: "owned" as const, sticker };
}

export function getUserDisplayName(catalog: BootstrapResponse) {
  return [catalog.user.firstName, catalog.user.lastName].filter(Boolean).join(" ");
}
