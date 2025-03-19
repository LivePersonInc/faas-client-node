import {HTTP_METHOD} from './getUrlOptions';
export interface AuthorizationHeaderOptions {
  readonly url: string;
  readonly method: (typeof HTTP_METHOD)[keyof typeof HTTP_METHOD];
  readonly [others: string]: unknown;
}
