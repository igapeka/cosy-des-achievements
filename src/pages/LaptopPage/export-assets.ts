const imageDataUrlCache = new Map<string, Promise<string>>();
const IOS_SVG_RASTERIZATION_DELAY_MS = 250;

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

/**
 * iOS WebKit can paint a foreignObject SVG before its nested images have
 * reached the rasterizer. Waiting after decoding the SVG gives it one stable
 * paint window before it is copied into the PNG canvas.
 */
export async function rasterizeSvgToPng(
  svgDataUrl: string,
  width: number,
  height: number,
  pixelRatio: number,
): Promise<string> {
  const image = new Image();
  image.decoding = "sync";
  image.src = svgDataUrl;
  await waitForImage(image, "Не удалось подготовить картинку для сохранения.");
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, IOS_SVG_RASTERIZATION_DELAY_MS);
  });

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * pixelRatio);
  canvas.height = Math.ceil(height * pixelRatio);
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Не удалось подготовить холст для сохранения.");
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const imageDataUrl = canvas.toDataURL("image/png");
  if (!imageDataUrl.startsWith("data:image/png")) {
    throw new Error("Не удалось создать PNG.");
  }
  return imageDataUrl;
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

