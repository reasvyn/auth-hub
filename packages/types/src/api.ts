/**
 * API request/response type definitions
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  page?: number;
  perPage?: number;
  total?: number;
  totalPages?: number;
  requestId?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: Required<Pick<ApiMeta, 'page' | 'perPage' | 'total' | 'totalPages'>>;
}

export interface ApiRequestConfig {
  baseUrl: string;
  clientId?: string;
  clientSecret?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}
