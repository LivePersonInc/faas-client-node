export interface InvocationMetricData {
  accountId: string;
  requestDurationInMillis: number;
  domain?: string;
  /**
   * @deprecated use lpEventSource Instead
   */
  externalSystem?: string;
  lpEventSource?: string;
  userId?: string;
  event?: string;
  UUID?: string;
  statusCode?: number;
  error?: Error;
  fromCache?: boolean;
  skillId?: string;
}
export interface MetricCollector {
  onInvoke(invocationData: InvocationMetricData): void;
  onGetLambdas(invocationData: InvocationMetricData): void;
  onIsImplemented(invocationData: InvocationMetricData): void;
}
