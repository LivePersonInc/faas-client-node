import {InvocationMetricData} from './../helper/metricCollector';
import {format as createUrl} from 'url';
import {format} from 'util';
import VError = require('verror');
import {HTTP_METHOD, GetUrlOptions, PROTOCOL} from '../types/getUrlOptions';
import {
  Config,
  DebugConfig,
  DpopCredentials,
  GetAccessToken,
  GetAuthorizationHeader,
  GetDpopHeader,
} from './clientConfig';
import {Tooling} from '../types/tooling';
import {Response} from '../types/response';
import {
  Invocation,
  EventInvocation,
  LambdaRequest,
  IsImplemented,
} from '../types/invocationTypes';
import {BaseQuery, GetLambdasQuery} from '../types/queries';
import {ImplementedEvent} from '../helper/isImplementedCache';
import {DoFetchOptions} from '../types/fetchOptions';
import {AppJwtAuthentication} from '../helper/appJwtAuthentication';
import {AppJwtCredentials} from '../types/appJwtCredentials';
const stopwatch = require('statman-stopwatch');

const name = 'faas-client-js';
const version = '2.0.0';

/**
 * The FaaS BaseClient.
 */
export class BaseClient {
  readonly version: string = version;
  protected readonly config: Required<Config>;
  protected readonly tooling: Tooling;

  protected getAuthorizationHeader: GetAuthorizationHeader | undefined;

  protected getAccessToken: GetAccessToken | undefined;
  protected getDpopHeader: GetDpopHeader | undefined;

  /**
   * Default constructor, creates a FaaS client.
   *
   * @param config The client configuration.
   * @param tooling The tooling used internally in the client.
   */
  constructor(config: Required<Config>, tooling: Tooling) {
    this.config = config;
    if (this.isAppJwtCredentials(config.authStrategy)) {
      const appJwtCredentials = config.authStrategy;
      this.getAuthorizationHeader = this.getAppJwtAuthorizationHeader(
        appJwtCredentials,
        config,
        tooling
      );
    } else if (this.isDpopCredentials(config.authStrategy)) {
      this.getAccessToken = config.authStrategy.getAccessTokenInternal;
      this.getDpopHeader = config.authStrategy.getDpopHeaderInternal;
    } else {
      this.getAuthorizationHeader = config.authStrategy;
    }
    this.tooling = tooling;
  }

  /**
   * Invokes a function.
   *
   * @param invocationData The invocation data.
   * @returns The function invocation response.
   */
  async invoke(invocationData: Invocation): Promise<Response> {
    const baseMetrics = this.collectBaseMetricsForInvokeFrom(invocationData);
    const watch = new stopwatch();
    watch.start();
    try {
      const domain = (baseMetrics.domain = await this.resolveDomain(
        this.config.gwCsdsServiceName
      ));

      const isV2 = this.isV2Domain(domain);

      const response = isV2
        ? await this.performInvocationV2(invocationData, domain)
        : await this.performInvocationV1(invocationData, domain);

      const successMetric = this.enhanceBaseMetrics(baseMetrics, {
        requestDurationInMillis: watch.read(),
      });
      this.tooling.metricCollector?.onInvoke(successMetric);
      return response;
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const statusCode = ((error as VError)?.cause as any)?.jse_cause?.jse_info
        ?.response;
      const failureMetric = this.enhanceBaseMetrics(baseMetrics, {
        statusCode,
        error,
      });
      this.tooling.metricCollector?.onInvoke(failureMetric);
      throw error;
    } finally {
      watch.stop();
    }
  }

  /**
   * Lists functions.
   *
   * @param lambdaRequestData filtering data
   * @returns A list of functions.
   */

  async getLambdas(lambdaRequestData: LambdaRequest): Promise<Response> {
    const baseMetrics = this.collectBaseMetricsFrom(lambdaRequestData);
    const watch = new stopwatch();
    watch.start();
    try {
      const domain = (baseMetrics.domain = await this.resolveDomain(
        this.config.uiCsdsServiceName
      ));
      const resp = await this.performGetLambdasRequest(
        lambdaRequestData,
        domain
      );
      const successMetric = this.enhanceBaseMetrics(baseMetrics, {
        requestDurationInMillis: watch.read(),
      });
      this.tooling.metricCollector?.onGetLambdas(successMetric);
      return resp;
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const statusCode = ((error as VError)?.cause as any)?.jse_cause?.jse_info
        ?.response;
      const failureMetric = this.enhanceBaseMetrics(baseMetrics, {
        requestDurationInMillis: watch.read(),
        statusCode,
        error,
      });

      this.tooling.metricCollector?.onGetLambdas(failureMetric);
      throw error;
    } finally {
      watch.stop();
    }
  }

  /**
   * Checks if an Event(ID) is implemented.
   */
  async isImplemented(
    isImplementedRequestData: IsImplemented
  ): Promise<boolean> {
    const baseMetrics = this.collectBaseMetricsFrom(isImplementedRequestData);
    baseMetrics.event = isImplementedRequestData.eventId;
    const watch = new stopwatch();
    watch.start();
    const cachedEvent: ImplementedEvent | undefined =
      this.tooling.isImplementedCache.get(
        isImplementedRequestData.eventId,
        isImplementedRequestData.skillId
      );
    if (cachedEvent !== undefined) {
      const successFromCacheMetric = this.enhanceBaseMetrics(baseMetrics, {
        fromCache: true,
        requestDurationInMillis: watch.read(),
      });
      this.tooling.metricCollector?.onIsImplemented(successFromCacheMetric);
      watch.stop();
      return cachedEvent.isImplemented;
    } else {
      try {
        const domain = (baseMetrics.domain = await this.resolveDomain(
          this.config.gwCsdsServiceName
        ));
        const implemented = await this.performGetRequestForIsImplemented(
          isImplementedRequestData,
          domain
        );
        const successMetric = this.enhanceBaseMetrics(baseMetrics, {
          requestDurationInMillis: watch.read(),
        });
        this.tooling.metricCollector?.onIsImplemented(successMetric);
        this.tooling.isImplementedCache.add(
          isImplementedRequestData.eventId,
          implemented,
          isImplementedRequestData.skillId
        );
        return implemented;
      } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const statusCode = ((error as VError)?.cause as any)?.jse_cause
          ?.jse_info?.response;
        const failureMetric = this.enhanceBaseMetrics(baseMetrics, {
          requestDurationInMillis: watch.read(),
          statusCode,
          error,
        });
        this.tooling.metricCollector?.onIsImplemented(failureMetric);
        throw error;
      } finally {
        watch.stop();
      }
    }
  }
  private async performInvocationV1(data: Invocation, domain: string) {
    const invokeData = {
      method: HTTP_METHOD.POST,
      ...this.config,
      ...data,
      requestId: this.tooling.generateId(),
    };

    const path = this.isEventInvocation(data)
      ? format(this.config.invokeEventUri, this.config.accountId, data.eventId)
      : format(
          this.config.invokeUuidUri,
          this.config.accountId,
          data.lambdaUuid
        );

    const query: BaseQuery = {
      v: invokeData.apiVersion,
      skillId: data?.skillId,
      externalSystem: invokeData.externalSystem,
    };
    try {
      const url = await this.getUrl({
        path,
        domain,
        query,
        ...invokeData,
      });

      const resp = await this.doFetch({url, domain, ...invokeData});
      return resp;
    } catch (error) {
      throw new VError(
        {
          cause: error as Error,
          info: {
            ...this.getDebugConfig(),
          },
          name: this.isCustomLambdaError((error as VError).cause())
            ? 'FaaSLambdaError'
            : 'FaaSInvokeError',
        },
        `Failed to invoke lambda ${
          this.isEventInvocation(invokeData)
            ? `for event: "${invokeData.eventId}"`
            : `: ${invokeData.lambdaUuid}"`
        }`
      );
    }
  }

  private async performInvocationV2(data: Invocation, domain: string) {
    const invokeData = {
      method: HTTP_METHOD.POST,
      ...this.config,
      ...data,
      requestId: this.tooling.generateId(),
      headers: {
        'LP-EventSource': data.externalSystem,
      },
    };

    const path = this.isEventInvocation(data)
      ? format(this.config.invokeEventUri, this.config.accountId, data.eventId)
      : format(
          this.config.invokeUuidUri,
          this.config.accountId,
          data.lambdaUuid
        );

    const query = {
      userId: data?.userId,
    };

    try {
      const url = await this.getUrl({
        path,
        domain,
        query,
        ...invokeData,
      });

      const resp = await this.doFetch({url, domain, ...invokeData});

      return resp;
    } catch (error) {
      throw new VError(
        {
          cause: error as Error,
          info: {
            ...this.getDebugConfig(),
          },
          name: this.isCustomLambdaError((error as VError).cause())
            ? 'FaaSLambdaError'
            : 'FaaSInvokeError',
        },
        `Failed to invoke lambda ${
          this.isEventInvocation(invokeData)
            ? `for event: "${invokeData.eventId}"`
            : `: ${invokeData.lambdaUuid}"`
        }`
      );
    }
  }
  private async performGetLambdasRequest(
    data: LambdaRequest,
    domain: string
  ): Promise<Response> {
    const requestData = {
      method: HTTP_METHOD.GET,
      ...this.config,
      ...data,
      requestId: this.tooling.generateId(),
    };
    const path = format(requestData.getLambdasUri, requestData.accountId);
    const query: GetLambdasQuery = {
      eventId: requestData.eventId,
      state: requestData.state,
      externalSystem: data.externalSystem,
      userId: data.userId,
      v: requestData.apiVersion,
    };
    try {
      const url = await this.getUrl({
        path,
        domain,
        query,
        ...requestData,
      });
      const resp = await this.doFetch({url, domain, ...requestData});
      return resp;
    } catch (error) {
      throw new VError(
        {
          cause: error as Error,
          info: {
            ...this.getDebugConfig(),
          },
          name: 'FaaSGetLambdasError',
        },
        `Failed to get functions from account Id "${requestData.accountId}".`
      );
    }
  }

  private async performGetRequestForIsImplemented(
    data: IsImplemented,
    domain: string
  ): Promise<boolean> {
    const isImplementedData = {
      method: HTTP_METHOD.GET,
      ...this.config,
      ...data,
      requestId: this.tooling.generateId(),
    };
    try {
      const path = format(
        isImplementedData.isImplementedUri,
        isImplementedData.accountId,
        isImplementedData.eventId
      );
      const query: BaseQuery = {
        v: isImplementedData.apiVersion,
        skillId: isImplementedData.skillId,
        externalSystem: isImplementedData.externalSystem,
      };
      const url = await this.getUrl({
        path,
        domain,
        query,
        ...isImplementedData,
      });
      const {
        body: {implemented},
      }: Response = await this.doFetch({
        url,
        domain,
        ...isImplementedData,
      });
      if (implemented === undefined) {
        throw new VError(
          {
            name: 'FaasIsImplementedParseError',
          },
          'Response could not be parsed'
        );
      }
      return implemented as boolean;
    } catch (error) {
      throw new VError(
        {
          cause: error as Error,
          info: {
            ...this.getDebugConfig(),
          },
          name: 'FaaSIsImplementedError',
        },
        `Failed to check if event "${data.eventId}" is implemented.`
      );
    }
  }

  /**
   * Base function to perform requests against the FaaS services.
   */
  protected async doFetch(options: DoFetchOptions): Promise<Response> {
    const {url, domain, body, method, requestId, headers} = options;
    try {
      const requestOptions = {
        url,
        body: options.body ? {timestamp: Date.now(), ...body} : undefined,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `${name}@${version}`,
          'X-Request-ID': requestId,
          ...headers,
        },
        method,
      };

      if (this.getAuthorizationHeader !== undefined) {
        requestOptions.headers = {
          ...requestOptions.headers,
          ...{Authorization: await this.getAuthorizationHeader({url, method})},
        };
      }

      if (
        this.getAccessToken !== undefined &&
        this.getDpopHeader !== undefined
      ) {
        const accessToken = await this.getAccessToken(
          `${PROTOCOL.HTTPS}://${domain}`
        );

        requestOptions.headers = {
          ...requestOptions.headers,
          ...{
            Authorization: `DPoP ${accessToken}`,
            DPoP: await this.getDpopHeader(url, method, accessToken),
          },
        };
      }

      const response = await this.tooling.fetch(requestOptions);
      if (response.ok === false && options.failOnErrorStatusCode === true) {
        // the error will be intentionally caught in the catch statement
        throw new VError(
          {
            // the logged auth header should be invalid now, since the request with this header
            // was already triggered (and the nonce allows only using it once)
            info: {response, requestOptions},
            name: 'HttpRequestError', // generic name, will be wrapped in the FaaS error
          },
          `Request did not respond with a success status: ${
            response.status
          } - ${response.statusText}.${
            response.body
              ? ` Response body: ${JSON.stringify(response.body)}`
              : ''
          }`
        );
      }
      return response;
    } catch (error) {
      throw new VError(
        {
          cause: error as Error,
          info: {
            ...this.getDebugConfig(),
          },
          name: 'FaaSRequestError',
        },
        `Failed on request: ${url}`
      );
    }
  }

  /**
   * Internal method to retrieve and build the request URL for the FaaS services.
   */
  protected async getUrl(options: GetUrlOptions): Promise<string> {
    const {accountId, domain, protocol, path, query} = options;
    try {
      return createUrl({
        protocol,
        hostname: domain,
        pathname: path,
        query: query as string,
      });
    } catch (error) {
      throw new VError(
        {
          cause: error as Error,
          info: {options, ...this.getDebugConfig()},
          name: 'FaaSCreateUrVError',
        },
        `Could not create URL. Failed to fetch domain for ${accountId}. Domain: ${domain}`
      );
    }
  }

  /**
   * Internal method to gather information for logging/debugging purposes.
   */
  protected getDebugConfig(opts?: DebugConfig) {
    // do not include plain credentials/passwords
    return {
      [`${name}_config`]: {
        version,
        ...opts,
      },
    };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected isCustomLambdaError(error: any): boolean {
    if (error && error.name === 'HttpRequestError') {
      const isDetailedError = error.jse_info?.response?.body?.errorCode;

      if (
        isDetailedError &&
        error.jse_info.response.body.errorCode.startsWith(
          'com.liveperson.faas.handler'
        )
      ) {
        return true;
      }
    }

    return false;
  }
  private isEventInvocation(
    invocation: Invocation
  ): invocation is EventInvocation {
    return typeof (invocation as EventInvocation).eventId === 'string';
  }
  private isAppJwtCredentials = (
    authStrategy: unknown
  ): authStrategy is AppJwtCredentials => {
    return (authStrategy as Record<string, unknown>).clientId !== undefined;
  };

  private isDpopCredentials = (
    authStrategy: unknown
  ): authStrategy is DpopCredentials => {
    return (
      typeof authStrategy === 'object' &&
      authStrategy !== null &&
      authStrategy !== undefined &&
      'getAccessTokenInternal' in authStrategy &&
      'getDpopHeaderInternal' in authStrategy &&
      typeof authStrategy.getAccessTokenInternal === 'function' &&
      typeof authStrategy.getDpopHeaderInternal === 'function'
    );
  };

  private getAppJwtAuthorizationHeader = (
    appJwtCredentials: AppJwtCredentials,
    config: Config,
    tooling: Tooling
  ) => {
    const appJwtAuth = new AppJwtAuthentication({
      accountId: config.accountId,
      clientId: appJwtCredentials.clientId,
      clientSecret: appJwtCredentials.clientSecret,
      getCsdsEntry: tooling.getCsdsEntry,
      expirationBufferMinutes: config.jwtRefreshAfterMinutes,
    });
    return appJwtAuth.getHeader.bind(appJwtAuth);
  };

  private async resolveDomain(csdsServiceName: string) {
    try {
      const domain = await this.tooling.getCsdsEntry(
        this.config.accountId,
        csdsServiceName
      );
      return domain;
    } catch (error) {
      throw new VError(
        {
          cause: error as Error,
          info: {
            ...this.getDebugConfig(),
          },
          name: 'FaaSIsImplementedError',
        },
        `Failed to resolve domain for csdsService: ${this.config.gwCsdsServiceName}.`
      );
    }
  }

  private collectBaseMetricsFrom(
    data: LambdaRequest | IsImplemented
  ): Record<string, unknown> {
    return {
      accountId: this.config.accountId,
      domain: 'unresolved',
      fromCache: false,
      externalSystem: data?.externalSystem,
      skillId: data?.skillId,
    };
  }

  private collectBaseMetricsForInvokeFrom(
    data: Invocation
  ): Record<string, unknown> {
    const baseMetrics = {
      accountId: this.config.accountId,
      domain: 'unresolved',
      fromCache: false,
      externalSystem: data.externalSystem,
    };
    return this.isEventInvocation(data)
      ? {
          ...baseMetrics,
          event: data.eventId,
          skillId: data?.skillId,
        }
      : {
          ...baseMetrics,
          UUID: data.lambdaUuid,
        };
  }

  private enhanceBaseMetrics(
    baseMetrics: {},
    additionalMetrics: {}
  ): InvocationMetricData {
    const enhancedMetrics = Object.assign({}, baseMetrics, additionalMetrics);
    return enhancedMetrics as InvocationMetricData;
  }

  private isV2Domain(domain: string): boolean {
    return domain.includes('fninvocations') || domain.includes('functions');
  }
}
