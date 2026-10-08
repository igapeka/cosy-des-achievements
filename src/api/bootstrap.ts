import type { ApiErrorResponse, BootstrapResponse } from "../types/api";

export type BootstrapRequest = {
  supabaseUrl: string;
  initData: string | null;
  signal?: AbortSignal;
};

export type BootstrapTransport = (
  request: BootstrapRequest,
) => Promise<Response>;

export type ApiErrorKind =
  | "configuration"
  | "credentials"
  | "network"
  | "http"
  | "invalid-json"
  | "invalid-response";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly code: string;

  constructor(
    message: string,
    kind: ApiErrorKind,
    status: number | null = null,
    code = "UNKNOWN_ERROR",
  ) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.code = code;
  }
}

export function isAccessDenied(error: unknown): error is ApiError {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

export function createHttpTransport(
  fetcher: typeof fetch = fetch,
): BootstrapTransport {
  return ({ supabaseUrl, initData, signal }) => {
    if (!supabaseUrl) {
      throw new ApiError(
        "Не настроен адрес сервера приложения.",
        "configuration",
        null,
        "MISSING_SUPABASE_URL",
      );
    }
    if (!initData) {
      throw new ApiError(
        "Не удалось получить данные Telegram. Закройте и заново откройте мини-приложение.",
        "credentials",
        null,
        "MISSING_INIT_DATA",
      );
    }

    return fetcher(`${supabaseUrl}/functions/v1/miniapp-bootstrap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData }),
      signal,
    });
  };
}

export const bootstrapHttpTransport = createHttpTransport();

export function createDevMockTransport(
  fetcher: typeof fetch = fetch,
): BootstrapTransport {
  return ({ signal }) =>
    fetcher("/__local-mocks/bootstrap.json", {
      method: "GET",
      signal,
    });
}

export async function fetchBootstrap(
  request: BootstrapRequest,
  transport: BootstrapTransport = bootstrapHttpTransport,
): Promise<BootstrapResponse> {
  let response: Response;
  try {
    response = await transport(request);
  } catch (error) {
    if (
      request.signal?.aborted ||
      (error instanceof DOMException && error.name === "AbortError")
    ) {
      throw error;
    }
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "Не удалось связаться с сервером. Проверьте подключение к интернету.",
      "network",
      null,
      "NETWORK_ERROR",
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    if (
      request.signal?.aborted ||
      (error instanceof DOMException && error.name === "AbortError")
    ) {
      throw error;
    }
    if (!response.ok) {
      throw new ApiError(
        `Сервер временно недоступен (${response.status}).`,
        "http",
        response.status,
        `HTTP_${response.status}`,
      );
    }
    throw new ApiError(
      "Сервер вернул ответ, который не удалось прочитать.",
      "invalid-json",
      response.status,
      "INVALID_JSON",
    );
  }

  if (!response.ok) {
    const errorBody = isApiErrorResponse(body) ? body.error : null;
    throw new ApiError(
      errorBody?.message ?? `Ошибка сервера (${response.status}).`,
      "http",
      response.status,
      errorBody?.code ?? `HTTP_${response.status}`,
    );
  }

  if (!isBootstrapResponse(body)) {
    throw new ApiError(
      "Ответ сервера не соответствует контракту API v1.",
      "invalid-response",
      response.status,
      "INVALID_BOOTSTRAP_RESPONSE",
    );
  }
  return body;
}

export function isBootstrapResponse(value: unknown): value is BootstrapResponse {
  if (!isRecord(value) || value.apiVersion !== 1 || !isRecord(value.user)) {
    return false;
  }

  const { user } = value;
  if (
    !isString(user.id) ||
    !isString(user.telegramId) ||
    !isString(user.firstName) ||
    !isNullableString(user.lastName) ||
    !isNullableString(user.username) ||
    !Array.isArray(value.collections) ||
    !Array.isArray(value.stickers)
  ) {
    return false;
  }

  return (
    value.collections.every(
      (collection) =>
        isRecord(collection) &&
        isString(collection.id) &&
        isString(collection.title) &&
        isString(collection.description) &&
        isFiniteNumber(collection.sortOrder),
    ) &&
    value.stickers.every(
      (sticker) =>
        isRecord(sticker) &&
        isString(sticker.id) &&
        isString(sticker.collectionId) &&
        isString(sticker.title) &&
        isString(sticker.description) &&
        isString(sticker.imageUrl) &&
        isFiniteNumber(sticker.sortOrder) &&
        typeof sticker.owned === "boolean" &&
        isNullableString(sticker.awardedAt),
    )
  );
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    isRecord(value) &&
    isRecord(value.error) &&
    isString(value.error.code) &&
    isString(value.error.message)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
