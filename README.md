# Functions-Client

> The [LivePerson Functions](https://developers.liveperson.com/liveperson-functions-overview.html) client for NodeJS.

It offers functionality to retrieve all lambdas and invoke them via lambda UUID or event IDs.

**Table of Contents:**
<!-- toc -->

- [Functions-Client](#functions-client)
  - [Overview](#overview)
  - [Install](#install)
  - [Usage](#usage)
    - [Initializing the client](#initializing-the-client)
      - [DPoP authorization](#dpop-authorization)
      - [Optional Configuration Parameters](#optional-configuration-parameters)
      - [Collecting metrics](#collecting-metrics)
    - [Method call examples](#method-call-examples)
      - [Invoking a lambda by UUID](#invoking-a-lambda-by-uuid)
      - [Invoking a lambda by event](#invoking-a-lambda-by-event)
      - [Checking if an event type/id is available/implemented](#check-if-an-event-typeid-is-availableimplemented)
      - [Getting a list of existing lambdas](#getting-a-list-of-existing-lambdas)
    - [Error handling](#error-handling)

<!-- tocstop -->

## Overview

Capabilities:

- Invoking Lambdas
- Checking if an event is implemented by the account
- Getting lambdas of an account

## Install

```bash
yarn add liveperson-functions-client
```

or

```bash
npm install liveperson-functions-client
```

## Usage

_Note:_ The library exposes typings for IDE assistance/auto-complete and compile time validation for TS projects.

### Initializing the client

The client will use the OAuth2.0 flow `client_credentials` for authorization. Please refer to these [docs](https://developers.liveperson.com/liveperson-functions-external-invocations-client-credentials.html) for further information on that. On each request the client will check if the `JWT` is about to expire. If this is the case, the client will try to refresh it. If the `JWT` is expired and the client failed to refresh it, an `Error` is thrown. The time after which the refreshing logic will kick in can be specified via the property `jwtRefreshAfterMinutes`. Alternatively, you can provide your own authorization method that generates a suitable authorization header
by implementing a method that fulfills the GetAuthorizationHeader-Interface:

```ts
export type GetAuthorizationHeader = (input: {
  url: string;
  method: string;
}) => Promise<string>;
```

Example:

```ts
// Default: Provide client id and client secret as auth strategy as follows
import { Client } from 'liveperson-functions-client';

const client = new Client({
  accountId: 'myAccountId',
  authStrategy: {
    clientId: 'myClientId',
    clientSecret: 'myClientSecret',
  },
});


// Alternative: Provide your own implementation of our type 'GetAuthorizationHeader'
import { Client, GetAuthorizationHeader } from 'liveperson-functions-client';

const getAuthorizationHeader: GetAuthorizationHeader = async ({
  url,
  method,
}) => {
  // example custom implementation
  const oauthApiKey = '...';
  const oauthApiSecret = '...';
  const oauthSignatureMethod = '...';

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

  return oAuth.toHeader(oAuth.authorize({ url, method })).Authorization;
};

const client = new Client({
  accountId: 'myAccountId',
  authStrategy: getAuthorizationHeader,
});
```

#### DPoP authorization

The client supports Oauth2+DPoP authorization ONLY FOR INTERNAL USE in service-to-service. Required methods can be configured during the initialization as 'authStrategy.' You must provide your implementation of the `getAccessTokenInternal` and `getDpopHeaderInternal` methods.

Example:

  ```ts
  const client = new Client({
    accountId: 'myAccountId',
    authStrategy: {
        getAccessTokenInternal: async (domainUrl: string) => {
          // you implementation
          return 'accessToken';
        },
        getDpopHeaderInternal: async (url: string, method: string, accessToken?: string) => {
          // you implementation
          return 'dopHeader';
        },
      }
  });
  ```

#### Optional configuration parameters

While authStrategy and accountId are obligatory parameters for the configuration of the client, multiple other parameters can be set optionally. If you do not set them we default back to our default configuration.

The optional parameters can be found in the interface default config which looks like this.

```js
export interface DefaultConfig {
  readonly gwCsdsServiceName?: string;
  readonly uiCsdsServiceName?: string;
  readonly apiVersion?: string;
  readonly timeout?: number;
  readonly protocol?: typeof Protocol[keyof typeof Protocol];
  readonly getLambdasUri?: string;
  readonly invokeUuidUri?: string;
  readonly invokeEventUri?: string;
  readonly isImplementedUri?: string;
  readonly failOnErrorStatusCode?: boolean;
  /** Optional HTTP request headers that should be included in CSDS requests. */
  readonly csdsHttpHeaders?: { [key: string]: any };
  readonly csdsTtlSeconds?: number;
  /**
   * Time after which the JWT should be refreshed.
   */
  readonly jwtRefreshAfterMinutes?: number;

  readonly isImplementedCacheDurationInSeconds?: number;
}

// These values default to:

export const defaultConfig: Required<DefaultConfig> = {
  gwCsdsServiceName: 'faasGW',
  uiCsdsServiceName: 'faasUI',
  apiVersion: '1',
  timeout: 35000, // ms
  protocol: Protocol.HTTPS,
  getLambdasUri: 'api/account/%s/lambdas/',
  invokeUuidUri: 'api/account/%s/lambdas/%s/invoke',
  invokeEventUri: 'api/account/%s/events/%s/invoke',
  isImplementedUri: 'api/account/%s/events/%s/isImplemented',
  failOnErrorStatusCode: false,
  csdsHttpHeaders: {},
  csdsTtlSeconds: 600,
  jwtRefreshAfterMinutes: 30,
  isImplementedCacheDurationInSeconds: 60,
};
```

If you want to set one of these parameters, just add them to the object passed to the client as its first paramter in the initialization process.
Below you can find an example where the optional config param isImplementedCacheDurationInSeconds is set.

```js
const client = new Client({
  accountId: 'myAccountId',
  authStrategy: {
    clientId: 'myClientId',
    clientSecret: 'myClientSecret',
  },
  isImplementedCacheDurationInSeconds: 20;
});
```

#### Collecting metrics

If you want to collect metrics you may implement the interface MetricCollector and pass your implementation to the client when initializing it.
The metrics are only held in memory and are not persisted. If you pass no implementation of MetricCollector the metrics will be ignored.

```js
import { Client } from 'liveperson-functions-client';
const client = new Client(
  {
    accountId: 'myAccountId',
    authStrategy: {
      clientId: 'myClientId',
      clientSecret: 'myClientSecret',
    },
  },
{
    metricCollector: new MyMetricCollector(),
});
```

### Method call examples

#### Invoking a lambda by UUID

```js
const response = await client.invoke({
  lambdaUuid: 'uuid',
  externalSystem: 'demoSystem',
  body: {
    headers: [],
    payload: {
      foo: 'bar',
    },
  },
});
```

#### Invoking a lambda by event

```js
const response = await client.invoke({
  eventId: 'eventId',
  externalSystem: 'demoSystem',
  body: {
    headers: [],
    payload: {
      foo: 'bar',
    },
  },
});
```

#### Check if an event type/id is available/implemented

```js
const response = await client.isImplemented({
  eventId: 'eventId',
  externalSystem: 'demoSystem',
});
```

#### Getting a list of existing lambdas

**You have to use your own authentication method when fetching lambdas as it still relies on OAuth 1.0.**

```js
const response = await client.getLambdas({
  eventId: 'eventId', // filter lambdas for events
  state: ['Productive', 'Draft'], // filter lambdas for deployment states
  userId: 'userId',
});
```

#### Error handling

Errors with the name `FaaSLambdaError` are raised when the invocation fails due to a custom implementation error. The client internally uses [verror](https://github.com/joyent/node-verror). We recommend to log the `stack` in order to get detailed information about the root cause.

```js
try {
  // invoke here
  ...
} catch (error) {
  /**
   * LivePerson FunctionsLambdaErrors occur when the lambda fails due to the implementation.
   * These exceptions are not relevant for alerting, because there are no issues with the service itself.
   */
  if (error.name === "FaaSLambdaError") {
    console.info(error.stack, "Error caused by implementation of lambda.");
  } else {
    console.error(error.stack, "Something unexpected happened.");
  }
}
```

More detailed information on errors that can occur can be found [here.](https://developers.liveperson.com/liveperson-functions-external-invocations-error-codes.html)
