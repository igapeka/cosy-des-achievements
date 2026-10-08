export type StickerPlacement = {
  id: string;
  size: number;
  rotation: number;
  x: number;
  y: number;
  bounds: number;
};

export const LAPTOP_WIDTH = 452;
export const LAPTOP_HEIGHT = (LAPTOP_WIDTH * 11) / 16;
const RIGHT_SAFE_AREA = LAPTOP_WIDTH * 0.25;
const STICKER_MIN_SIZE = 60;
const STICKER_MAX_SIZE = 84;
const MAX_OVERLAP = 20;
const MAX_ATTEMPTS_PER_LAYOUT = 2_500;
const MAX_LAYOUT_PASSES = 2;
const MIN_FALLBACK_SIZE = 1;

const LOGO_SAFE_AREA = {
  left: 185,
  top: 108,
  right: 267,
  bottom: 190,
};

const randomBetween = (min: number, max: number) =>
  min + Math.random() * (max - min);

const getRotatedBounds = (size: number, rotation: number) => {
  const radians = (Math.abs(rotation) * Math.PI) / 180;
  return size * (Math.cos(radians) + Math.sin(radians));
};

const overlapsMoreThanAllowed = (
  first: StickerPlacement,
  second: StickerPlacement,
) => {
  const horizontalOverlap =
    (first.bounds + second.bounds) / 2 - Math.abs(first.x - second.x);
  const verticalOverlap =
    (first.bounds + second.bounds) / 2 - Math.abs(first.y - second.y);
  return horizontalOverlap > MAX_OVERLAP && verticalOverlap > MAX_OVERLAP;
};

export function overlapsLogo(sticker: StickerPlacement) {
  const halfBounds = sticker.bounds / 2;
  return (
    sticker.x + halfBounds > LOGO_SAFE_AREA.left &&
    sticker.x - halfBounds < LOGO_SAFE_AREA.right &&
    sticker.y + halfBounds > LOGO_SAFE_AREA.top &&
    sticker.y - halfBounds < LOGO_SAFE_AREA.bottom
  );
}

export function isPlacementInBounds(sticker: StickerPlacement) {
  const halfBounds = sticker.bounds / 2;
  return (
    sticker.x - halfBounds >= 0 &&
    sticker.y - halfBounds >= 0 &&
    sticker.x + halfBounds <= LAPTOP_WIDTH - RIGHT_SAFE_AREA &&
    sticker.y + halfBounds <= LAPTOP_HEIGHT
  );
}

export function getRandomStickerPlacement(
  id: string,
  placedStickers: StickerPlacement[],
  maxAttempts = 500,
): StickerPlacement | null {
  const size = randomBetween(STICKER_MIN_SIZE, STICKER_MAX_SIZE);
  const rotation = randomBetween(-15, 15);
  const bounds = getRotatedBounds(size, rotation);
  const edgePadding = 2;
  const halfBounds = bounds / 2;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const sticker = {
      id,
      size,
      rotation,
      bounds,
      x: randomBetween(
        halfBounds + edgePadding,
        LAPTOP_WIDTH - RIGHT_SAFE_AREA - halfBounds - edgePadding,
      ),
      y: randomBetween(
        halfBounds + edgePadding,
        LAPTOP_HEIGHT - halfBounds - edgePadding,
      ),
    };

    if (
      !overlapsLogo(sticker) &&
      placedStickers.every(
        (placedSticker) => !overlapsMoreThanAllowed(sticker, placedSticker),
      )
    ) {
      return sticker;
    }
  }

  return null;
}

function createFallbackSlots(size: number) {
  const halfSize = size / 2;
  const step = size + 2;
  const slots: Omit<StickerPlacement, "id">[] = [];
  const xRegions = [
    [halfSize, LOGO_SAFE_AREA.left - halfSize],
    [LOGO_SAFE_AREA.right + halfSize, LAPTOP_WIDTH - RIGHT_SAFE_AREA - halfSize],
  ];

  for (let y = halfSize; y <= LAPTOP_HEIGHT - halfSize; y += step) {
    for (const [startX, endX] of xRegions) {
      for (let x = startX; x <= endX; x += step) {
        slots.push({ size, rotation: 0, x, y, bounds: size });
      }
    }
  }

  return slots;
}

function createFallbackLayout(ids: string[]): StickerPlacement[] {
  let slots: Omit<StickerPlacement, "id">[] = [];

  for (let size = STICKER_MAX_SIZE; size >= MIN_FALLBACK_SIZE; size -= 1) {
    slots = createFallbackSlots(size);
    if (slots.length >= ids.length) break;
  }

  if (slots.length < ids.length) {
    throw new Error("Невозможно разместить весь каталог стикеров на ноутбуке.");
  }

  for (let index = 0; index < ids.length; index += 1) {
    const swapIndex = index + Math.floor(Math.random() * (slots.length - index));
    [slots[index], slots[swapIndex]] = [slots[swapIndex], slots[index]];
  }

  return ids.map((id, index) => ({ ...slots[index], id }));
}

export function createStickerLayout(ids: string[]): StickerPlacement[] {
  if (ids.length === 0) return [];

  for (let pass = 0; pass < MAX_LAYOUT_PASSES; pass += 1) {
    const layout: StickerPlacement[] = [];
    let attempts = 0;

    for (let index = 0; index < ids.length; index += 1) {
      const remainingIds = ids.length - index;
      const budget = Math.floor((MAX_ATTEMPTS_PER_LAYOUT - attempts) / remainingIds);
      if (budget < 1) break;

      const sticker = getRandomStickerPlacement(
        ids[index],
        layout,
        Math.min(500, budget),
      );
      attempts += Math.min(500, budget);
      if (!sticker) break;
      layout.push(sticker);
    }

    if (layout.length === ids.length) return layout;
  }

  return createFallbackLayout(ids);
}
