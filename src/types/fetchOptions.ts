import {InvocationDomain} from './apiSpec';
import {HTTP_METHOD} from './getUrlOptions';
import {AuthorizationHeaderOptions} from './authorizationHeaderOptions';
import {Headers} from './headers';

export interface FetchOptions {
  readonly url: string;
  readonly body?: unknown;
  readonly headers?: Headers;
  readonly method?: typeof HTTP_METHOD[keyof typeof HTTP_METHOD];
}

export interface DoFetchOptions extends AuthorizationHeaderOptions {
  readonly body?: InvocationDomain;
  readonly headers?: Record<string, string>;
  readonly requestId: string;
  readonly failOnErrorStatusCode?: boolean;
  readonly domain: string;
}
