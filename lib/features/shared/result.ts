export type ServiceErrorCode =
  | "SESSION_REQUIRED"
  | "VALIDATION"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "UNKNOWN";

export type Result<T, TCode extends string = ServiceErrorCode> =
  | { data: T; error?: undefined; code?: undefined }
  | { data?: undefined; error: string; code?: TCode };

export type CursorPaginationInput = {
  limit?: number;
  cursor?: number;
};

export type CursorPagination = {
  limit: number;
  cursor: number;
};

export type PaginatedItems<T> = {
  items: T[];
  nextCursor: number | null;
  hasMore: boolean;
};

export function ok<T>(data: T): Result<T> {
  return { data };
}

export function fail<T = never, TCode extends string = ServiceErrorCode>(
  error: unknown,
  options?: {
    fallback?: string;
    code?: TCode;
  },
): Result<T, TCode> {
  const message = normalizeErrorMessage(error, options?.fallback);
  if (options?.code) {
    return { error: message, code: options.code };
  }
  return { error: message };
}

export function normalizeErrorMessage(
  error: unknown,
  fallback = "Something went wrong.",
): string {
  if (typeof error === "string") {
    const trimmed = error.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }

  if (error instanceof Error) {
    const trimmed = error.message?.trim();
    return trimmed ? trimmed : fallback;
  }

  if (error && typeof error === "object") {
    const maybeError = error as {
      message?: unknown;
      error_description?: unknown;
      details?: unknown;
    };

    if (typeof maybeError.message === "string" && maybeError.message.trim()) {
      return maybeError.message.trim();
    }

    if (
      typeof maybeError.error_description === "string" &&
      maybeError.error_description.trim()
    ) {
      return maybeError.error_description.trim();
    }

    if (typeof maybeError.details === "string" && maybeError.details.trim()) {
      return maybeError.details.trim();
    }
  }

  return fallback;
}

export function normalizeCursorPagination(
  input: CursorPaginationInput | undefined,
  options: {
    defaultLimit: number;
    maxLimit: number;
  },
): CursorPagination {
  const defaultLimit = Math.max(1, options.defaultLimit);
  const maxLimit = Math.max(defaultLimit, options.maxLimit);
  const rawLimit = input?.limit ?? defaultLimit;
  const rawCursor = input?.cursor ?? 0;

  const limit = Math.max(1, Math.min(Math.floor(rawLimit), maxLimit));
  const cursor = Math.max(0, Math.floor(rawCursor));
  return { limit, cursor };
}

export function toSupabaseRange(pagination: CursorPagination) {
  return {
    from: pagination.cursor,
    to: pagination.cursor + pagination.limit - 1,
  };
}

export function toPaginatedItems<T>(
  items: T[],
  pagination: CursorPagination,
): PaginatedItems<T> {
  const hasMore = items.length >= pagination.limit;
  return {
    items,
    nextCursor: hasMore ? pagination.cursor + items.length : null,
    hasMore,
  };
}

export function isSessionRequired(result: { code?: string } | null | undefined) {
  return result?.code === "SESSION_REQUIRED";
}
