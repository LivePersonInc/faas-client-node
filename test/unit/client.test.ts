import * as jwt from 'jsonwebtoken';
import {BaseClient} from '../../src/client/baseClient';
import {Client} from '../../src/client/client';
import {CsdsClient} from '../../src/helper/csdsClient';
import {BaseConfig, Config} from '../../src/client/clientConfig';
import {Response} from '../../src/types/response';
import nock from 'nock';

const secret = 'mySecret';
const TEST_HOST = 'test123.com';
const ACCOUNT_ID = '123456';

jest.mock('../../src/helper/csdsClient', () => {
  return {
    CsdsClient: jest.fn().mockImplementation(() => {
      return {
        get: jest.fn(() => TEST_HOST),
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

describe('Client', () => {
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
      const scope = nock('https://test123.com')
        .post(
          '/api/account/123456/events/fooBar/invoke?v=1&skillId=&externalSystem=testSystem'
        )
        .once()
        .reply(200, result1)
        .persist()
        .post(
          '/api/account/le12345/events/fooBar/invoke?v=1&skillId=&externalSystem=testSystem'
        )
        .once()
        .reply(200, result2)
        .persist();

      const client1 = new Client(testConfig);
      const response1 = client1.invoke({
        eventId: 'fooBar',
        externalSystem: 'testSystem',
        body: {
          payload: {},
        },
      });

      await expect(response1).resolves.toBeNonEmptyObject();
      expect((await response1).body).toEqual(result1);

      const client2 = new Client({...testConfig, accountId: 'le12345'});
      const response2 = client2.invoke({
        eventId: 'fooBar',
        externalSystem: 'testSystem',
        body: {
          payload: {},
        },
      });

      await expect(response2).resolves.toBeNonEmptyObject();
      expect((await response2).body).toEqual(result2);

      expect(scope.isDone()).toBe(true);
    });

    test('getLambdas method', async () => {
      const lambda = [{uuid: 'a-b-c-d'}];
      const scope = nock('https://test123.com')
        .get(
          '/api/account/123456/lambdas/?eventId=&state=&externalSystem=testSystem&userId=&v=1'
        )
        .once()
        .reply(200, lambda)
        .persist();

      const client = new Client({...testConfig, accountId: ACCOUNT_ID});
      const response = client.getLambdas({
        externalSystem: 'testSystem',
      });
      await expect(response).resolves.toBeNonEmptyObject();
      expect((await response).body).toEqual(lambda);

      expect(scope.isDone()).toBe(true);
    });

    test('should retry on receiving a network error', async () => {
      const errorCode = {code: 'ECONNRESET'};

      const scope = nock('https://test123.com')
        .post(
          '/api/account/123456/lambdas/this-is-a-uuid/invoke?v=1&skillId=&externalSystem=test-system'
        )
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
      const scope = nock('https://test123.com')
        .post(
          '/api/account/123456/lambdas/this-is-a-uuid/invoke?v=1&skillId=&externalSystem=test-system'
        )
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

      const scope = nock('https://test123.com')
        .post(
          '/api/account/123456/lambdas/this-is-a-uuid/invoke?v=1&skillId=&externalSystem=test-system'
        )
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
