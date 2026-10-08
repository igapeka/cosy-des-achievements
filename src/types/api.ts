export type BootstrapResponse = {
  apiVersion: 1;
  user: {
    id: string;
    telegramId: string;
    firstName: string;
    lastName: string | null;
    username: string | null;
  };
  collections: Array<{
    id: string;
    title: string;
    description: string;
    sortOrder: number;
  }>;
  stickers: Array<{
    id: string;
    collectionId: string;
    title: string;
    description: string;
    imageUrl: string;
    sortOrder: number;
    owned: boolean;
    awardedAt: string | null;
  }>;
};

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};
