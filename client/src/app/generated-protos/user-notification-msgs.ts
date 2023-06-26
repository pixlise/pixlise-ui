/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { ResponseStatus, responseStatusFromJSON, responseStatusToJSON } from "./response";
import { UserNotification } from "./user-notification-settings";

export const protobufPackage = "";

export interface UserNotificationReq {
}

export interface UserNotificationResp {
  status: ResponseStatus;
  notifications: UserNotification[];
}

export interface UserNotificationUpd {
  notification: UserNotification | undefined;
}

/** Admin-only feature, to send out a notification to all users */
export interface SendUserNotificationReq {
  /** Who to send to - user IDs or group IDs */
  users: string[];
  notification: UserNotification | undefined;
}

export interface SendUserNotificationResp {
  status: ResponseStatus;
}

function createBaseUserNotificationReq(): UserNotificationReq {
  return {};
}

export const UserNotificationReq = {
  encode(_: UserNotificationReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserNotificationReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserNotificationReq();
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

  fromJSON(_: any): UserNotificationReq {
    return {};
  },

  toJSON(_: UserNotificationReq): unknown {
    const obj: any = {};
    return obj;
  },

  create<I extends Exact<DeepPartial<UserNotificationReq>, I>>(base?: I): UserNotificationReq {
    return UserNotificationReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserNotificationReq>, I>>(_: I): UserNotificationReq {
    const message = createBaseUserNotificationReq();
    return message;
  },
};

function createBaseUserNotificationResp(): UserNotificationResp {
  return { status: 0, notifications: [] };
}

export const UserNotificationResp = {
  encode(message: UserNotificationResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    for (const v of message.notifications) {
      UserNotification.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserNotificationResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserNotificationResp();
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

          message.notifications.push(UserNotification.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): UserNotificationResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      notifications: Array.isArray(object?.notifications)
        ? object.notifications.map((e: any) => UserNotification.fromJSON(e))
        : [],
    };
  },

  toJSON(message: UserNotificationResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    if (message.notifications) {
      obj.notifications = message.notifications.map((e) => e ? UserNotification.toJSON(e) : undefined);
    } else {
      obj.notifications = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<UserNotificationResp>, I>>(base?: I): UserNotificationResp {
    return UserNotificationResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserNotificationResp>, I>>(object: I): UserNotificationResp {
    const message = createBaseUserNotificationResp();
    message.status = object.status ?? 0;
    message.notifications = object.notifications?.map((e) => UserNotification.fromPartial(e)) || [];
    return message;
  },
};

function createBaseUserNotificationUpd(): UserNotificationUpd {
  return { notification: undefined };
}

export const UserNotificationUpd = {
  encode(message: UserNotificationUpd, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.notification !== undefined) {
      UserNotification.encode(message.notification, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserNotificationUpd {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserNotificationUpd();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 2:
          if (tag !== 18) {
            break;
          }

          message.notification = UserNotification.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): UserNotificationUpd {
    return { notification: isSet(object.notification) ? UserNotification.fromJSON(object.notification) : undefined };
  },

  toJSON(message: UserNotificationUpd): unknown {
    const obj: any = {};
    message.notification !== undefined &&
      (obj.notification = message.notification ? UserNotification.toJSON(message.notification) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<UserNotificationUpd>, I>>(base?: I): UserNotificationUpd {
    return UserNotificationUpd.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserNotificationUpd>, I>>(object: I): UserNotificationUpd {
    const message = createBaseUserNotificationUpd();
    message.notification = (object.notification !== undefined && object.notification !== null)
      ? UserNotification.fromPartial(object.notification)
      : undefined;
    return message;
  },
};

function createBaseSendUserNotificationReq(): SendUserNotificationReq {
  return { users: [], notification: undefined };
}

export const SendUserNotificationReq = {
  encode(message: SendUserNotificationReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.users) {
      writer.uint32(10).string(v!);
    }
    if (message.notification !== undefined) {
      UserNotification.encode(message.notification, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SendUserNotificationReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSendUserNotificationReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.users.push(reader.string());
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.notification = UserNotification.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): SendUserNotificationReq {
    return {
      users: Array.isArray(object?.users) ? object.users.map((e: any) => String(e)) : [],
      notification: isSet(object.notification) ? UserNotification.fromJSON(object.notification) : undefined,
    };
  },

  toJSON(message: SendUserNotificationReq): unknown {
    const obj: any = {};
    if (message.users) {
      obj.users = message.users.map((e) => e);
    } else {
      obj.users = [];
    }
    message.notification !== undefined &&
      (obj.notification = message.notification ? UserNotification.toJSON(message.notification) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<SendUserNotificationReq>, I>>(base?: I): SendUserNotificationReq {
    return SendUserNotificationReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SendUserNotificationReq>, I>>(object: I): SendUserNotificationReq {
    const message = createBaseSendUserNotificationReq();
    message.users = object.users?.map((e) => e) || [];
    message.notification = (object.notification !== undefined && object.notification !== null)
      ? UserNotification.fromPartial(object.notification)
      : undefined;
    return message;
  },
};

function createBaseSendUserNotificationResp(): SendUserNotificationResp {
  return { status: 0 };
}

export const SendUserNotificationResp = {
  encode(message: SendUserNotificationResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SendUserNotificationResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSendUserNotificationResp();
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

  fromJSON(object: any): SendUserNotificationResp {
    return { status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0 };
  },

  toJSON(message: SendUserNotificationResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    return obj;
  },

  create<I extends Exact<DeepPartial<SendUserNotificationResp>, I>>(base?: I): SendUserNotificationResp {
    return SendUserNotificationResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SendUserNotificationResp>, I>>(object: I): SendUserNotificationResp {
    const message = createBaseSendUserNotificationResp();
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
