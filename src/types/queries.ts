/**
 * @deprecated Not available in Functions V2
 */
export interface BaseQuery {
  readonly v: string;
  readonly externalSystem: string;
  readonly skillId?: string;
}
/**
 * @deprecated will be replaced GetFunctionsQuery in Functions V2
 */
export interface GetLambdasQuery extends Partial<BaseQuery> {
  readonly eventId?: string;
  readonly state?: string | string[];
  readonly userId?: string;
}
export interface GetFunctionsQuery {
  readonly userId?: string;
  readonly state?: string[];
  readonly eventId?: string;
  readonly functionName?: string;
}
