import { AppJwtCredentials } from './../types/appJwtCredentials';
import { PROTOCOL } from '../types/getUrlOptions';
export interface BaseConfig {
  /**
   * The accountId/siteId.
   *
   * NOTE: It is not possible to switch between production and test accounts. If the accountId passed
   * to the constructor is an production (alpha/GA) account, it can only be used for production accounts
   * during the invocations (the same holds for test/QA accounts).
   */
  readonly accountId: string;

  readonly authStrategy: AppJwtCredentials | GetAuthorizationHeader;
}

export interface DefaultConfig {
  readonly gwCsdsServiceName?: string;
  readonly uiCsdsServiceName?: string;
  readonly apiVersion?: string;
  readonly timeout?: number;
  readonly protocol?: typeof PROTOCOL[keyof typeof PROTOCOL];
  readonly getLambdasUri?: string;
  readonly invokeUuidUri?: string;
  readonly invokeEventUri?: string;
  readonly isImplementedUri?: string;
  readonly failOnErrorStatusCode?: boolean;
  /** Optional HTTP request headers that should be included in CSDS requests. */
  readonly csdsHttpHeaders?: { [key: string]: any };
  readonly csdsTtlSeconds?: number;
  /**
   * Time after which the JWT should be refreshed.
   */
  readonly jwtRefreshAfterMinutes?: number;

  readonly isImplementedCacheDurationInSeconds?: number;
}

export interface DebugConfig {
  [key: string]: any;
}

export type Config = BaseConfig & DefaultConfig;

/**
 * Type that defines how custom 'getAuthorizationHeader' methods have to be implemented.
 * If provided during client initialization, a custom 'getAuthorizationHeader' method gets
 * called whenever the faas-client needs to authenticate to send a request. Its return value
 * is used in the 'Authorization'-header of the request.
 * @param input A object containing the 'url' and the 'http-method' of the request
 * @return A promise resolving to a string which contains the value of the 'Authorization'-header
 */
export type GetAuthorizationHeader = (input: {
  url: string;
  method: string;
}) => Promise<string>;

export const defaultConfig: Required<DefaultConfig> = {
  gwCsdsServiceName: 'faasGW',
  uiCsdsServiceName: 'faasUI',
  apiVersion: '1',
  timeout: 35000, // ms
  protocol: PROTOCOL.HTTPS,
  getLambdasUri: 'api/account/%s/lambdas/',
  invokeUuidUri: 'api/account/%s/lambdas/%s/invoke',
  invokeEventUri: 'api/account/%s/events/%s/invoke',
  isImplementedUri: 'api/account/%s/events/%s/isImplemented',
  failOnErrorStatusCode: false,
  csdsHttpHeaders: {},
  csdsTtlSeconds: 600,
  jwtRefreshAfterMinutes: 30,
  isImplementedCacheDurationInSeconds: 60,
};
