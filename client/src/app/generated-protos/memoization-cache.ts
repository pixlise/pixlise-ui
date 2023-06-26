/* eslint-disable */
import * as Long from "long";
import * as _m0 from "protobufjs/minimal";
import { ResponseStatus, responseStatusFromJSON, responseStatusToJSON } from "./response";

export const protobufPackage = "";

export interface CacheReq {
  id: string;
  bodyHash: string;
  cachedResult: string;
  baseIDs: string[];
}

export interface CacheResp {
  status: ResponseStatus;
}

export interface CacheCheckReq {
  id: string;
  bodyHash: string;
}

export interface CacheItem {
  id: string;
  bodyHash: string;
  cachedResult: string;
  timestamp: number;
  baseIDs: string[];
}

export interface CacheCheckResp {
  status: ResponseStatus;
  cachedResult: CacheItem | undefined;
}

function createBaseCacheReq(): CacheReq {
  return { id: "", bodyHash: "", cachedResult: "", baseIDs: [] };
}

export const CacheReq = {
  encode(message: CacheReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    if (message.bodyHash !== "") {
      writer.uint32(18).string(message.bodyHash);
    }
    if (message.cachedResult !== "") {
      writer.uint32(26).string(message.cachedResult);
    }
    for (const v of message.baseIDs) {
      writer.uint32(34).string(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): CacheReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCacheReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.id = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.bodyHash = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.cachedResult = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.baseIDs.push(reader.string());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): CacheReq {
    return {
      id: isSet(object.id) ? String(object.id) : "",
      bodyHash: isSet(object.bodyHash) ? String(object.bodyHash) : "",
      cachedResult: isSet(object.cachedResult) ? String(object.cachedResult) : "",
      baseIDs: Array.isArray(object?.baseIDs) ? object.baseIDs.map((e: any) => String(e)) : [],
    };
  },

  toJSON(message: CacheReq): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    message.bodyHash !== undefined && (obj.bodyHash = message.bodyHash);
    message.cachedResult !== undefined && (obj.cachedResult = message.cachedResult);
    if (message.baseIDs) {
      obj.baseIDs = message.baseIDs.map((e) => e);
    } else {
      obj.baseIDs = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<CacheReq>, I>>(base?: I): CacheReq {
    return CacheReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<CacheReq>, I>>(object: I): CacheReq {
    const message = createBaseCacheReq();
    message.id = object.id ?? "";
    message.bodyHash = object.bodyHash ?? "";
    message.cachedResult = object.cachedResult ?? "";
    message.baseIDs = object.baseIDs?.map((e) => e) || [];
    return message;
  },
};

function createBaseCacheResp(): CacheResp {
  return { status: 0 };
}

export const CacheResp = {
  encode(message: CacheResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): CacheResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCacheResp();
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

  fromJSON(object: any): CacheResp {
    return { status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0 };
  },

  toJSON(message: CacheResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    return obj;
  },

  create<I extends Exact<DeepPartial<CacheResp>, I>>(base?: I): CacheResp {
    return CacheResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<CacheResp>, I>>(object: I): CacheResp {
    const message = createBaseCacheResp();
    message.status = object.status ?? 0;
    return message;
  },
};

function createBaseCacheCheckReq(): CacheCheckReq {
  return { id: "", bodyHash: "" };
}

export const CacheCheckReq = {
  encode(message: CacheCheckReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    if (message.bodyHash !== "") {
      writer.uint32(18).string(message.bodyHash);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): CacheCheckReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCacheCheckReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.id = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.bodyHash = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): CacheCheckReq {
    return {
      id: isSet(object.id) ? String(object.id) : "",
      bodyHash: isSet(object.bodyHash) ? String(object.bodyHash) : "",
    };
  },

  toJSON(message: CacheCheckReq): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    message.bodyHash !== undefined && (obj.bodyHash = message.bodyHash);
    return obj;
  },

  create<I extends Exact<DeepPartial<CacheCheckReq>, I>>(base?: I): CacheCheckReq {
    return CacheCheckReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<CacheCheckReq>, I>>(object: I): CacheCheckReq {
    const message = createBaseCacheCheckReq();
    message.id = object.id ?? "";
    message.bodyHash = object.bodyHash ?? "";
    return message;
  },
};

function createBaseCacheItem(): CacheItem {
  return { id: "", bodyHash: "", cachedResult: "", timestamp: 0, baseIDs: [] };
}

export const CacheItem = {
  encode(message: CacheItem, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    if (message.bodyHash !== "") {
      writer.uint32(18).string(message.bodyHash);
    }
    if (message.cachedResult !== "") {
      writer.uint32(26).string(message.cachedResult);
    }
    if (message.timestamp !== 0) {
      writer.uint32(32).int64(message.timestamp);
    }
    for (const v of message.baseIDs) {
      writer.uint32(42).string(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): CacheItem {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCacheItem();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.id = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.bodyHash = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.cachedResult = reader.string();
          continue;
        case 4:
          if (tag !== 32) {
            break;
          }

          message.timestamp = longToNumber(reader.int64() as Long);
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.baseIDs.push(reader.string());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): CacheItem {
    return {
      id: isSet(object.id) ? String(object.id) : "",
      bodyHash: isSet(object.bodyHash) ? String(object.bodyHash) : "",
      cachedResult: isSet(object.cachedResult) ? String(object.cachedResult) : "",
      timestamp: isSet(object.timestamp) ? Number(object.timestamp) : 0,
      baseIDs: Array.isArray(object?.baseIDs) ? object.baseIDs.map((e: any) => String(e)) : [],
    };
  },

  toJSON(message: CacheItem): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    message.bodyHash !== undefined && (obj.bodyHash = message.bodyHash);
    message.cachedResult !== undefined && (obj.cachedResult = message.cachedResult);
    message.timestamp !== undefined && (obj.timestamp = Math.round(message.timestamp));
    if (message.baseIDs) {
      obj.baseIDs = message.baseIDs.map((e) => e);
    } else {
      obj.baseIDs = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<CacheItem>, I>>(base?: I): CacheItem {
    return CacheItem.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<CacheItem>, I>>(object: I): CacheItem {
    const message = createBaseCacheItem();
    message.id = object.id ?? "";
    message.bodyHash = object.bodyHash ?? "";
    message.cachedResult = object.cachedResult ?? "";
    message.timestamp = object.timestamp ?? 0;
    message.baseIDs = object.baseIDs?.map((e) => e) || [];
    return message;
  },
};

function createBaseCacheCheckResp(): CacheCheckResp {
  return { status: 0, cachedResult: undefined };
}

export const CacheCheckResp = {
  encode(message: CacheCheckResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    if (message.cachedResult !== undefined) {
      CacheItem.encode(message.cachedResult, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): CacheCheckResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCacheCheckResp();
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

          message.cachedResult = CacheItem.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): CacheCheckResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      cachedResult: isSet(object.cachedResult) ? CacheItem.fromJSON(object.cachedResult) : undefined,
    };
  },

  toJSON(message: CacheCheckResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    message.cachedResult !== undefined &&
      (obj.cachedResult = message.cachedResult ? CacheItem.toJSON(message.cachedResult) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<CacheCheckResp>, I>>(base?: I): CacheCheckResp {
    return CacheCheckResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<CacheCheckResp>, I>>(object: I): CacheCheckResp {
    const message = createBaseCacheCheckResp();
    message.status = object.status ?? 0;
    message.cachedResult = (object.cachedResult !== undefined && object.cachedResult !== null)
      ? CacheItem.fromPartial(object.cachedResult)
      : undefined;
    return message;
  },
};

declare var self: any | undefined;
declare var window: any | undefined;
declare var global: any | undefined;
var tsProtoGlobalThis: any = (() => {
  if (typeof globalThis !== "undefined") {
    return globalThis;
  }
  if (typeof self !== "undefined") {
    return self;
  }
  if (typeof window !== "undefined") {
    return window;
  }
  if (typeof global !== "undefined") {
    return global;
  }
  throw "Unable to locate global object";
})();

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin ? T
  : T extends Array<infer U> ? Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & { [K in Exclude<keyof I, KeysOfUnion<P>>]: never };

function longToNumber(long: Long): number {
  if (long.gt(Number.MAX_SAFE_INTEGER)) {
    throw new tsProtoGlobalThis.Error("Value is larger than Number.MAX_SAFE_INTEGER");
  }
  return long.toNumber();
}

// If you get a compile-error about 'Constructor<Long> and ... have no overlap',
// add '--ts_proto_opt=esModuleInterop=true' as a flag when calling 'protoc'.
if (_m0.util.Long !== Long) {
  _m0.util.Long = Long as any;
  _m0.configure();
}

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
