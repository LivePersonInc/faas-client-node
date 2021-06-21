import {EVENT, InvocationDomain} from './apiSpec';
import {HTTP_METHOD} from './getUrlOptions';
import {BaseConfig} from '../client/clientConfig';

export interface BaseInvocation extends Partial<BaseConfig> {
  readonly method?: typeof HTTP_METHOD[keyof typeof HTTP_METHOD];
  readonly externalSystem: string;
  readonly apiVersion?: string;
  readonly userId?: string;
  readonly skillId?: string;
}

export interface BasePostInvocation extends BaseInvocation {
  readonly body: InvocationDomain;
}

export interface EventRequest {
  // setting specifying it with "| string" allows to the use of future event names that are not bundled
  // in the current typings
  readonly eventId: typeof EVENT[keyof typeof EVENT] | string;
}

export interface FilterLambdas extends Partial<EventRequest> {
  readonly state?: string | string[];
  readonly name?: string;
}

export type Invocation = EventInvocation | UuidInvocation;

export type IsImplemented = BaseInvocation & EventRequest;

export type LambdaRequest = FilterLambdas & Partial<BaseInvocation>;

export type EventInvocation = BasePostInvocation & EventRequest;

export interface UuidInvocation extends BasePostInvocation {
  readonly lambdaUuid: string;
}
