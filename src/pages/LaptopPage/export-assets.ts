const imageDataUrlCache = new Map<string, Promise<string>>();

function waitForImage(image: HTMLImageElement): Promise<void> {
  if (!image.complete) {
    return new Promise<void>((resolve, reject) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener(
        "error",
        () => reject(new Error("Не удалось загрузить стикер для ноутбука.")),
        { once: true },
      );
    }).then(() => waitForImage(image));
  }

  if (image.naturalWidth === 0) {
    return Promise.reject(new Error("Не удалось загрузить стикер для ноутбука."));
  }

  return image.decode ? image.decode() : Promise.resolve();
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
  await Promise.all(images.map(waitForImage));

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
    await Promise.all(images.map(waitForImage));
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

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
