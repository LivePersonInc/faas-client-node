import {Client} from '../../src/client/client';
import {GetAuthorizationHeader} from '../../src/client/clientConfig';
import { getBearer } from './helper';

const accountId = process.env['ACCOUNT_ID_V1'] || 'does-not-exist';
const username = process.env['USER_NAME'] || 'does-not-exist';
const password = process.env['PASSWORD'] || 'does-not-exist';
const userId = process.env['USER_ID_V1'] || 'does-not-exist';


describe('Get Functions V1', () => {
    it('should get V1 functions', async () => {
        const bearer =  await getBearer(accountId, username, password);
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
