import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { queryClient } from "./api/query-client";
import "./main.css";
import "./semantic-colors.css";
import "./typography.css";
import "./telegram/safe-area.css";
import App from "./App.tsx";
import { resolveRuntimeMode } from "./telegram/runtime";
import { initializeTelegram, markTelegramReady } from "./telegram/telegram";
import { createAppRouter } from "./router/router";

async function startApp() {
  const telegram = initializeTelegram();
  const mode = resolveRuntimeMode({
    isDev: import.meta.env.DEV,
    mockEnabled: import.meta.env.VITE_MOCK_MODE === "true",
    isTelegram: telegram.isTelegram,
  });

  const context = {
    runtimeMode: mode,
    telegramId: telegram.telegramId,
    startupError:
      mode === "telegram-required" ? "Откройте приложение в Telegram." : null,
  };

  markTelegramReady();
  const router = createAppRouter(context);

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AppErrorBoundary>
          <App router={router} />
        </AppErrorBoundary>
      </QueryClientProvider>
    </StrictMode>,
  );
}

void startApp();
