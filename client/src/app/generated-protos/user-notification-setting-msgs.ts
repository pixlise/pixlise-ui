/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { ResponseStatus, responseStatusFromJSON, responseStatusToJSON } from "./response";
import { UserNotificationSettings } from "./user-notification-settings";

export const protobufPackage = "";

/** Retrieving a users notification settings (NOT the notifications themselves) */
export interface UserNotificationSettingsReq {
}

export interface UserNotificationSettingsResp {
  status: ResponseStatus;
  notifications: UserNotificationSettings | undefined;
}

export interface UserNotificationSettingsUpd {
  notifications: UserNotificationSettings | undefined;
}

/** Modifying notifications should publish a UserNotificationSettingsUpd */
export interface UserNotificationSettingsWriteReq {
  notifications: UserNotificationSettings | undefined;
}

export interface UserNotificationSettingsWriteResp {
  status: ResponseStatus;
}

function createBaseUserNotificationSettingsReq(): UserNotificationSettingsReq {
  return {};
}

export const UserNotificationSettingsReq = {
  encode(_: UserNotificationSettingsReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserNotificationSettingsReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserNotificationSettingsReq();
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

  fromJSON(_: any): UserNotificationSettingsReq {
    return {};
  },

  toJSON(_: UserNotificationSettingsReq): unknown {
    const obj: any = {};
    return obj;
  },

  create<I extends Exact<DeepPartial<UserNotificationSettingsReq>, I>>(base?: I): UserNotificationSettingsReq {
    return UserNotificationSettingsReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserNotificationSettingsReq>, I>>(_: I): UserNotificationSettingsReq {
    const message = createBaseUserNotificationSettingsReq();
    return message;
  },
};

function createBaseUserNotificationSettingsResp(): UserNotificationSettingsResp {
  return { status: 0, notifications: undefined };
}

export const UserNotificationSettingsResp = {
  encode(message: UserNotificationSettingsResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    if (message.notifications !== undefined) {
      UserNotificationSettings.encode(message.notifications, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserNotificationSettingsResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserNotificationSettingsResp();
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

          message.notifications = UserNotificationSettings.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): UserNotificationSettingsResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      notifications: isSet(object.notifications) ? UserNotificationSettings.fromJSON(object.notifications) : undefined,
    };
  },

  toJSON(message: UserNotificationSettingsResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    message.notifications !== undefined &&
      (obj.notifications = message.notifications ? UserNotificationSettings.toJSON(message.notifications) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<UserNotificationSettingsResp>, I>>(base?: I): UserNotificationSettingsResp {
    return UserNotificationSettingsResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserNotificationSettingsResp>, I>>(object: I): UserNotificationSettingsResp {
    const message = createBaseUserNotificationSettingsResp();
    message.status = object.status ?? 0;
    message.notifications = (object.notifications !== undefined && object.notifications !== null)
      ? UserNotificationSettings.fromPartial(object.notifications)
      : undefined;
    return message;
  },
};

function createBaseUserNotificationSettingsUpd(): UserNotificationSettingsUpd {
  return { notifications: undefined };
}

export const UserNotificationSettingsUpd = {
  encode(message: UserNotificationSettingsUpd, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.notifications !== undefined) {
      UserNotificationSettings.encode(message.notifications, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserNotificationSettingsUpd {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserNotificationSettingsUpd();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.notifications = UserNotificationSettings.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): UserNotificationSettingsUpd {
    return {
      notifications: isSet(object.notifications) ? UserNotificationSettings.fromJSON(object.notifications) : undefined,
    };
  },

  toJSON(message: UserNotificationSettingsUpd): unknown {
    const obj: any = {};
    message.notifications !== undefined &&
      (obj.notifications = message.notifications ? UserNotificationSettings.toJSON(message.notifications) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<UserNotificationSettingsUpd>, I>>(base?: I): UserNotificationSettingsUpd {
    return UserNotificationSettingsUpd.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserNotificationSettingsUpd>, I>>(object: I): UserNotificationSettingsUpd {
    const message = createBaseUserNotificationSettingsUpd();
    message.notifications = (object.notifications !== undefined && object.notifications !== null)
      ? UserNotificationSettings.fromPartial(object.notifications)
      : undefined;
    return message;
  },
};

function createBaseUserNotificationSettingsWriteReq(): UserNotificationSettingsWriteReq {
  return { notifications: undefined };
}

export const UserNotificationSettingsWriteReq = {
  encode(message: UserNotificationSettingsWriteReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.notifications !== undefined) {
      UserNotificationSettings.encode(message.notifications, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserNotificationSettingsWriteReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserNotificationSettingsWriteReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.notifications = UserNotificationSettings.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): UserNotificationSettingsWriteReq {
    return {
      notifications: isSet(object.notifications) ? UserNotificationSettings.fromJSON(object.notifications) : undefined,
    };
  },

  toJSON(message: UserNotificationSettingsWriteReq): unknown {
    const obj: any = {};
    message.notifications !== undefined &&
      (obj.notifications = message.notifications ? UserNotificationSettings.toJSON(message.notifications) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<UserNotificationSettingsWriteReq>, I>>(
    base?: I,
  ): UserNotificationSettingsWriteReq {
    return UserNotificationSettingsWriteReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserNotificationSettingsWriteReq>, I>>(
    object: I,
  ): UserNotificationSettingsWriteReq {
    const message = createBaseUserNotificationSettingsWriteReq();
    message.notifications = (object.notifications !== undefined && object.notifications !== null)
      ? UserNotificationSettings.fromPartial(object.notifications)
      : undefined;
    return message;
  },
};

function createBaseUserNotificationSettingsWriteResp(): UserNotificationSettingsWriteResp {
  return { status: 0 };
}

export const UserNotificationSettingsWriteResp = {
  encode(message: UserNotificationSettingsWriteResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserNotificationSettingsWriteResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserNotificationSettingsWriteResp();
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

  fromJSON(object: any): UserNotificationSettingsWriteResp {
    return { status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0 };
  },

  toJSON(message: UserNotificationSettingsWriteResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    return obj;
  },

  create<I extends Exact<DeepPartial<UserNotificationSettingsWriteResp>, I>>(
    base?: I,
  ): UserNotificationSettingsWriteResp {
    return UserNotificationSettingsWriteResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserNotificationSettingsWriteResp>, I>>(
    object: I,
  ): UserNotificationSettingsWriteResp {
    const message = createBaseUserNotificationSettingsWriteResp();
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
