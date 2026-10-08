export type RuntimeMode = "dev-mock" | "telegram" | "telegram-required";

export function resolveRuntimeMode({
  isDev,
  mockEnabled,
  isTelegram,
}: {
  isDev: boolean;
  mockEnabled: boolean;
  isTelegram: boolean;
}): RuntimeMode {
  if (isDev && mockEnabled) return "dev-mock";
  return isTelegram ? "telegram" : "telegram-required";
}
