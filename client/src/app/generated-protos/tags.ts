/* eslint-disable */
import * as Long from "long";
import * as _m0 from "protobufjs/minimal";
import { Ownership } from "./ownership-access";

export const protobufPackage = "";

export interface Tag {
  id: string;
  name: string;
  owner: Ownership | undefined;
  createTimeUnixSec: number;
  type: string;
  datasetID: string;
}

function createBaseTag(): Tag {
  return { id: "", name: "", owner: undefined, createTimeUnixSec: 0, type: "", datasetID: "" };
}

export const Tag = {
  encode(message: Tag, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    if (message.name !== "") {
      writer.uint32(18).string(message.name);
    }
    if (message.owner !== undefined) {
      Ownership.encode(message.owner, writer.uint32(26).fork()).ldelim();
    }
    if (message.createTimeUnixSec !== 0) {
      writer.uint32(32).uint64(message.createTimeUnixSec);
    }
    if (message.type !== "") {
      writer.uint32(42).string(message.type);
    }
    if (message.datasetID !== "") {
      writer.uint32(50).string(message.datasetID);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Tag {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTag();
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

          message.owner = Ownership.decode(reader, reader.uint32());
          continue;
        case 4:
          if (tag !== 32) {
            break;
          }

          message.createTimeUnixSec = longToNumber(reader.uint64() as Long);
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.type = reader.string();
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.datasetID = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Tag {
    return {
      id: isSet(object.id) ? String(object.id) : "",
      name: isSet(object.name) ? String(object.name) : "",
      owner: isSet(object.owner) ? Ownership.fromJSON(object.owner) : undefined,
      createTimeUnixSec: isSet(object.createTimeUnixSec) ? Number(object.createTimeUnixSec) : 0,
      type: isSet(object.type) ? String(object.type) : "",
      datasetID: isSet(object.datasetID) ? String(object.datasetID) : "",
    };
  },

  toJSON(message: Tag): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    message.name !== undefined && (obj.name = message.name);
    message.owner !== undefined && (obj.owner = message.owner ? Ownership.toJSON(message.owner) : undefined);
    message.createTimeUnixSec !== undefined && (obj.createTimeUnixSec = Math.round(message.createTimeUnixSec));
    message.type !== undefined && (obj.type = message.type);
    message.datasetID !== undefined && (obj.datasetID = message.datasetID);
    return obj;
  },

  create<I extends Exact<DeepPartial<Tag>, I>>(base?: I): Tag {
    return Tag.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<Tag>, I>>(object: I): Tag {
    const message = createBaseTag();
    message.id = object.id ?? "";
    message.name = object.name ?? "";
    message.owner = (object.owner !== undefined && object.owner !== null)
      ? Ownership.fromPartial(object.owner)
      : undefined;
    message.createTimeUnixSec = object.createTimeUnixSec ?? 0;
    message.type = object.type ?? "";
    message.datasetID = object.datasetID ?? "";
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
