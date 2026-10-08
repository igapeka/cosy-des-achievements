import type { BootstrapResponse } from "../types/api";

export function createCatalog(ownedIds: string[] = ["s3", "s4", "s5", "s6", "b1"]): BootstrapResponse {
  const owned = new Set(ownedIds);
  return {
    apiVersion: 1,
    user: {
      id: "user-1",
      telegramId: "telegram-1",
      firstName: "Тест",
      lastName: "Пользователь",
      username: "test_user",
    },
    collections: [
      { id: "collection-b", title: "Вторая", description: "Описание второй", sortOrder: 2 },
      { id: "collection-a", title: "Первая", description: "Описание первой", sortOrder: 1 },
      { id: "collection-empty", title: "Пустая", description: "Пустое описание", sortOrder: 3 },
    ],
    stickers: [
      { id: "s4", collectionId: "collection-a", title: "Четвёртый", description: "Описание s4", imageUrl: "/s4.webp", sortOrder: 4, owned: owned.has("s4"), awardedAt: "2026-04-04T00:00:00.000Z" },
      { id: "s2", collectionId: "collection-a", title: "Второй", description: "Описание s2", imageUrl: "/s2.webp", sortOrder: 2, owned: owned.has("s2"), awardedAt: null },
      { id: "s6", collectionId: "collection-a", title: "Шестой", description: "Описание s6", imageUrl: "/s6.webp", sortOrder: 6, owned: owned.has("s6"), awardedAt: "2026-06-06T00:00:00.000Z" },
      { id: "s1", collectionId: "collection-a", title: "Первый", description: "Описание s1", imageUrl: "/s1.webp", sortOrder: 1, owned: owned.has("s1"), awardedAt: null },
      { id: "s3", collectionId: "collection-a", title: "Третий", description: "Описание s3", imageUrl: "/s3.webp", sortOrder: 3, owned: owned.has("s3"), awardedAt: "2026-03-03T00:00:00.000Z" },
      { id: "s5", collectionId: "collection-a", title: "Пятый", description: "Описание s5", imageUrl: "/s5.webp", sortOrder: 5, owned: owned.has("s5"), awardedAt: "2026-05-05T00:00:00.000Z" },
      { id: "b1", collectionId: "collection-b", title: "Из другой коллекции", description: "Описание b1", imageUrl: "/b1.webp", sortOrder: 1, owned: owned.has("b1"), awardedAt: "2026-01-01T00:00:00.000Z" },
    ],
  };
}
