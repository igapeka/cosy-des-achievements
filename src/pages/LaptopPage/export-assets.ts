const imageDataUrlCache = new Map<string, Promise<string>>();
const EXPORT_PAINT_SETTLE_DELAY_MS = 250;

function waitForImage(
  image: HTMLImageElement,
  errorMessage = "Не удалось загрузить стикер для ноутбука.",
): Promise<void> {
  if (!image.complete) {
    return new Promise<void>((resolve, reject) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener(
        "error",
        () => reject(new Error(errorMessage)),
        { once: true },
      );
    }).then(() => waitForImage(image, errorMessage));
  }

  if (image.naturalWidth === 0) {
    return Promise.reject(new Error(errorMessage));
  }

  return image.decode ? image.decode() : Promise.resolve();
}

/** Lets iOS commit recently assigned data:image sources before html-to-image clones them. */
export async function waitForExportPaint(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, EXPORT_PAINT_SETTLE_DELAY_MS);
  });
}

export type NativeShareResult = "shared" | "cancelled" | "unavailable" | "failed";

function dataUrlToFile(imageDataUrl: string): File {
  const [header, encodedData] = imageDataUrl.split(",", 2);
  const mimeType = header.match(/^data:([^;]+)/)?.[1];
  if (!mimeType?.startsWith("image/") || !encodedData) {
    throw new Error("Ожидалась готовая картинка в формате data URL.");
  }

  const binary = atob(encodedData);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new File([bytes], "des-achievements.png", { type: mimeType });
}

/** Opens the platform share sheet without navigating to a blob: URL. */
export async function shareExportImage(
  imageDataUrl: string,
): Promise<NativeShareResult> {
  if (
    typeof navigator.share !== "function" ||
    typeof navigator.canShare !== "function" ||
    typeof File === "undefined"
  ) {
    return "unavailable";
  }

  let file: File;
  try {
    file = dataUrlToFile(imageDataUrl);
  } catch {
    return "failed";
  }

  if (!navigator.canShare({ files: [file] })) {
    return "unavailable";
  }

  try {
    await navigator.share({
      title: "DES Ачивки",
      files: [file],
    });
    return "shared";
  } catch (error) {
    return error instanceof DOMException && error.name === "AbortError"
      ? "cancelled"
      : "failed";
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Не удалось подготовить стикер для сохранения."));
    };
    reader.onerror = () => reject(new Error("Не удалось подготовить стикер для сохранения."));
    reader.readAsDataURL(blob);
  });
}

function fetchImageDataUrl(src: string): Promise<string> {
  const cached = imageDataUrlCache.get(src);
  if (cached) return cached;

  const request = fetch(src, { mode: "cors", credentials: "omit" })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Не удалось загрузить стикер (${response.status}).`);
      }
      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) {
        throw new Error("Сервер вернул файл, который не является изображением.");
      }
      return blobToDataUrl(blob);
    })
    .catch((error: unknown) => {
      imageDataUrlCache.delete(src);
      throw error;
    });

  imageDataUrlCache.set(src, request);
  return request;
}

/** Replaces selected image sources with cached, CORS-checked data URLs during capture. */
export async function embedImagesForExport(
  imageArea: HTMLElement,
): Promise<() => void> {
  const images = [...imageArea.querySelectorAll("img")];
  await Promise.all(images.map((image) => waitForImage(image)));

  const originalSources = images.map((image) => ({
    src: image.getAttribute("src"),
    srcSet: image.getAttribute("srcset"),
  }));

  try {
    const dataUrls = await Promise.all(
      images.map((image) => fetchImageDataUrl(image.currentSrc || image.src)),
    );
    images.forEach((image, index) => {
      image.removeAttribute("srcset");
      image.src = dataUrls[index];
    });
    await Promise.all(images.map((image) => waitForImage(image)));
  } catch (error) {
    restoreSources(images, originalSources);
    throw error;
  }

  return () => restoreSources(images, originalSources);
}

function restoreSources(
  images: HTMLImageElement[],
  sources: Array<{ src: string | null; srcSet: string | null }>,
) {
  images.forEach((image, index) => {
    const original = sources[index];
    if (original.src === null) image.removeAttribute("src");
    else image.setAttribute("src", original.src);
    if (original.srcSet === null) image.removeAttribute("srcset");
    else image.setAttribute("srcset", original.srcSet);
  });
}

