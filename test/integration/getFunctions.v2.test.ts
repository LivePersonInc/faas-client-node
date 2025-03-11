import {Client} from '../../src/client/client';
import {GetAuthorizationHeader} from '../../src/client/clientConfig';
import {getBearer} from './helper';

const accountId = process.env['ACCOUNT_ID'] || 'does-not-exist';
const username = process.env['USER_NAME'] || 'does-not-exist';
const password = process.env['PASSWORD'] || 'does-not-exist';
const userId = process.env['USER_ID'] || 'does-not-exist';
let bearer = '';

describe('Get Functions V2', () => {
  beforeAll(async () => {
    bearer = await getBearer(accountId, username, password);
  });
  it('should get V2 functions', async () => {
    // custom auth implementation start
    const getAuthorizationHeader: GetAuthorizationHeader = async ({
      url,
      method,
    }) => {
      return new Promise((resolve, reject) => {
        resolve(`Bearer ${bearer}`);
      });
    };
    const client = new Client({
      accountId,
      authStrategy: getAuthorizationHeader,
      failOnErrorStatusCode: true,
    });

    const response = await client.getFunctions({
      lpEventSource: 'tests',
      userId,
    });

    expect(response.ok).toEqual(true);
    expect(Array.isArray(response.body)).toEqual(true);
  });

  it('should get V2 functions using deprecated getLambdas method', async () => {
    // custom auth implementation start
    const getAuthorizationHeader: GetAuthorizationHeader = async ({
      url,
      method,
    }) => {
      return new Promise((resolve, reject) => {
        resolve(`Bearer ${bearer}`);
      });
    };
    const client = new Client({
      accountId,
      authStrategy: getAuthorizationHeader,
      failOnErrorStatusCode: true,
    });

    const response = await client.getLambdas({
      externalSystem: 'tests',
      userId,
    });

    expect(response.ok).toEqual(true);
    expect(Array.isArray(response.body)).toEqual(true);
  });

  it('should get V2 functions unauthorized', async () => {
    // custom auth implementation start
    const getAuthorizationHeader: GetAuthorizationHeader = async ({
      url,
      method,
    }) => {
      return new Promise((resolve, reject) => {
        resolve(`Bearer wrong-bearer`);
      });
    };
    const client = new Client({
      accountId,
      authStrategy: getAuthorizationHeader,
      failOnErrorStatusCode: true,
    });
    try {
      const response = await client.getFunctions({
        lpEventSource: 'tests',
        userId,
      });
    } catch (error: any) {
      expect(error?.name).toEqual('FaaSGetFunctionsError');
      expect(error?.message).toContain(`403 - Forbidden`);
    }
  });
});
