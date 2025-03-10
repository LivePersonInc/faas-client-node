import {Headers} from './headers';
export interface Response {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
  headers: Headers;
  url: string;
  ok: boolean;
  status: number;
  statusText: string;
  retryCount?: number;
}

// From VError Response
export interface JseCause {
  jse_cause: {
    jse_info: {
      response: {
        body: unknown;
      };
    };
    name: string;
  };
}

export interface V1ErrorBody {
  errorCode: string;
  errorMsg: string;
}
export interface V2ErrorBody {
  code: string;
  message: string;
}

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== undefined && value !== null;
}

export function hasResponseBody(error: unknown): error is JseCause {
  return (
    isObject(error) &&
    'jse_cause' in error &&
    'name' in error &&
    typeof error.name === 'string' &&
    isObject(error.jse_cause) &&
    'jse_info' in error.jse_cause &&
    isObject(error.jse_cause.jse_info) &&
    'response' in error.jse_cause.jse_info &&
    isObject(error.jse_cause.jse_info.response) &&
    'body' in error.jse_cause.jse_info.response
  );
}

export function isV1ErrorBody(body: unknown): body is V1ErrorBody {
  return (
    isObject(body) &&
    'errorCode' in body &&
    'errorMsg' in body &&
    typeof body.errorCode === 'string' &&
    typeof body.errorMsg === 'string'
  );
}

export function isV2ErrorBody(body: unknown): body is V2ErrorBody {
  return (
    isObject(body) &&
    'code' in body &&
    'message' in body &&
    typeof body.code === 'string' &&
    typeof body.message === 'string'
  );
}
