import type { ApiResponse } from '@reasvyn/auth-types';

export interface HttpClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method?: RequestMethod;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export class HttpClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;
  private accessToken: string | null = null;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.timeout = config.timeout ?? 10_000;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...config.headers,
    };
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;
    const url = `${this.baseUrl}${path}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    const reqHeaders: Record<string, string> = {
      ...this.defaultHeaders,
      ...headers,
    };

    if (this.accessToken) {
      reqHeaders['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: reqHeaders,
        signal: options.signal ?? controller.signal,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      } satisfies RequestInit);

      clearTimeout(timer);

      let data: ApiResponse<T>;
      try {
        data = (await response.json()) as ApiResponse<T>;
      } catch {
        throw new HttpError(response.status, 'PARSE_ERROR', 'Failed to parse response');
      }

      if (!response.ok || !data.success) {
        throw new HttpError(
          response.status,
          data.error?.code ?? 'UNKNOWN_ERROR',
          data.error?.message ?? `Request failed with status ${response.status}`,
          data.error?.details,
        );
      }

      return data.data as T;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof HttpError) throw err;
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new HttpError(408, 'REQUEST_TIMEOUT', 'Request timed out');
      }
      throw new HttpError(
        0,
        'NETWORK_ERROR',
        err instanceof Error ? err.message : 'Unknown network error',
      );
    }
  }

  get<T>(path: string, headers?: Record<string, string>) {
    return this.request<T>(path, {
      method: 'GET',
      ...(headers !== undefined ? { headers } : {}),
    });
  }

  post<T>(path: string, body?: unknown, headers?: Record<string, string>) {
    return this.request<T>(path, {
      method: 'POST',
      ...(body !== undefined ? { body } : {}),
      ...(headers !== undefined ? { headers } : {}),
    });
  }

  put<T>(path: string, body?: unknown, headers?: Record<string, string>) {
    return this.request<T>(path, {
      method: 'PUT',
      ...(body !== undefined ? { body } : {}),
      ...(headers !== undefined ? { headers } : {}),
    });
  }

  patch<T>(path: string, body?: unknown, headers?: Record<string, string>) {
    return this.request<T>(path, {
      method: 'PATCH',
      ...(body !== undefined ? { body } : {}),
      ...(headers !== undefined ? { headers } : {}),
    });
  }

  delete<T>(path: string, headers?: Record<string, string>) {
    return this.request<T>(path, {
      method: 'DELETE',
      ...(headers !== undefined ? { headers } : {}),
    });
  }
}
