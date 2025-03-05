import {AppJwtCredentials} from '../../src/types/appJwtCredentials';
import {Client} from '../../src/client/client';
import {GetAuthorizationHeader} from '../../src/client/clientConfig';

const accountId = process.env['ACCOUNT_ID'] || 'does-not-exist';
const userId = process.env['USER_ID'] || 'does-not-exist';
const bearer = process.env['BEARER'] || 'does-not-exist';

describe('Get Functions V1', () => {
    it('should get V1 functions', async () => {
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
          state: 'Draft',
          userId,
        });
  
        expect(response.ok).toEqual(true);
        expect(Array.isArray(response.body)).toEqual(true);
      });
  
});
