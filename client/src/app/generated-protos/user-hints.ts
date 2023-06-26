/* eslint-disable */
import * as _m0 from "protobufjs/minimal";

export const protobufPackage = "";

export interface UserHints {
  enabled: boolean;
  dismissedHints: string[];
}

function createBaseUserHints(): UserHints {
  return { enabled: false, dismissedHints: [] };
}

export const UserHints = {
  encode(message: UserHints, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.enabled === true) {
      writer.uint32(8).bool(message.enabled);
    }
    for (const v of message.dismissedHints) {
      writer.uint32(18).string(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserHints {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserHints();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.enabled = reader.bool();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.dismissedHints.push(reader.string());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): UserHints {
    return {
      enabled: isSet(object.enabled) ? Boolean(object.enabled) : false,
      dismissedHints: Array.isArray(object?.dismissedHints) ? object.dismissedHints.map((e: any) => String(e)) : [],
    };
  },

  toJSON(message: UserHints): unknown {
    const obj: any = {};
    message.enabled !== undefined && (obj.enabled = message.enabled);
    if (message.dismissedHints) {
      obj.dismissedHints = message.dismissedHints.map((e) => e);
    } else {
      obj.dismissedHints = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<UserHints>, I>>(base?: I): UserHints {
    return UserHints.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserHints>, I>>(object: I): UserHints {
    const message = createBaseUserHints();
    message.enabled = object.enabled ?? false;
    message.dismissedHints = object.dismissedHints?.map((e) => e) || [];
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
