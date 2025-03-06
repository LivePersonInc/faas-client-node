import {AppJwtCredentials} from './../types/appJwtCredentials';
import {PROTOCOL} from '../types/getUrlOptions';
export interface BaseConfig {
  /**
   * The accountId/siteId.
   *
   * NOTE: It is not possible to switch between production and test accounts. If the accountId passed
   * to the constructor is an production (alpha/GA) account, it can only be used for production accounts
   * during the invocations (the same holds for test/QA accounts).
   */
  readonly accountId: string;

  readonly authStrategy:
    | AppJwtCredentials
    | GetAuthorizationHeader
    | DpopCredentials;
}

export interface DefaultConfig {
  readonly gwCsdsServiceName?: string;
  readonly uiCsdsServiceName?: string;
  readonly apiVersion?: string;
  readonly timeout?: number;
  readonly protocol?: typeof PROTOCOL[keyof typeof PROTOCOL];
  /**
   * Equivalent to getLambdasUri for V2 Functions
   */
  readonly getFunctionsUri?: string;
  readonly getLambdasUri?: string;
  readonly invokeUuidUri?: string;
  readonly invokeEventUri?: string;
  readonly isImplementedUri?: string;

  readonly failOnErrorStatusCode?: boolean;
  /** Optional HTTP request headers that should be included in CSDS requests. */
  readonly csdsHttpHeaders?: {[key: string]: unknown};
  readonly csdsTtlSeconds?: number;
  /**
   * Time after which the JWT should be refreshed.
   */
  readonly jwtRefreshAfterMinutes?: number;

  readonly isImplementedCacheDurationInSeconds?: number;
}

export interface DebugConfig {
  [key: string]: unknown;
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

/**
 * Type that defines how custom 'getAccessToken' method have to be implemented (Required for OAuth2+DPoP authentication)
 * Called whenever the faas-client needs to authenticate to send a request. Its return value
 * is used in the 'Authorization'-header of the request.
 * @param domainUrl Protocol (HTTPS) + domain of the API registered in the authentication server required to get the access token. E.g., https://va.faasgw.liveperson.net
 * @return A promise resolving to a string which contains the value of the Oauth2 + DPoP 'Authorization'-header
 */
export type GetAccessToken = (domainUrl: string) => Promise<string>;

/**
 * Type that defines how custom 'getDpopHeader method have to be implemented (Required for OAuth2+DPoP authentication)
 * Called whenever the faas-client needs to authenticate to send a request. Its return value
 * is used in the 'DPoP'-header of the request.
 * @param url Request 'url' including protocol domain and path
 * @param method 'http-method' of the request
 * @param accessToken A string containing the access token that was returned by 'getAccessToken' method
 * @return A promise resolving to a string which contains the value of 'DPoP' header
 */
export type GetDpopHeader = (
  url: string,
  method: string,
  accessToken?: string
) => Promise<string>;

/**
 * Type that defines how custom OAuth2+DPoP 'getAccessTokenInternal' and 'getDpopHeaderInternal' methods have to be implemented.
 * OAuth2+DPoP authentication is only available INTERNALLY for service-to-service.
 */
export type DpopCredentials = {
  getAccessTokenInternal: GetAccessToken;
  getDpopHeaderInternal: GetDpopHeader;
};

export const defaultConfig: Required<DefaultConfig> = {
  gwCsdsServiceName: 'faasGW',
  uiCsdsServiceName: 'faasUI',
  apiVersion: '1',
  timeout: 35000, // ms
  protocol: PROTOCOL.HTTPS,
  getLambdasUri: 'api/account/%s/lambdas/',
  getFunctionsUri: 'api/account/%s/functions',
  invokeUuidUri: 'api/account/%s/lambdas/%s/invoke',
  invokeEventUri: 'api/account/%s/events/%s/invoke',
  isImplementedUri: 'api/account/%s/events/%s/isImplemented',
  failOnErrorStatusCode: false,
  csdsHttpHeaders: {},
  csdsTtlSeconds: 600,
  jwtRefreshAfterMinutes: 30,
  isImplementedCacheDurationInSeconds: 60,
};
