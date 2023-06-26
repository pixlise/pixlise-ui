/* eslint-disable */

export const protobufPackage = "";

/**
 * This is expected to appear in all Resp messages. It is
 * basically a replacement for HTTP status codes
 */
export enum ResponseStatus {
  WS_UNDEFINED = 0,
  WS_OK = 1,
  WS_NOT_FOUND = 2,
  WS_BAD_REQUEST = 3,
  WS_NO_PERMISSION = 4,
  WS_SERVER_ERROR = 5,
  UNRECOGNIZED = -1,
}

export function responseStatusFromJSON(object: any): ResponseStatus {
  switch (object) {
    case 0:
    case "WS_UNDEFINED":
      return ResponseStatus.WS_UNDEFINED;
    case 1:
    case "WS_OK":
      return ResponseStatus.WS_OK;
    case 2:
    case "WS_NOT_FOUND":
      return ResponseStatus.WS_NOT_FOUND;
    case 3:
    case "WS_BAD_REQUEST":
      return ResponseStatus.WS_BAD_REQUEST;
    case 4:
    case "WS_NO_PERMISSION":
      return ResponseStatus.WS_NO_PERMISSION;
    case 5:
    case "WS_SERVER_ERROR":
      return ResponseStatus.WS_SERVER_ERROR;
    case -1:
    case "UNRECOGNIZED":
    default:
      return ResponseStatus.UNRECOGNIZED;
  }
}

export function responseStatusToJSON(object: ResponseStatus): string {
  switch (object) {
    case ResponseStatus.WS_UNDEFINED:
      return "WS_UNDEFINED";
    case ResponseStatus.WS_OK:
      return "WS_OK";
    case ResponseStatus.WS_NOT_FOUND:
      return "WS_NOT_FOUND";
    case ResponseStatus.WS_BAD_REQUEST:
      return "WS_BAD_REQUEST";
    case ResponseStatus.WS_NO_PERMISSION:
      return "WS_NO_PERMISSION";
    case ResponseStatus.WS_SERVER_ERROR:
      return "WS_SERVER_ERROR";
    case ResponseStatus.UNRECOGNIZED:
    default:
      return "UNRECOGNIZED";
  }
}
