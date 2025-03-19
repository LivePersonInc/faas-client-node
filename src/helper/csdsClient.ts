import got from 'got';
import VError = require('verror');

interface ServiceDomainTuple {
  service: string;
  baseURI: string;
}

interface CSDSResponse {
  baseURIs: ServiceDomainTuple[];
}

interface ServiceDomainCache {
  domains: ServiceDomainTuple[];
  lastCacheTimestamp: number;
}

export class CsdsClient {
  private domainCache: Map<string, ServiceDomainCache>;
  /**G
   * @param ttlInSeconds TTL of the domains cache in seconds
   */
  constructor(private ttlInSeconds = 600) {
    this.domainCache = new Map();
  }

  async get(accountId: string, service: string): Promise<string> {
    const domains = await this.getCachedDomains(accountId);
    const domain = domains.find(({service: s}) => s === service);

    if (domain) {
      return domain.baseURI;
    }

    throw new VError(
      {
        name: 'CSDSDomainNotFound',
      },
      `Service "${service}" could not be found`
    );
  }

  private async getCachedDomains(
    accountId: string
  ): Promise<ServiceDomainTuple[]> {
    if (!this.isCacheExpired(accountId)) {
      const cache = this.domainCache.get(accountId) as ServiceDomainCache;
      return cache.domains;
    }

    try {
      const url = this.getUrl(accountId);
      const {baseURIs} = await got<CSDSResponse>(url, {
        responseType: 'json',
        throwHttpErrors: true,
        resolveBodyOnly: true,
      });

      if (baseURIs && baseURIs.length !== 0) {
        this.domainCache.set(accountId, {
          lastCacheTimestamp: Date.now(),
          domains: baseURIs,
        });
        return baseURIs;
      }
      return [];
    } catch (error) {
      throw new VError(
        {
          cause: error as Error,
          name: 'CSDSFailure',
        },
        'Error while fetching CSDS entries'
      );
    }
  }

  private isCacheExpired(accountId: string): boolean {
    const cache = this.domainCache.get(accountId);

    if (cache) {
      return Date.now() > cache.lastCacheTimestamp + this.ttlInSeconds * 1000;
    }

    return true;
  }

  private getUrl(accountId: string): string {
    return `http://${this.getCsdsDomain(
      accountId
    )}/api/account/${accountId}/service/baseURI.json?version=1.0`;
  }

  private getCsdsDomain(accountId: string): string {
    if (
      accountId.startsWith('le') ||
      accountId.startsWith('qa') ||
      accountId.startsWith('c') // new QA accounts
    ) {
      return 'csds-app.qa.int.gw.lpcloud.io';
    }
    if (accountId.startsWith('fr')) {
      return 'adminlogin-z0-intg.liveperson.net';
    }
    // new alpha
    if (accountId.startsWith('a')) {
      return 'adminlogin-a.liveperson.net';
    }
    // alpha/production
    return 'adminlogin.liveperson.net';
  }
}
