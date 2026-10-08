import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import type { RuntimeMode } from "../telegram/runtime";
import {
  AchievementRoutePage,
  CollectionRoutePage,
  LaptopRoutePage,
  MainRoutePage,
  NotFoundPage,
  RootLayout,
} from "./route-pages";

type RouterContext = {
  runtimeMode: RuntimeMode;
  telegramId: string | null;
  startupError: string | null;
};

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: MainRoutePage,
});

const collectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/collections/$collectionId",
  component: CollectionRoutePage,
});

const stickerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/stickers/$stickerId",
  component: AchievementRoutePage,
});

const laptopRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/laptop",
  component: LaptopRoutePage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  collectionRoute,
  stickerRoute,
  laptopRoute,
]);

export function createAppRouter(
  context: RouterContext,
  initialEntries: string[] = ["/"],
) {
  const memoryHistory = createMemoryHistory({ initialEntries });
  return createRouter({ routeTree, history: memoryHistory, context });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
