import { describe, expect, it } from "vitest";
import {
  createStickerLayout,
  isPlacementInBounds,
  overlapsLogo,
} from "./layout";

describe("laptop sticker layout", () => {
  it.each([0, 1, 10, 11, 35])("keeps all %i stable IDs in the available laptop area", (count) => {
    const ids = Array.from({ length: count }, (_, index) => `sticker-${index + 1}`);
    const layout = createStickerLayout(ids);

    expect(layout.map(({ id }) => id)).toEqual(ids);
    expect(new Set(layout.map(({ id }) => id)).size).toBe(count);
    expect(layout.every(isPlacementInBounds)).toBe(true);
    expect(layout.every((placement) => !overlapsLogo(placement))).toBe(true);
    expect(
      layout.every(({ x, y, size, rotation }) =>
        [x, y, size, rotation].every(Number.isFinite),
      ),
    ).toBe(true);
  });

  it("returns no placements for an empty selection", () => {
    expect(createStickerLayout([])).toEqual([]);
  });
});
