/* eslint-disable */
import * as Long from "long";
import * as _m0 from "protobufjs/minimal";
import { Ownership } from "./ownership-access";

export const protobufPackage = "";

export interface DataModule {
  id: string;
  name: string;
  comments: string;
  owner: Ownership | undefined;
}

export interface DataModuleVersion {
  version: string;
  tags: string[];
  comments: string;
  timeStampUnixSec: number;
  /** DOIMetadata doiMetadata = 6; */
  sourceCode: string;
}

function createBaseDataModule(): DataModule {
  return { id: "", name: "", comments: "", owner: undefined };
}

export const DataModule = {
  encode(message: DataModule, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    if (message.name !== "") {
      writer.uint32(18).string(message.name);
    }
    if (message.comments !== "") {
      writer.uint32(26).string(message.comments);
    }
    if (message.owner !== undefined) {
      Ownership.encode(message.owner, writer.uint32(34).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DataModule {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDataModule();
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

          message.name = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.comments = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.owner = Ownership.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): DataModule {
    return {
      id: isSet(object.id) ? String(object.id) : "",
      name: isSet(object.name) ? String(object.name) : "",
      comments: isSet(object.comments) ? String(object.comments) : "",
      owner: isSet(object.owner) ? Ownership.fromJSON(object.owner) : undefined,
    };
  },

  toJSON(message: DataModule): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    message.name !== undefined && (obj.name = message.name);
    message.comments !== undefined && (obj.comments = message.comments);
    message.owner !== undefined && (obj.owner = message.owner ? Ownership.toJSON(message.owner) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<DataModule>, I>>(base?: I): DataModule {
    return DataModule.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DataModule>, I>>(object: I): DataModule {
    const message = createBaseDataModule();
    message.id = object.id ?? "";
    message.name = object.name ?? "";
    message.comments = object.comments ?? "";
    message.owner = (object.owner !== undefined && object.owner !== null)
      ? Ownership.fromPartial(object.owner)
      : undefined;
    return message;
  },
};

function createBaseDataModuleVersion(): DataModuleVersion {
  return { version: "", tags: [], comments: "", timeStampUnixSec: 0, sourceCode: "" };
}

export const DataModuleVersion = {
  encode(message: DataModuleVersion, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.version !== "") {
      writer.uint32(10).string(message.version);
    }
    for (const v of message.tags) {
      writer.uint32(18).string(v!);
    }
    if (message.comments !== "") {
      writer.uint32(26).string(message.comments);
    }
    if (message.timeStampUnixSec !== 0) {
      writer.uint32(32).uint64(message.timeStampUnixSec);
    }
    if (message.sourceCode !== "") {
      writer.uint32(42).string(message.sourceCode);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DataModuleVersion {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDataModuleVersion();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.version = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.tags.push(reader.string());
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.comments = reader.string();
          continue;
        case 4:
          if (tag !== 32) {
            break;
          }

          message.timeStampUnixSec = longToNumber(reader.uint64() as Long);
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.sourceCode = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): DataModuleVersion {
    return {
      version: isSet(object.version) ? String(object.version) : "",
      tags: Array.isArray(object?.tags) ? object.tags.map((e: any) => String(e)) : [],
      comments: isSet(object.comments) ? String(object.comments) : "",
      timeStampUnixSec: isSet(object.timeStampUnixSec) ? Number(object.timeStampUnixSec) : 0,
      sourceCode: isSet(object.sourceCode) ? String(object.sourceCode) : "",
    };
  },

  toJSON(message: DataModuleVersion): unknown {
    const obj: any = {};
    message.version !== undefined && (obj.version = message.version);
    if (message.tags) {
      obj.tags = message.tags.map((e) => e);
    } else {
      obj.tags = [];
    }
    message.comments !== undefined && (obj.comments = message.comments);
    message.timeStampUnixSec !== undefined && (obj.timeStampUnixSec = Math.round(message.timeStampUnixSec));
    message.sourceCode !== undefined && (obj.sourceCode = message.sourceCode);
    return obj;
  },

  create<I extends Exact<DeepPartial<DataModuleVersion>, I>>(base?: I): DataModuleVersion {
    return DataModuleVersion.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DataModuleVersion>, I>>(object: I): DataModuleVersion {
    const message = createBaseDataModuleVersion();
    message.version = object.version ?? "";
    message.tags = object.tags?.map((e) => e) || [];
    message.comments = object.comments ?? "";
    message.timeStampUnixSec = object.timeStampUnixSec ?? 0;
    message.sourceCode = object.sourceCode ?? "";
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
