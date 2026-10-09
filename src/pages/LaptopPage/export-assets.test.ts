import { afterEach, describe, expect, it, vi } from "vitest";
import { embedImagesForExport } from "./export-assets";

const originalDecode = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "decode");

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (originalDecode) Object.defineProperty(HTMLImageElement.prototype, "decode", originalDecode);
  else Reflect.deleteProperty(HTMLImageElement.prototype, "decode");
  document.body.replaceChildren();
});

function stubLoadedImages() {
  vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
  vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(72);
  Object.defineProperty(HTMLImageElement.prototype, "decode", {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
}

describe("laptop export assets", () => {
  it("fetches CORS-enabled image data, embeds it for capture, and restores the preview", async () => {
    stubLoadedImages();
    const originalFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => new Blob(["webp"], { type: "image/webp" }),
    });
    vi.stubGlobal("fetch", originalFetch);
    const area = document.createElement("div");
    area.innerHTML = '<img src="https://images.example/sticker.webp" srcset="sticker@2x.webp 2x">';
    document.body.append(area);
    const image = area.querySelector("img")!;

    const restore = await embedImagesForExport(area);

    expect(originalFetch).toHaveBeenCalledWith(
      "https://images.example/sticker.webp",
      { mode: "cors", credentials: "omit" },
    );
    expect(image.src).toMatch(/^data:image\/webp;base64,/);
    expect(image.hasAttribute("srcset")).toBe(false);

    restore();

    expect(image.getAttribute("src")).toBe("https://images.example/sticker.webp");
    expect(image.getAttribute("srcset")).toBe("sticker@2x.webp 2x");
  });

  it("fails instead of allowing an incomplete export when CORS fetch fails", async () => {
    stubLoadedImages();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("CORS blocked")));
    const area = document.createElement("div");
    area.innerHTML = '<img src="https://images.example/blocked.webp">';
    document.body.append(area);

    await expect(embedImagesForExport(area)).rejects.toThrow("CORS blocked");
    expect(area.querySelector("img")?.getAttribute("src")).toBe(
      "https://images.example/blocked.webp",
    );
  });
});
