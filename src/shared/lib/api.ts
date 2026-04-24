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
  /**
   * Afbreek-timeout in ms. Default 35 000, net boven Vercel's 30 s
   * function-limiet. `null` schakelt de timeout uit (bv. voor streaming
   * of polling handlers).
   */
  timeoutMs?: number | null;
};

const DEFAULT_TIMEOUT_MS = 35_000;

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
  const { params, body, headers, timeoutMs, signal: externalSignal, ...rest } = init;

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const isPlainObject =
    body !== undefined && body !== null && !isFormData && typeof body === 'object' && !(body instanceof Blob);

  const finalHeaders = new Headers(headers);
  if (isPlainObject && !finalHeaders.has('Content-Type')) {
    finalHeaders.set('Content-Type', 'application/json');
  }

  // AbortController voor een hard-timeout. De caller kan óók een externe
  // signal meegeven (bv. useQuery's signal); in dat geval luisteren we op
  // beide en aborten we de fetch zodra één van beide fired.
  const effectiveTimeout = timeoutMs === undefined ? DEFAULT_TIMEOUT_MS : timeoutMs;
  const controller = new AbortController();
  const timerId =
    effectiveTimeout !== null
      ? setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), effectiveTimeout)
      : null;
  const onExternalAbort = () => controller.abort(externalSignal?.reason);
  if (externalSignal) {
    if (externalSignal.aborted) onExternalAbort();
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), {
      credentials: 'include',
      ...rest,
      headers: finalHeaders,
      body: isPlainObject ? JSON.stringify(body) : (body as BodyInit | null | undefined),
      signal: controller.signal,
    });
  } catch (err) {
    if (isAbortError(err)) {
      const isTimeout =
        err instanceof DOMException && err.name === 'TimeoutError'
          ? true
          : controller.signal.reason instanceof DOMException &&
            controller.signal.reason.name === 'TimeoutError';
      if (isTimeout) {
        throw new ApiError(408, 'De server reageert niet. Probeer opnieuw.');
      }
      throw err; // externe cancel — laat de caller afhandelen
    }
    throw err;
  } finally {
    if (timerId !== null) clearTimeout(timerId);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }

  const contentType = response.headers.get('content-type') ?? '';
  const payload: unknown = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    throw new ApiError(response.status, extractErrorMessage(payload, response.status), payload);
  }

  return payload as T;
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && (err.name === 'AbortError' || err.name === 'TimeoutError');
}

// Haal de nuttige tekst uit een willekeurige catch-error voor weergave
// in UI. Geen null-pad — als er niets zinvols uit komt, krijg je de
// fallback-tekst. Handig om in onError-callbacks één helper te hebben
// ipv het if/instanceof-patroon overal te herhalen.
export function getApiErrorMessage(err: unknown, fallback = 'Er ging iets mis.'): string {
  if (err instanceof ApiError) return err.message || fallback;
  if (err instanceof Error) return err.message || fallback;
  return fallback;
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

  if (typeof data.error === 'string') return data.error;
  if (typeof data.message === 'string') return data.message;
  return fallback;
}
