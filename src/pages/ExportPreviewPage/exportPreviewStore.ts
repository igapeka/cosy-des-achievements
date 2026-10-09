const previews = new Map<string, string>();
let previewSequence = 0;
const MAX_PREVIEWS = 3;

export function createExportPreview(imageDataUrl: string) {
  if (!imageDataUrl.startsWith("data:image/")) {
    throw new Error("Ожидалось изображение в формате data URL.");
  }

  const id = `${Date.now().toString(36)}-${(previewSequence += 1).toString(36)}`;
  previews.set(id, imageDataUrl);

  while (previews.size > MAX_PREVIEWS) {
    const oldestId = previews.keys().next().value;
    if (!oldestId) break;
    previews.delete(oldestId);
  }

  return id;
}

export function getExportPreview(id: string) {
  return previews.get(id) ?? null;
}
