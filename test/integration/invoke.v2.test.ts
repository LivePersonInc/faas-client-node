import {AppJwtCredentials} from './../../src/types/appJwtCredentials';
import {Client} from '../../src/client/client';

const successLambdaUUID =
  process.env['SUCCESS_LAMBDA_UUID'] || 'does-not-exist';
const accountId = process.env['ACCOUNT_ID'] || 'does-not-exist';
const clientId = process.env['CLIENT_ID'] || 'does-not-exist';
const clientSecret = process.env['CLIENT_SECRET'] || 'does-not-exist';

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
