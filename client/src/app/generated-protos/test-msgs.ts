/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { ResponseStatus, responseStatusFromJSON, responseStatusToJSON } from "./response";

export const protobufPackage = "";

/**
 * For asking the API to run self-tests, eg simulating certian kinds of errors
 * allowing us to see if they are logged/reported as expected, to compare
 * to runtime user activity. Also allow implementation of notification test msgs
 * to be sent out so we can verify they are showing up as expected
 */
export interface RunTestReq {
  /** Free-form, API may interpret this however */
  testType: string;
  /** Free-form, API may interpret this however */
  testParameters: string;
}

export interface RunTestResp {
  status: ResponseStatus;
}

function createBaseRunTestReq(): RunTestReq {
  return { testType: "", testParameters: "" };
}

export const RunTestReq = {
  encode(message: RunTestReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.testType !== "") {
      writer.uint32(10).string(message.testType);
    }
    if (message.testParameters !== "") {
      writer.uint32(18).string(message.testParameters);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): RunTestReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRunTestReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.testType = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.testParameters = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): RunTestReq {
    return {
      testType: isSet(object.testType) ? String(object.testType) : "",
      testParameters: isSet(object.testParameters) ? String(object.testParameters) : "",
    };
  },

  toJSON(message: RunTestReq): unknown {
    const obj: any = {};
    message.testType !== undefined && (obj.testType = message.testType);
    message.testParameters !== undefined && (obj.testParameters = message.testParameters);
    return obj;
  },

  create<I extends Exact<DeepPartial<RunTestReq>, I>>(base?: I): RunTestReq {
    return RunTestReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<RunTestReq>, I>>(object: I): RunTestReq {
    const message = createBaseRunTestReq();
    message.testType = object.testType ?? "";
    message.testParameters = object.testParameters ?? "";
    return message;
  },
};

function createBaseRunTestResp(): RunTestResp {
  return { status: 0 };
}

export const RunTestResp = {
  encode(message: RunTestResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): RunTestResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRunTestResp();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.status = reader.int32() as any;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): RunTestResp {
    return { status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0 };
  },

  toJSON(message: RunTestResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    return obj;
  },

  create<I extends Exact<DeepPartial<RunTestResp>, I>>(base?: I): RunTestResp {
    return RunTestResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<RunTestResp>, I>>(object: I): RunTestResp {
    const message = createBaseRunTestResp();
    message.status = object.status ?? 0;
    return message;
  },
};

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin ? T
  : T extends Array<infer U> ? Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & { [K in Exclude<keyof I, KeysOfUnion<P>>]: never };

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
