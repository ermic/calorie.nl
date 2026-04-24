export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

type ApiInit = Omit<RequestInit, 'body'> & {
  params?: Record<string, string | number | boolean | undefined>;
  body?: RequestInit['body'] | Record<string, unknown>;
};

function buildUrl(path: string, params?: ApiInit['params']) {
  if (!params) return path;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function apiFetch<T = unknown>(path: string, init: ApiInit = {}): Promise<T> {
  const { params, body, headers, ...rest } = init;

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const isPlainObject =
    body !== undefined && body !== null && !isFormData && typeof body === 'object' && !(body instanceof Blob);

  const finalHeaders = new Headers(headers);
  if (isPlainObject && !finalHeaders.has('Content-Type')) {
    finalHeaders.set('Content-Type', 'application/json');
  }

  const response = await fetch(buildUrl(path, params), {
    credentials: 'include',
    ...rest,
    headers: finalHeaders,
    body: isPlainObject ? JSON.stringify(body) : (body as BodyInit | null | undefined),
  });

  const contentType = response.headers.get('content-type') ?? '';
  const payload: unknown = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    throw new ApiError(response.status, extractErrorMessage(payload, response.status), payload);
  }

  return payload as T;
}

function extractErrorMessage(payload: unknown, status: number): string {
  const fallback = `Request failed: ${status}`;
  if (!payload || typeof payload !== 'object') return fallback;
  const data = payload as Record<string, unknown>;

  const errors = data.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const first = errors[0];
    if (first && typeof first === 'object' && 'message' in first && typeof first.message === 'string') {
      return first.message;
    }
  }

  if (typeof data.message === 'string') return data.message;
  return fallback;
}
