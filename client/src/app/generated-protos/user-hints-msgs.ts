/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { ResponseStatus, responseStatusFromJSON, responseStatusToJSON } from "./response";
import { UserHints } from "./user-hints";

export const protobufPackage = "";

export interface UserHintsReq {
}

export interface UserHintsResp {
  status: ResponseStatus;
  hints: UserHints | undefined;
}

export interface UserHintsUpd {
  hints: UserHints | undefined;
}

/** Dismissing a hint should publish a UserHintsUpd */
export interface UserDismissHintReq {
  hint: string;
}

export interface UserDismissHintResp {
  status: ResponseStatus;
}

/** Re-enabling hints should publish a UserHintsUpd */
export interface UserHintsToggleReq {
  enabled: boolean;
}

export interface UserHintsToggleResp {
  status: ResponseStatus;
}

function createBaseUserHintsReq(): UserHintsReq {
  return {};
}

export const UserHintsReq = {
  encode(_: UserHintsReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserHintsReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserHintsReq();
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

  fromJSON(_: any): UserHintsReq {
    return {};
  },

  toJSON(_: UserHintsReq): unknown {
    const obj: any = {};
    return obj;
  },

  create<I extends Exact<DeepPartial<UserHintsReq>, I>>(base?: I): UserHintsReq {
    return UserHintsReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserHintsReq>, I>>(_: I): UserHintsReq {
    const message = createBaseUserHintsReq();
    return message;
  },
};

function createBaseUserHintsResp(): UserHintsResp {
  return { status: 0, hints: undefined };
}

export const UserHintsResp = {
  encode(message: UserHintsResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    if (message.hints !== undefined) {
      UserHints.encode(message.hints, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserHintsResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserHintsResp();
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

          message.hints = UserHints.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): UserHintsResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      hints: isSet(object.hints) ? UserHints.fromJSON(object.hints) : undefined,
    };
  },

  toJSON(message: UserHintsResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    message.hints !== undefined && (obj.hints = message.hints ? UserHints.toJSON(message.hints) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<UserHintsResp>, I>>(base?: I): UserHintsResp {
    return UserHintsResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserHintsResp>, I>>(object: I): UserHintsResp {
    const message = createBaseUserHintsResp();
    message.status = object.status ?? 0;
    message.hints = (object.hints !== undefined && object.hints !== null)
      ? UserHints.fromPartial(object.hints)
      : undefined;
    return message;
  },
};

function createBaseUserHintsUpd(): UserHintsUpd {
  return { hints: undefined };
}

export const UserHintsUpd = {
  encode(message: UserHintsUpd, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.hints !== undefined) {
      UserHints.encode(message.hints, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserHintsUpd {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserHintsUpd();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.hints = UserHints.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): UserHintsUpd {
    return { hints: isSet(object.hints) ? UserHints.fromJSON(object.hints) : undefined };
  },

  toJSON(message: UserHintsUpd): unknown {
    const obj: any = {};
    message.hints !== undefined && (obj.hints = message.hints ? UserHints.toJSON(message.hints) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<UserHintsUpd>, I>>(base?: I): UserHintsUpd {
    return UserHintsUpd.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserHintsUpd>, I>>(object: I): UserHintsUpd {
    const message = createBaseUserHintsUpd();
    message.hints = (object.hints !== undefined && object.hints !== null)
      ? UserHints.fromPartial(object.hints)
      : undefined;
    return message;
  },
};

function createBaseUserDismissHintReq(): UserDismissHintReq {
  return { hint: "" };
}

export const UserDismissHintReq = {
  encode(message: UserDismissHintReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.hint !== "") {
      writer.uint32(10).string(message.hint);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserDismissHintReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserDismissHintReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.hint = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): UserDismissHintReq {
    return { hint: isSet(object.hint) ? String(object.hint) : "" };
  },

  toJSON(message: UserDismissHintReq): unknown {
    const obj: any = {};
    message.hint !== undefined && (obj.hint = message.hint);
    return obj;
  },

  create<I extends Exact<DeepPartial<UserDismissHintReq>, I>>(base?: I): UserDismissHintReq {
    return UserDismissHintReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserDismissHintReq>, I>>(object: I): UserDismissHintReq {
    const message = createBaseUserDismissHintReq();
    message.hint = object.hint ?? "";
    return message;
  },
};

function createBaseUserDismissHintResp(): UserDismissHintResp {
  return { status: 0 };
}

export const UserDismissHintResp = {
  encode(message: UserDismissHintResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserDismissHintResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserDismissHintResp();
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

  fromJSON(object: any): UserDismissHintResp {
    return { status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0 };
  },

  toJSON(message: UserDismissHintResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    return obj;
  },

  create<I extends Exact<DeepPartial<UserDismissHintResp>, I>>(base?: I): UserDismissHintResp {
    return UserDismissHintResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserDismissHintResp>, I>>(object: I): UserDismissHintResp {
    const message = createBaseUserDismissHintResp();
    message.status = object.status ?? 0;
    return message;
  },
};

function createBaseUserHintsToggleReq(): UserHintsToggleReq {
  return { enabled: false };
}

export const UserHintsToggleReq = {
  encode(message: UserHintsToggleReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.enabled === true) {
      writer.uint32(8).bool(message.enabled);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserHintsToggleReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserHintsToggleReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.enabled = reader.bool();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): UserHintsToggleReq {
    return { enabled: isSet(object.enabled) ? Boolean(object.enabled) : false };
  },

  toJSON(message: UserHintsToggleReq): unknown {
    const obj: any = {};
    message.enabled !== undefined && (obj.enabled = message.enabled);
    return obj;
  },

  create<I extends Exact<DeepPartial<UserHintsToggleReq>, I>>(base?: I): UserHintsToggleReq {
    return UserHintsToggleReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserHintsToggleReq>, I>>(object: I): UserHintsToggleReq {
    const message = createBaseUserHintsToggleReq();
    message.enabled = object.enabled ?? false;
    return message;
  },
};

function createBaseUserHintsToggleResp(): UserHintsToggleResp {
  return { status: 0 };
}

export const UserHintsToggleResp = {
  encode(message: UserHintsToggleResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserHintsToggleResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserHintsToggleResp();
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

  fromJSON(object: any): UserHintsToggleResp {
    return { status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0 };
  },

  toJSON(message: UserHintsToggleResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    return obj;
  },

  create<I extends Exact<DeepPartial<UserHintsToggleResp>, I>>(base?: I): UserHintsToggleResp {
    return UserHintsToggleResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserHintsToggleResp>, I>>(object: I): UserHintsToggleResp {
    const message = createBaseUserHintsToggleResp();
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
