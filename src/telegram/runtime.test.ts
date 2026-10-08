import { describe, expect, it } from "vitest";
import { resolveRuntimeMode } from "./runtime";

describe("resolveRuntimeMode", () => {
  it("allows local fixtures only in dev mock mode", () => {
    expect(resolveRuntimeMode({ isDev: true, mockEnabled: true, isTelegram: false })).toBe("dev-mock");
    expect(resolveRuntimeMode({ isDev: false, mockEnabled: true, isTelegram: false })).toBe("telegram-required");
  });

  it("requires Telegram in real mode and accepts Telegram launch environment", () => {
    expect(resolveRuntimeMode({ isDev: true, mockEnabled: false, isTelegram: false })).toBe("telegram-required");
    expect(resolveRuntimeMode({ isDev: false, mockEnabled: false, isTelegram: true })).toBe("telegram");
  });
});
