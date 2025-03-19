import {CsdsClient} from '../../src/helper/csdsClient';
import nock from 'nock';
import {sleep} from '../../src/helper/common';

const csdsApiResultQA = {
  baseURIs: [
    {
      service: 'foo',
      account: 'le4711',
      baseURI: 'foo.liveperson.net',
    },
    {
      service: 'bar',
      account: 'le4711',
      baseURI: 'bar.liveperson.net',
    },
  ],
};

const csdsApiResultProd = {
  baseURIs: [
    {
      service: 'foo',
      account: '4711',
      baseURI: 'foo.liveperson.net',
    },
    {
      service: 'bar',
      account: '4711',
      baseURI: 'bar.liveperson.net',
    },
  ],
};

describe('CsdsClient', () => {
  beforeEach(() => {
    nock.cleanAll();
  });
  afterEach(jest.clearAllMocks);
  describe('Success flows', () => {
    it('should get csds entry if it exists', async () => {
      const scope = nock('http://csds-app.qa.int.gw.lpcloud.io')
        .get('/api/account/le4711/service/baseURI.json?version=1.0')
        .once()
        .reply(200, csdsApiResultQA)
        .persist();

      const csdsClient = new CsdsClient();

      const uri = await csdsClient.get('le4711', 'foo');

      expect(uri).toEqual('foo.liveperson.net');
      expect(scope.isDone()).toBe(true);
    });

    it('should cache requests', async () => {
      const scope = nock('http://csds-app.qa.int.gw.lpcloud.io')
        .get('/api/account/le4711/service/baseURI.json?version=1.0')
        .once()
        .reply(200, csdsApiResultQA);

      const csdsClient = new CsdsClient();

      await csdsClient.get('le4711', 'foo');
      await csdsClient.get('le4711', 'bar');

      expect(scope.isDone()).toBe(true);
    });

    it('should do request if cache expired', async () => {
      const scope = nock('http://adminlogin.liveperson.net')
        .get('/api/account/4711/service/baseURI.json?version=1.0')
        .twice()
        .reply(200, csdsApiResultProd);

      const csdsClient = new CsdsClient(1);

      await csdsClient.get('4711', 'foo');
      await sleep(1200);
      await csdsClient.get('4711', 'bar');

      expect(scope.isDone()).toBe(true);
    });
  });

  describe('Unhappy flows', () => {
    it('should throw if domain can not be found', async () => {
      const scope = nock('http://csds-app.qa.int.gw.lpcloud.io')
        .get('/api/account/le4711/service/baseURI.json?version=1.0')
        .once()
        .reply(200, csdsApiResultQA);

      const csdsClient = new CsdsClient();

      try {
        await csdsClient.get('le4711', 'does-not-exist');
      } catch (error) {
        expect(error).toMatchObject({
          message: 'Service "does-not-exist" could not be found',
          name: 'CSDSDomainNotFound',
        });
        expect(scope.isDone()).toBe(true);
      }
    });

    it('should throw if result is unexpected', async () => {
      const errorCode = {code: 'ECONNRESET'};

      const scope = nock('http://csds-app.qa.int.gw.lpcloud.io')
        .get('/api/account/le4711/service/baseURI.json?version=1.0')
        .thrice()
        .replyWithError(errorCode);

      const csdsClient = new CsdsClient();

      try {
        await csdsClient.get('le4711', 'foo');
      } catch (error) {
        expect(error).toMatchObject({
          message: 'Error while fetching CSDS entries: ',
          name: 'CSDSFailure',
        });
        expect(scope.isDone()).toBe(true);
      }
    });

    it('should throw if response is empty', async () => {
      const scope = nock('http://csds-app.qa.int.gw.lpcloud.io')
        .get('/api/account/le4711/service/baseURI.json?version=1.0')
        .once()
        .reply(200, []);

      const csdsClient = new CsdsClient();

      try {
        await csdsClient.get('le4711', 'foo');
      } catch (error) {
        expect(error).toMatchObject({
          message: expect.stringContaining('Service "foo" could not be found'),
          name: 'CSDSDomainNotFound',
        });
        expect(scope.isDone()).toBe(true);
      }
    });
  });
});
