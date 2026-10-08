import {
  Outlet,
  useNavigate,
  useParams,
  useRouter,
  useRouteContext,
  useRouterState,
} from "@tanstack/react-router";
import { on } from "@tma.js/sdk-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { ApiError } from "../api/bootstrap";
import { getUserAccessDenied } from "../api/query-client";
import { useBootstrapQuery } from "../api/useBootstrapQuery";
import type { BootstrapResponse } from "../types/api";
import AchievementPage from "../pages/AchievementPage/AchievementPage";
import CollectionPage from "../pages/CollectionPage/CollectionPage";
import ErrorPage from "../pages/ErrorPage/ErrorPage";
import LaptopPage from "../pages/LaptopPage/LaptopPage";
import { LaptopDraftProvider } from "../pages/LaptopPage/LaptopDraft";
import MainPage from "../pages/MainPage/MainPage";
import { BootstrapProvider } from "../catalog/BootstrapContext";
import { useBootstrapCatalog } from "../catalog/bootstrap-context";
import {
  navigateBackInternally,
  recordInternalNavigation,
} from "../navigation/internalBack";
import {
  setNativeBackButtonVisible,
  subscribeToNativeBackButton,
} from "../telegram/telegram";
import {
  getAchievementData,
  getCollectionPageData,
  getCollectionStickerPreview,
  getOwnedStickersInCatalogOrder,
  getSortedCollections,
  getUserDisplayName,
} from "../catalog/selectors";
import styles from "./router.module.css";

export function RootLayout() {
  const { runtimeMode, telegramId, startupError } = useRouteContext({ from: "__root__" });
  const query = useBootstrapQuery({ runtimeMode, telegramId });
  const bootstrap = query.data ?? null;
  const denial = query.accessDenied ?? (telegramId ? getUserAccessDenied(telegramId) : null);
  const errorMessage =
    startupError ??
    (denial
      ? getAccessDeniedMessage(denial.code, denial.message)
      : query.isError
        ? getBootstrapErrorMessage(query.error)
        : null);
  const missingTelegramSession =
    runtimeMode === "telegram" && (!telegramId || !query.enabled);
  const ownerId = denial
    ? null
    : runtimeMode === "dev-mock"
      ? "dev-mock"
      : telegramId ?? bootstrap?.user.id ?? null;
  const ownedStickerIds =
    bootstrap && !denial
      ? getOwnedStickersInCatalogOrder(bootstrap).map(({ id }) => id)
      : [];

  return (
    <>
      <TelegramBackButtonController
        enabled={!startupError && (Boolean(bootstrap) || query.isError || Boolean(denial))}
        bootstrap={bootstrap}
      />
      {runtimeMode === "telegram" && <TelegramActivationQuerySync />}
      <LaptopDraftProvider
        key={ownerId ?? "no-user"}
        ownerId={ownerId}
        ownedStickerIds={ownedStickerIds}
      >
        {errorMessage ? (
          <ErrorPage message={errorMessage} />
        ) : missingTelegramSession ? (
          <ErrorPage message="Не удалось получить данные запуска Telegram. Закройте и заново откройте мини-приложение." />
        ) : bootstrap ? (
          <BootstrapProvider value={bootstrap}>
            {runtimeMode === "dev-mock" && (
              <div className={styles.demoBadge}>ДЕМО · локальные данные</div>
            )}
            <Outlet />
          </BootstrapProvider>
        ) : (
          <ErrorPage message="Загружаем каталог…" />
        )}
      </LaptopDraftProvider>
    </>
  );
}

function TelegramActivationQuerySync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    try {
      return on("visibility_changed", ({ is_visible }) => {
        if (!is_visible) return;
        void queryClient.refetchQueries({
          queryKey: ["bootstrap"],
          type: "active",
          stale: true,
        });
      });
    } catch {
      return undefined;
    }
  }, [queryClient]);

  return null;
}

function getAccessDeniedMessage(code: string, fallback: string) {
  if (code === "TELEGRAM_DATA_EXPIRED") {
    return "Срок действия данных Telegram истёк. Закройте и заново откройте мини-приложение.";
  }
  if (code === "INVALID_TELEGRAM_DATA" || code === "MISSING_INIT_DATA") {
    return "Не удалось подтвердить данные Telegram. Закройте и заново откройте мини-приложение.";
  }
  return fallback;
}

function getBootstrapErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === "TELEGRAM_DATA_EXPIRED") {
      return getAccessDeniedMessage(error.code, error.message);
    }
    if (error.code === "INVALID_TELEGRAM_DATA") {
      return getAccessDeniedMessage(error.code, error.message);
    }
    return error.message;
  }
  return error instanceof Error
    ? error.message
    : "Не удалось загрузить каталог.";
}

function TelegramBackButtonController({
  enabled,
  bootstrap,
}: {
  enabled: boolean;
  bootstrap: BootstrapResponse | null;
}) {
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const handleBack = useCallback(() => {
    if (!enabled) return;
    const stickerId = pathname.startsWith("/stickers/")
      ? pathname.slice("/stickers/".length)
      : null;
    const achievement = bootstrap && stickerId
      ? getAchievementData(bootstrap, stickerId)
      : null;
    const parentCollectionPath =
      achievement?.status === "owned"
        ? `/collections/${achievement.sticker.collectionId}`
        : undefined;

    navigateBackInternally(
      pathname,
      (path) => {
        void router.navigate({ to: path as never });
      },
      parentCollectionPath,
    );
  }, [bootstrap, enabled, pathname, router]);

  useEffect(() => {
    const unsubscribe = subscribeToNativeBackButton(handleBack);
    return unsubscribe;
  }, [handleBack]);

  useEffect(() => {
    setNativeBackButtonVisible(enabled && pathname !== "/");
  }, [enabled, pathname]);

  return null;
}

export function NotFoundPage() {
  return <ErrorPage message="Страница не найдена." />;
}

export function MainRoutePage() {
  const bootstrap = useBootstrapCatalog();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (!bootstrap) return <ErrorPage message="Каталог недоступен." />;

  return (
    <MainPage
      name={getUserDisplayName(bootstrap)}
      collections={getSortedCollections(bootstrap).map((collection) => ({
        id: collection.id,
        title: collection.title,
        stickers: getCollectionStickerPreview(bootstrap, collection.id).map(
          (sticker) => ({
            id: sticker.id,
            src: sticker.imageUrl,
            alt: sticker.title,
          }),
        ),
      }))}
      onOpenCollection={(collectionId) => {
        const to = `/collections/${collectionId}`;
        recordInternalNavigation(pathname, to);
        void navigate({ to: "/collections/$collectionId", params: { collectionId } });
      }}
      onOpenLaptop={() => {
        recordInternalNavigation(pathname, "/laptop");
        void navigate({ to: "/laptop" });
      }}
    />
  );
}

export function CollectionRoutePage() {
  const bootstrap = useBootstrapCatalog();
  const { collectionId } = useParams({ from: "/collections/$collectionId" });
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (!bootstrap) return <ErrorPage message="Коллекция не найдена." />;
  const pageData = getCollectionPageData(bootstrap, collectionId);
  if (!pageData) {
    return <ErrorPage message="Коллекция не найдена." />;
  }

  return (
    <CollectionPage
      title={pageData.collection.title}
      description={pageData.collection.description}
      stickers={pageData.stickers.map((sticker) => ({
          id: sticker.id,
          src: sticker.imageUrl,
          alt: sticker.title,
          disabled: !sticker.owned,
        }))}
      onOpenSticker={(stickerId) => {
        if (getAchievementData(bootstrap, stickerId).status !== "owned") return;
        const to = `/stickers/${stickerId}`;
        recordInternalNavigation(pathname, to);
        void navigate({ to: "/stickers/$stickerId", params: { stickerId } });
      }}
    />
  );
}

export function AchievementRoutePage() {
  const bootstrap = useBootstrapCatalog();
  const { stickerId } = useParams({ from: "/stickers/$stickerId" });
  if (!bootstrap) return <ErrorPage message="Стикер не найден." />;
  const achievement = getAchievementData(bootstrap, stickerId);
  if (achievement.status === "missing") {
    return <ErrorPage message="Стикер не найден." />;
  }
  if (achievement.status === "not-owned") return null;
  const { sticker } = achievement;

  return (
    <AchievementPage
      src={sticker.imageUrl}
      alt={sticker.title}
      description={sticker.description}
      awardedAt={sticker.awardedAt}
    />
  );
}

export function LaptopRoutePage() {
  const bootstrap = useBootstrapCatalog();

  const username = bootstrap.user.username;
  const userLabel = username ? `@${username}` : getUserDisplayName(bootstrap);
  const stickers = getOwnedStickersInCatalogOrder(bootstrap).map((sticker) => ({
    id: sticker.id,
    src: sticker.imageUrl,
    alt: sticker.title,
  }));

  return <LaptopPage stickers={stickers} userLabel={userLabel} />;
}
