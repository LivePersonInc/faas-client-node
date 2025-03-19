import {AppJwtCredentials} from './../../src/types/appJwtCredentials';
import {Client} from '../../src/client/client';
import {GetAuthorizationHeader} from '../../src/client/clientConfig';
import {createHmac} from 'crypto';
import OAuth from 'oauth-1.0a';

const successLambdaUUID =
  process.env['SUCCESS_LAMBDA_UUID_V1'] || 'does-not-exist';
const accountId = process.env['ACCOUNT_ID_V1'] || 'does-not-exist';
const clientId = process.env['CLIENT_ID_V1'] || 'does-not-exist';
const clientSecret = process.env['CLIENT_SECRET_V1'] || 'does-not-exist';
const oauthApiKey = process.env['OAUTH_API_KEY'] || 'does-not-exist';
const oauthApiSecret = process.env['OAUTH_API_SECRET'] || 'does-not-exist';
const oauthTokenKey = process.env['OAUTH_TOKEN_KEY'] || 'does-not-exist';
const oauthTokenSecret = process.env['OAUTH_TOKEN_SECRET'] || 'does-not-exist';
const oauthSignatureMethod =
  process.env['OAUTH_SIGNATURE_METHOD'] || 'does-not-exist';

const appJwtCredentials: AppJwtCredentials = {
  clientId,
  clientSecret,
};
describe('Invoke by UUID', () => {
  it('should invoke and get result via AppJwt', async () => {
    const client = new Client({
      accountId,
      authStrategy: appJwtCredentials,
      failOnErrorStatusCode: true,
    });
    const payload = {
      foo: 'bar',
    };

    const response = await client.invoke({
      lambdaUuid: successLambdaUUID,
      externalSystem: 'integration-tests',
      body: {
        headers: [],
        payload,
      },
    });

    expect(response.ok).toEqual(true);
  });

  it('should invoke and get result via custom Oauth1 implementation', async () => {
    // custom auth implementation start
    const getAuthorizationHeader: GetAuthorizationHeader = async ({
      url,
      method,
    }) => {
      const oAuth = new OAuth({
        consumer: {
          key: oauthApiKey,
          secret: oauthApiSecret,
        },
        signature_method: oauthSignatureMethod,
        realm: '',
        hash_function: (baseString: string, key: string): string => {
          return createHmac(oauthSignatureMethod.split('-')[1], key)
            .update(baseString)
            .digest('base64');
        },
      });
      return oAuth.toHeader(
        oAuth.authorize(
          {url, method},
          {key: oauthTokenKey, secret: oauthTokenSecret}
        )
      ).Authorization;
    };
    // custom auth implementation end

    const client = new Client({
      accountId,
      authStrategy: getAuthorizationHeader,
      failOnErrorStatusCode: true,
    });
    const payload = {
      foo: 'bar',
    };

    const response = await client.invoke({
      lambdaUuid: successLambdaUUID,
      externalSystem: 'integration-tests',
      body: {
        headers: [],
        payload,
        timestamp: Date.now(),
      },
    });

    expect(response.ok).toEqual(true);
  });

  it('should fail if lambda does not exist', async () => {
    const nonExistingLambda = 'c521cadf-d444-4519-ad11-1c1111114415';
    const client = new Client({
      accountId,
      authStrategy: appJwtCredentials,
      failOnErrorStatusCode: true,
    });
    const payload = {
      foo: 'bar',
    };

    expect(
      client.invoke({
        lambdaUuid: nonExistingLambda,
        externalSystem: 'integration-tests',
        body: {
          headers: [],
          payload,
        },
      })
    ).rejects.toMatchObject({
      message: expect.stringContaining(
        `There is no ${nonExistingLambda} deployed on ${accountId}`
      ),
      name: 'FaaSInvokeError',
    });
  });
});

describe('Invoke by event id', () => {
  it('should invoke and get result', async () => {
    const client = new Client({
      accountId,
      authStrategy: appJwtCredentials,
      failOnErrorStatusCode: true,
    });
    const payload = {
      foo: 'bar',
    };

    const response = await client.invoke({
      eventId: 'conversational_commands',
      externalSystem: 'integration-tests',
      body: {
        headers: [],
        payload,
      },
    });

    expect(response.ok).toEqual(true);
    expect(response.body).toEqual([]);
  });
});
