/* eslint-disable */
import * as Long from "long";
import * as _m0 from "protobufjs/minimal";
import { UserInfo } from "./user";

export const protobufPackage = "";

export interface Ownership {
  creator:
    | UserInfo
    | undefined;
  /** Maybe this should be in a separate structure?? */
  createdUnixSec: number;
  modifiedUnixSec: number;
}

/**
 * Access - who is allowed to access a given resource
 * This should contain all groups/user IDs who are allowed
 * to view or edit whatever object this field is on
 */
export interface AccessControl {
  viewers: string;
  editors: string;
}

function createBaseOwnership(): Ownership {
  return { creator: undefined, createdUnixSec: 0, modifiedUnixSec: 0 };
}

export const Ownership = {
  encode(message: Ownership, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.creator !== undefined) {
      UserInfo.encode(message.creator, writer.uint32(10).fork()).ldelim();
    }
    if (message.createdUnixSec !== 0) {
      writer.uint32(16).uint64(message.createdUnixSec);
    }
    if (message.modifiedUnixSec !== 0) {
      writer.uint32(24).uint64(message.modifiedUnixSec);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Ownership {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseOwnership();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.creator = UserInfo.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.createdUnixSec = longToNumber(reader.uint64() as Long);
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.modifiedUnixSec = longToNumber(reader.uint64() as Long);
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Ownership {
    return {
      creator: isSet(object.creator) ? UserInfo.fromJSON(object.creator) : undefined,
      createdUnixSec: isSet(object.createdUnixSec) ? Number(object.createdUnixSec) : 0,
      modifiedUnixSec: isSet(object.modifiedUnixSec) ? Number(object.modifiedUnixSec) : 0,
    };
  },

  toJSON(message: Ownership): unknown {
    const obj: any = {};
    message.creator !== undefined && (obj.creator = message.creator ? UserInfo.toJSON(message.creator) : undefined);
    message.createdUnixSec !== undefined && (obj.createdUnixSec = Math.round(message.createdUnixSec));
    message.modifiedUnixSec !== undefined && (obj.modifiedUnixSec = Math.round(message.modifiedUnixSec));
    return obj;
  },

  create<I extends Exact<DeepPartial<Ownership>, I>>(base?: I): Ownership {
    return Ownership.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<Ownership>, I>>(object: I): Ownership {
    const message = createBaseOwnership();
    message.creator = (object.creator !== undefined && object.creator !== null)
      ? UserInfo.fromPartial(object.creator)
      : undefined;
    message.createdUnixSec = object.createdUnixSec ?? 0;
    message.modifiedUnixSec = object.modifiedUnixSec ?? 0;
    return message;
  },
};

function createBaseAccessControl(): AccessControl {
  return { viewers: "", editors: "" };
}

export const AccessControl = {
  encode(message: AccessControl, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.viewers !== "") {
      writer.uint32(10).string(message.viewers);
    }
    if (message.editors !== "") {
      writer.uint32(18).string(message.editors);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): AccessControl {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAccessControl();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.viewers = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.editors = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): AccessControl {
    return {
      viewers: isSet(object.viewers) ? String(object.viewers) : "",
      editors: isSet(object.editors) ? String(object.editors) : "",
    };
  },

  toJSON(message: AccessControl): unknown {
    const obj: any = {};
    message.viewers !== undefined && (obj.viewers = message.viewers);
    message.editors !== undefined && (obj.editors = message.editors);
    return obj;
  },

  create<I extends Exact<DeepPartial<AccessControl>, I>>(base?: I): AccessControl {
    return AccessControl.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<AccessControl>, I>>(object: I): AccessControl {
    const message = createBaseAccessControl();
    message.viewers = object.viewers ?? "";
    message.editors = object.editors ?? "";
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
