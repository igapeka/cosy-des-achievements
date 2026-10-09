import {
  backButton,
  init,
  isTMA,
  miniApp,
  retrieveLaunchParams,
  retrieveRawInitData,
  swipeBehavior,
  viewport,
} from "@tma.js/sdk-react";
import type { RetrieveLaunchParamsResult } from "@tma.js/sdk-react";

export type TelegramSession = {
  isTelegram: boolean;
  telegramId: string | null;
  initData: string | null;
  launchParams: RetrieveLaunchParamsResult | null;
};

let session: TelegramSession | null = null;
let sdkInitialized = false;
let viewportSetup: Promise<void> | null = null;

export function initializeTelegram(): TelegramSession {
  if (session) return session;

  let launchParams: RetrieveLaunchParamsResult | null = null;
  let initData: string | null = null;
  let telegramId: string | null = null;
  let isTelegram = false;

  try {
    isTelegram = isTMA();
    launchParams = retrieveLaunchParams();
    initData = retrieveRawInitData() || null;
    const id = launchParams.tgWebAppData?.user?.id;
    telegramId = id === undefined || id === null ? null : String(id);
  } catch {
    // No Telegram launch parameters are present in a regular browser.
  }

  try {
    init();
    sdkInitialized = true;
  } catch {
    // Unsupported SDK operations are isolated below and never block the app.
  }

  session = { isTelegram, telegramId, initData, launchParams };

  if (isTelegram && sdkInitialized) {
    setupBackgroundColor();
    setupBackButton();
    setupViewport();
    setupSwipeBehavior();
  }

  return session;
}

function setupBackgroundColor() {
  try {
    if (!miniApp.setBgColor.isAvailable()) return;
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    miniApp.setBgColor(isDark ? "#131416" : "#f3f5f5");
  } catch {
    // Background color support varies between Telegram clients.
  }
}

export function getTelegramSession() {
  return session ?? initializeTelegram();
}

function setupBackButton() {
  try {
    if (backButton.mount.isAvailable()) backButton.mount();
    if (backButton.hide.isAvailable()) backButton.hide();
  } catch {
    // BackButton support varies between Telegram clients.
  }
}

function setupViewport() {
  if (viewportSetup) return;
  viewportSetup = (async () => {
    try {
      if (!viewport.mount.isAvailable()) return;
      await viewport.mount();
      if (viewport.bindCssVars.isAvailable()) viewport.bindCssVars();
    } catch {
      // Viewport and safe-area support varies between Telegram clients.
    }
  })();
}

function setupSwipeBehavior() {
  try {
    if (!swipeBehavior.mount.isAvailable()) return;
    swipeBehavior.mount();
    if (swipeBehavior.disableVertical.isAvailable()) {
      swipeBehavior.disableVertical();
    }
  } catch {
    // Vertical swipe control is unavailable in older Telegram clients.
  }
}

export function markTelegramReady() {
  try {
    if (miniApp.ready.isAvailable()) miniApp.ready();
  } catch {
    // The ready event is optional outside supported Telegram clients.
  }
}

export function setNativeBackButtonVisible(visible: boolean) {
  try {
    if (!backButton.isMounted() || !backButton.isSupported()) return;
    if (visible && backButton.show.isAvailable()) backButton.show();
    if (!visible && backButton.hide.isAvailable()) backButton.hide();
  } catch {
    // A missing native button must not affect the page.
  }
}

export function subscribeToNativeBackButton(onClick: VoidFunction): VoidFunction {
  try {
    if (!backButton.onClick.isAvailable()) return () => undefined;
    return backButton.onClick(onClick);
  } catch {
    return () => undefined;
  }
}
