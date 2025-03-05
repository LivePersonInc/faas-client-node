import * as jwt from 'jsonwebtoken';
import {BaseClient} from '../../src/client/baseClient';
import {Client} from '../../src/client/client';
import {CsdsClient} from '../../src/helper/csdsClient';
import {BaseConfig, Config} from '../../src/client/clientConfig';
import {Response} from '../../src/types/response';
import nock from 'nock';

const secret = 'mySecret';
const TEST_V2_HOST = 'fninvocations.test124.com'; // V2 hosts starts with fninvocations and is required to trigger v2 flow
const ACCOUNT_ID = '123456';

jest.mock('../../src/helper/csdsClient', () => {
  return {
    CsdsClient: jest.fn().mockImplementation(() => {
      return {
        get: jest.fn(() => TEST_V2_HOST),
      };
    }),
  };
});

jest.mock('simple-oauth2', () => ({
  ClientCredentials: jest.fn(() => ({
    getToken: async () => ({
      token: {
        access_token: jwt.sign(
          {
            aud: 'le4711',
            azp: 'bf16f923-b256-40c8-afa5-1b8e8372da09',
            scope: 'faas.lambda.invoke',
            iss: 'Sentinel',
            exp: Date.now() / 1000 + 60 * 60,
            iat: Date.now(),
          },
          secret
        ),
      },
    }),
  })),
}));

const testConfig: Required<BaseConfig> = {
  accountId: '123456',
  authStrategy: {
    clientId: 'foo',
    clientSecret: 'bar',
  },
};

describe('Client V2 flow', () => {
  beforeEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
  afterEach(jest.clearAllMocks);
  describe('success flows', () => {
    test('class and constructor - Base', () => {
      const client = new Client(testConfig);
      expect(CsdsClient).toHaveBeenCalledTimes(1);
      expect(client).toBeInstanceOf(Client);
      expect(client).toBeInstanceOf(BaseClient);
    });

    test('invoke method', async () => {
      const result1 = [123];
      const result2 = [456];
      const scope = nock(`https://${TEST_V2_HOST}`, {
        reqheaders: {
          'Content-Type': 'application/json',
          'User-Agent': value => true,
          'X-Request-ID': value => true,
           Authorization: value => true,
          'LP-EventSource': 'testSystem',
        },
      })
        .post('/api/account/123456/events/fooBar/invoke')
        .once()
        .reply(202, result1)
        .persist()
        .post('/api/account/le12345/events/fooBar/invoke')
        .once()
        .reply(202, result2)
        .persist();

      const client1 = new Client(testConfig);
      const response1 = await client1.invoke({
        eventId: 'fooBar',
        lpEventSource: 'testSystem',
        body: {
          payload: {},
        },
      });

      expect(response1).toBeNonEmptyObject();
      expect(response1.body).toEqual(result1);

      const client2 = new Client({...testConfig, accountId: 'le12345'});
      const response2 = await client2.invoke({
        eventId: 'fooBar',
        externalSystem: 'testSystem',
        body: {
          payload: {},
        },
      });

      expect(response2).toBeNonEmptyObject();
      expect(response2.body).toEqual(result2);

      expect(scope.isDone()).toBe(true);
    });

    test('getLambdas deprecated method to get V2 functions', async () => {
      const lambdas = [{uuid: 'a-b-c-d'}];
      const scope = nock(`https://${TEST_V2_HOST}`)
        .get('/api/account/123456/functions?eventId=&userId=&functionName=')
        .once()
        .reply(200, lambdas)
        .persist();

      const client = new Client({...testConfig, accountId: ACCOUNT_ID});
      const response = await client.getLambdas({
        externalSystem: 'testSystem',
      });
      expect(response).toBeNonEmptyObject();
      expect(response.body).toEqual(lambdas);
      expect(scope.isDone()).toBe(true);
    });

    test('getFunctions', async () => {
      const lambdas = [{uuid: 'a-b-c-d'}];
      const scope = nock(`https://${TEST_V2_HOST}`)
        .get('/api/account/123456/functions?eventId=&userId=&functionName=')
        .once()
        .reply(200, lambdas)
        .persist();

      const client = new Client({...testConfig, accountId: ACCOUNT_ID});
      const response = await client.getFunctions({
        externalSystem: 'testSystem',
      });
      expect(response).toBeNonEmptyObject();
      expect(response.body).toEqual(lambdas);
      expect(scope.isDone()).toBe(true);
    });

    test('should retry on receiving a network error', async () => {
      const errorCode = {code: 'ECONNRESET'};

      const scope = nock(`https://${TEST_V2_HOST}`)
        .post('/api/account/123456/lambdas/this-is-a-uuid/invoke')
        .times(3)
        .replyWithError(errorCode);

      const client = new Client(testConfig);

      const response: Response = await client.invoke({
        lambdaUuid: 'this-is-a-uuid',
        externalSystem: 'test-system',
        body: {
          payload: {},
        },
      });

      expect(response.retryCount).toEqual(3);
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('Unhappy flows', () => {
    test('should throw if Functions returns a none-okay status code', async () => {
      const scope = nock(`https://${TEST_V2_HOST}`)
        .post('/api/account/123456/lambdas/this-is-a-uuid/invoke')
        .times(3)
        .reply(502)
        .persist();
      const config: Config = {...testConfig, failOnErrorStatusCode: true};
      const client = new Client(config);

      try {
        await client.invoke({
          lambdaUuid: 'this-is-a-uuid',
          externalSystem: 'test-system',
          body: {
            payload: {},
          },
        });
      } catch (error) {
        expect(error).toMatchObject({
          name: 'FaaSInvokeError',
          message: expect.stringContaining('502 - Bad Gateway'),
        });
        expect(scope.isDone()).toBe(true);
      }
    });
    test('should throw if network errors are raised continuously', async () => {
      const errorCode = {code: 'ECONNRESET'};

      const scope = nock(`https://${TEST_V2_HOST}`)
        .post('/api/account/123456/lambdas/this-is-a-uuid/invoke')
        .times(3)
        .replyWithError(errorCode);
      const config: Config = {...testConfig, failOnErrorStatusCode: true};
      const client = new Client(config);

      try {
        await client.invoke({
          lambdaUuid: 'this-is-a-uuid',
          externalSystem: 'test-system',
          body: {
            payload: {},
          },
        });
      } catch (error) {
        expect(error).toMatchObject({
          name: 'FaaSInvokeError',
        });
        expect(scope.isDone()).toBe(true);
      }
    });
  });
});
