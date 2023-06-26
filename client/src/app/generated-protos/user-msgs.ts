/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { ResponseStatus, responseStatusFromJSON, responseStatusToJSON } from "./response";
import { UserDetails } from "./user";

export const protobufPackage = "";

export interface UserDetailsReq {
}

export interface UserDetailsResp {
  status: ResponseStatus;
  details: UserDetails | undefined;
}

export interface UserDetailsUpd {
  details: UserDetails | undefined;
}

/** Changing user details, this should publish a UserDetailsUpd */
export interface UserDetailsWriteReq {
  Details: UserDetails | undefined;
}

export interface UserDetailsWriteResp {
  status: ResponseStatus;
}

function createBaseUserDetailsReq(): UserDetailsReq {
  return {};
}

export const UserDetailsReq = {
  encode(_: UserDetailsReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserDetailsReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserDetailsReq();
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

  fromJSON(_: any): UserDetailsReq {
    return {};
  },

  toJSON(_: UserDetailsReq): unknown {
    const obj: any = {};
    return obj;
  },

  create<I extends Exact<DeepPartial<UserDetailsReq>, I>>(base?: I): UserDetailsReq {
    return UserDetailsReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserDetailsReq>, I>>(_: I): UserDetailsReq {
    const message = createBaseUserDetailsReq();
    return message;
  },
};

function createBaseUserDetailsResp(): UserDetailsResp {
  return { status: 0, details: undefined };
}

export const UserDetailsResp = {
  encode(message: UserDetailsResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    if (message.details !== undefined) {
      UserDetails.encode(message.details, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserDetailsResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserDetailsResp();
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

          message.details = UserDetails.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): UserDetailsResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      details: isSet(object.details) ? UserDetails.fromJSON(object.details) : undefined,
    };
  },

  toJSON(message: UserDetailsResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    message.details !== undefined && (obj.details = message.details ? UserDetails.toJSON(message.details) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<UserDetailsResp>, I>>(base?: I): UserDetailsResp {
    return UserDetailsResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserDetailsResp>, I>>(object: I): UserDetailsResp {
    const message = createBaseUserDetailsResp();
    message.status = object.status ?? 0;
    message.details = (object.details !== undefined && object.details !== null)
      ? UserDetails.fromPartial(object.details)
      : undefined;
    return message;
  },
};

function createBaseUserDetailsUpd(): UserDetailsUpd {
  return { details: undefined };
}

export const UserDetailsUpd = {
  encode(message: UserDetailsUpd, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.details !== undefined) {
      UserDetails.encode(message.details, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserDetailsUpd {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserDetailsUpd();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.details = UserDetails.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): UserDetailsUpd {
    return { details: isSet(object.details) ? UserDetails.fromJSON(object.details) : undefined };
  },

  toJSON(message: UserDetailsUpd): unknown {
    const obj: any = {};
    message.details !== undefined && (obj.details = message.details ? UserDetails.toJSON(message.details) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<UserDetailsUpd>, I>>(base?: I): UserDetailsUpd {
    return UserDetailsUpd.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserDetailsUpd>, I>>(object: I): UserDetailsUpd {
    const message = createBaseUserDetailsUpd();
    message.details = (object.details !== undefined && object.details !== null)
      ? UserDetails.fromPartial(object.details)
      : undefined;
    return message;
  },
};

function createBaseUserDetailsWriteReq(): UserDetailsWriteReq {
  return { Details: undefined };
}

export const UserDetailsWriteReq = {
  encode(message: UserDetailsWriteReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.Details !== undefined) {
      UserDetails.encode(message.Details, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserDetailsWriteReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserDetailsWriteReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.Details = UserDetails.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): UserDetailsWriteReq {
    return { Details: isSet(object.Details) ? UserDetails.fromJSON(object.Details) : undefined };
  },

  toJSON(message: UserDetailsWriteReq): unknown {
    const obj: any = {};
    message.Details !== undefined && (obj.Details = message.Details ? UserDetails.toJSON(message.Details) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<UserDetailsWriteReq>, I>>(base?: I): UserDetailsWriteReq {
    return UserDetailsWriteReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserDetailsWriteReq>, I>>(object: I): UserDetailsWriteReq {
    const message = createBaseUserDetailsWriteReq();
    message.Details = (object.Details !== undefined && object.Details !== null)
      ? UserDetails.fromPartial(object.Details)
      : undefined;
    return message;
  },
};

function createBaseUserDetailsWriteResp(): UserDetailsWriteResp {
  return { status: 0 };
}

export const UserDetailsWriteResp = {
  encode(message: UserDetailsWriteResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserDetailsWriteResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserDetailsWriteResp();
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

  fromJSON(object: any): UserDetailsWriteResp {
    return { status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0 };
  },

  toJSON(message: UserDetailsWriteResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    return obj;
  },

  create<I extends Exact<DeepPartial<UserDetailsWriteResp>, I>>(base?: I): UserDetailsWriteResp {
    return UserDetailsWriteResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserDetailsWriteResp>, I>>(object: I): UserDetailsWriteResp {
    const message = createBaseUserDetailsWriteResp();
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
