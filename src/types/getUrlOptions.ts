export interface GetUrlOptions {
  readonly accountId: string;
  readonly domain: string;
  readonly apiVersion: string;
  readonly externalSystem?: string;
  readonly protocol: (typeof PROTOCOL)[keyof typeof PROTOCOL];
  readonly path: string;

  readonly [others: string]: unknown;
}

export const HTTP_METHOD = Object.freeze({
  POST: 'post',
  GET: 'get',
} as const);

export const PROTOCOL = Object.freeze({
  HTTP: 'http',
  HTTPS: 'https',
} as const);
