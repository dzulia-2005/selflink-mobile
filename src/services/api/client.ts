import { env } from '@config/env';
import { parseJsonPreservingLargeInts } from '@utils/json';
import { buildUrl } from '@utils/url';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type RequestOptions = {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  auth?: boolean;
};

export class ApiClient {
  private token: string | null = null;
  private refreshHandler?: () => Promise<string | null>;

  setToken(token: string | null) {
    this.token = token;
  }

  setRefreshHandler(handler?: () => Promise<string | null>) {
    this.refreshHandler = handler;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = buildUrl(env.backendUrl, path);
    const { method = 'GET', body, headers = {}, auth = true } = options;

    const finalHeaders: Record<string, string> = {
      Accept: 'application/json',
      ...headers,
    };

    if (body !== undefined && !(body instanceof FormData)) {
      finalHeaders['Content-Type'] = 'application/json';
    }

    const serializedBody =
      body instanceof FormData
        ? body
        : body !== undefined
          ? JSON.stringify(body)
          : undefined;

    const send = async () => {
      const headersWithAuth = {
        ...finalHeaders,
        ...(auth && this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      };

      return fetch(url, {
        method,
        headers: headersWithAuth,
        body: body instanceof FormData ? body : serializedBody,
      });
    };

    let response = await send();
    if (
      response.status === 401 &&
      auth &&
      this.refreshHandler &&
      !(body instanceof FormData)
    ) {
      const newToken = await this.refreshHandler();
      if (newToken) {
        response = await send();
      }
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(
        `Request failed (${response.status}): ${errorText || response.statusText}`,
      );
    }

    const contentType = response.headers.get('content-type');
    const rawText = await response.text();
    if (contentType?.includes('application/json')) {
      return parseJsonPreservingLargeInts<T>(rawText);
    }

    return rawText as unknown as T;
  }
}

export const apiClient = new ApiClient();
