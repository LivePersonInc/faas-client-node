import {AppJwtCredentials} from './../../src/types/appJwtCredentials';
import {Client} from '../../src/client/client';

const successLambdaUUID =
  process.env['SUCCESS_LAMBDA_UUID'] || 'does-not-exist';

const errorLambdaUUID = process.env['ERROR_LAMBDA_UUID'] || 'does-not-exist';
const accountId = process.env['ACCOUNT_ID'] || 'does-not-exist';
const clientId = process.env['CLIENT_ID'] || 'does-not-exist';
const clientSecret = process.env['CLIENT_SECRET'] || 'does-not-exist';

const appJwtCredentials: AppJwtCredentials = {
  clientId,
  clientSecret,
};
describe('V2 Invoke by UUID', () => {
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

  it('should fail if lambda returns 901 error', async () => {
    const client = new Client({
      accountId,
      authStrategy: appJwtCredentials,
      failOnErrorStatusCode: true,
    });
    const payload = {
      foo: 'bar',
    };

    try {
      await client.invoke({
        lambdaUuid: errorLambdaUUID,
        externalSystem: 'integration-tests',
        body: {
          headers: [],
          payload,
        },
      });
      fail('should fail');
    } catch (error: any) {
      expect(error?.name).toEqual('FaaSLambdaError');
      expect(error?.message).toStartWith(
        `Failed to invoke lambda : ${errorLambdaUUID}`
      );
    }
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

    try {
      await client.invoke({
        lambdaUuid: nonExistingLambda,
        externalSystem: 'integration-tests',
        body: {
          headers: [],
          payload,
        },
      });
      fail('should fail');
    } catch (error: any) {
      expect(error?.name).toEqual('FaaSInvokeError');
      expect(error?.message).toContain(`404`);
    }
  });
});

describe('V2 Invoke by event id', () => {
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
      eventId: 'conversational_command',
      externalSystem: 'integration-tests',
      body: {
        headers: [],
        payload,
      },
    });

    expect(response.ok).toEqual(true);
  });

});
