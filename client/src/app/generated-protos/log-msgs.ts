/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { LogLine } from "./log";
import { ResponseStatus, responseStatusFromJSON, responseStatusToJSON } from "./response";

export const protobufPackage = "";

/** Special permissions required to be able to read logs on certain pages */
export interface LogReadReq {
  logStreamId: string;
}

export interface LogReadResp {
  status: ResponseStatus;
  entries: LogLine[];
}

/** Contains the string log level - if invalid, sends back bad request... */
export interface LogSetLevelReq {
  logLevelId: string;
}

export interface LogSetLevelResp {
  status: ResponseStatus;
  logLevelId: string;
}

export interface LogGetLevelReq {
}

export interface LogGetLevelResp {
  status: ResponseStatus;
  logLevelId: string;
}

function createBaseLogReadReq(): LogReadReq {
  return { logStreamId: "" };
}

export const LogReadReq = {
  encode(message: LogReadReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.logStreamId !== "") {
      writer.uint32(10).string(message.logStreamId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): LogReadReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseLogReadReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.logStreamId = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): LogReadReq {
    return { logStreamId: isSet(object.logStreamId) ? String(object.logStreamId) : "" };
  },

  toJSON(message: LogReadReq): unknown {
    const obj: any = {};
    message.logStreamId !== undefined && (obj.logStreamId = message.logStreamId);
    return obj;
  },

  create<I extends Exact<DeepPartial<LogReadReq>, I>>(base?: I): LogReadReq {
    return LogReadReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<LogReadReq>, I>>(object: I): LogReadReq {
    const message = createBaseLogReadReq();
    message.logStreamId = object.logStreamId ?? "";
    return message;
  },
};

function createBaseLogReadResp(): LogReadResp {
  return { status: 0, entries: [] };
}

export const LogReadResp = {
  encode(message: LogReadResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    for (const v of message.entries) {
      LogLine.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): LogReadResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseLogReadResp();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.status = reader.int32() as any;
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.entries.push(LogLine.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): LogReadResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      entries: Array.isArray(object?.entries) ? object.entries.map((e: any) => LogLine.fromJSON(e)) : [],
    };
  },

  toJSON(message: LogReadResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    if (message.entries) {
      obj.entries = message.entries.map((e) => e ? LogLine.toJSON(e) : undefined);
    } else {
      obj.entries = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<LogReadResp>, I>>(base?: I): LogReadResp {
    return LogReadResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<LogReadResp>, I>>(object: I): LogReadResp {
    const message = createBaseLogReadResp();
    message.status = object.status ?? 0;
    message.entries = object.entries?.map((e) => LogLine.fromPartial(e)) || [];
    return message;
  },
};

function createBaseLogSetLevelReq(): LogSetLevelReq {
  return { logLevelId: "" };
}

export const LogSetLevelReq = {
  encode(message: LogSetLevelReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.logLevelId !== "") {
      writer.uint32(10).string(message.logLevelId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): LogSetLevelReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseLogSetLevelReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.logLevelId = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): LogSetLevelReq {
    return { logLevelId: isSet(object.logLevelId) ? String(object.logLevelId) : "" };
  },

  toJSON(message: LogSetLevelReq): unknown {
    const obj: any = {};
    message.logLevelId !== undefined && (obj.logLevelId = message.logLevelId);
    return obj;
  },

  create<I extends Exact<DeepPartial<LogSetLevelReq>, I>>(base?: I): LogSetLevelReq {
    return LogSetLevelReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<LogSetLevelReq>, I>>(object: I): LogSetLevelReq {
    const message = createBaseLogSetLevelReq();
    message.logLevelId = object.logLevelId ?? "";
    return message;
  },
};

function createBaseLogSetLevelResp(): LogSetLevelResp {
  return { status: 0, logLevelId: "" };
}

export const LogSetLevelResp = {
  encode(message: LogSetLevelResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    if (message.logLevelId !== "") {
      writer.uint32(18).string(message.logLevelId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): LogSetLevelResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseLogSetLevelResp();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.status = reader.int32() as any;
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.logLevelId = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): LogSetLevelResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      logLevelId: isSet(object.logLevelId) ? String(object.logLevelId) : "",
    };
  },

  toJSON(message: LogSetLevelResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    message.logLevelId !== undefined && (obj.logLevelId = message.logLevelId);
    return obj;
  },

  create<I extends Exact<DeepPartial<LogSetLevelResp>, I>>(base?: I): LogSetLevelResp {
    return LogSetLevelResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<LogSetLevelResp>, I>>(object: I): LogSetLevelResp {
    const message = createBaseLogSetLevelResp();
    message.status = object.status ?? 0;
    message.logLevelId = object.logLevelId ?? "";
    return message;
  },
};

function createBaseLogGetLevelReq(): LogGetLevelReq {
  return {};
}

export const LogGetLevelReq = {
  encode(_: LogGetLevelReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): LogGetLevelReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseLogGetLevelReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(_: any): LogGetLevelReq {
    return {};
  },

  toJSON(_: LogGetLevelReq): unknown {
    const obj: any = {};
    return obj;
  },

  create<I extends Exact<DeepPartial<LogGetLevelReq>, I>>(base?: I): LogGetLevelReq {
    return LogGetLevelReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<LogGetLevelReq>, I>>(_: I): LogGetLevelReq {
    const message = createBaseLogGetLevelReq();
    return message;
  },
};

function createBaseLogGetLevelResp(): LogGetLevelResp {
  return { status: 0, logLevelId: "" };
}

export const LogGetLevelResp = {
  encode(message: LogGetLevelResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    if (message.logLevelId !== "") {
      writer.uint32(18).string(message.logLevelId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): LogGetLevelResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseLogGetLevelResp();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.status = reader.int32() as any;
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.logLevelId = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): LogGetLevelResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      logLevelId: isSet(object.logLevelId) ? String(object.logLevelId) : "",
    };
  },

  toJSON(message: LogGetLevelResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    message.logLevelId !== undefined && (obj.logLevelId = message.logLevelId);
    return obj;
  },

  create<I extends Exact<DeepPartial<LogGetLevelResp>, I>>(base?: I): LogGetLevelResp {
    return LogGetLevelResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<LogGetLevelResp>, I>>(object: I): LogGetLevelResp {
    const message = createBaseLogGetLevelResp();
    message.status = object.status ?? 0;
    message.logLevelId = object.logLevelId ?? "";
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
