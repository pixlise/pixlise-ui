/* eslint-disable */
import * as Long from "long";
import * as _m0 from "protobufjs/minimal";

export const protobufPackage = "";

export enum NotificationMethod {
  NOTIF_NONE = 0,
  NOTIF_EMAIL = 1,
  NOTIF_UI = 2,
  NOTIF_BOTH = 3,
  UNRECOGNIZED = -1,
}

export function notificationMethodFromJSON(object: any): NotificationMethod {
  switch (object) {
    case 0:
    case "NOTIF_NONE":
      return NotificationMethod.NOTIF_NONE;
    case 1:
    case "NOTIF_EMAIL":
      return NotificationMethod.NOTIF_EMAIL;
    case 2:
    case "NOTIF_UI":
      return NotificationMethod.NOTIF_UI;
    case 3:
    case "NOTIF_BOTH":
      return NotificationMethod.NOTIF_BOTH;
    case -1:
    case "UNRECOGNIZED":
    default:
      return NotificationMethod.UNRECOGNIZED;
  }
}

export function notificationMethodToJSON(object: NotificationMethod): string {
  switch (object) {
    case NotificationMethod.NOTIF_NONE:
      return "NOTIF_NONE";
    case NotificationMethod.NOTIF_EMAIL:
      return "NOTIF_EMAIL";
    case NotificationMethod.NOTIF_UI:
      return "NOTIF_UI";
    case NotificationMethod.NOTIF_BOTH:
      return "NOTIF_BOTH";
    case NotificationMethod.UNRECOGNIZED:
    default:
      return "UNRECOGNIZED";
  }
}

export interface UserNotificationSettings {
  userQuantComplete: NotificationMethod;
  quantShared: NotificationMethod;
  newDataset: NotificationMethod;
  updatedDataset: NotificationMethod;
  imageAddedToDataset: NotificationMethod;
  majorModuleReleased: NotificationMethod;
  minorModuleReleased: NotificationMethod;
}

export interface UserNotification {
  /** The subject (shown on UI banner or email subject) */
  subject: string;
  /** The contents (if user clicks on banner, or email body) */
  contents: string;
  /** Shows where the notification came from */
  from: string;
  timeStampUnixSec: number;
}

function createBaseUserNotificationSettings(): UserNotificationSettings {
  return {
    userQuantComplete: 0,
    quantShared: 0,
    newDataset: 0,
    updatedDataset: 0,
    imageAddedToDataset: 0,
    majorModuleReleased: 0,
    minorModuleReleased: 0,
  };
}

export const UserNotificationSettings = {
  encode(message: UserNotificationSettings, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.userQuantComplete !== 0) {
      writer.uint32(8).int32(message.userQuantComplete);
    }
    if (message.quantShared !== 0) {
      writer.uint32(16).int32(message.quantShared);
    }
    if (message.newDataset !== 0) {
      writer.uint32(24).int32(message.newDataset);
    }
    if (message.updatedDataset !== 0) {
      writer.uint32(32).int32(message.updatedDataset);
    }
    if (message.imageAddedToDataset !== 0) {
      writer.uint32(40).int32(message.imageAddedToDataset);
    }
    if (message.majorModuleReleased !== 0) {
      writer.uint32(48).int32(message.majorModuleReleased);
    }
    if (message.minorModuleReleased !== 0) {
      writer.uint32(56).int32(message.minorModuleReleased);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserNotificationSettings {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserNotificationSettings();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.userQuantComplete = reader.int32() as any;
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.quantShared = reader.int32() as any;
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.newDataset = reader.int32() as any;
          continue;
        case 4:
          if (tag !== 32) {
            break;
          }

          message.updatedDataset = reader.int32() as any;
          continue;
        case 5:
          if (tag !== 40) {
            break;
          }

          message.imageAddedToDataset = reader.int32() as any;
          continue;
        case 6:
          if (tag !== 48) {
            break;
          }

          message.majorModuleReleased = reader.int32() as any;
          continue;
        case 7:
          if (tag !== 56) {
            break;
          }

          message.minorModuleReleased = reader.int32() as any;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): UserNotificationSettings {
    return {
      userQuantComplete: isSet(object.userQuantComplete) ? notificationMethodFromJSON(object.userQuantComplete) : 0,
      quantShared: isSet(object.quantShared) ? notificationMethodFromJSON(object.quantShared) : 0,
      newDataset: isSet(object.newDataset) ? notificationMethodFromJSON(object.newDataset) : 0,
      updatedDataset: isSet(object.updatedDataset) ? notificationMethodFromJSON(object.updatedDataset) : 0,
      imageAddedToDataset: isSet(object.imageAddedToDataset)
        ? notificationMethodFromJSON(object.imageAddedToDataset)
        : 0,
      majorModuleReleased: isSet(object.majorModuleReleased)
        ? notificationMethodFromJSON(object.majorModuleReleased)
        : 0,
      minorModuleReleased: isSet(object.minorModuleReleased)
        ? notificationMethodFromJSON(object.minorModuleReleased)
        : 0,
    };
  },

  toJSON(message: UserNotificationSettings): unknown {
    const obj: any = {};
    message.userQuantComplete !== undefined &&
      (obj.userQuantComplete = notificationMethodToJSON(message.userQuantComplete));
    message.quantShared !== undefined && (obj.quantShared = notificationMethodToJSON(message.quantShared));
    message.newDataset !== undefined && (obj.newDataset = notificationMethodToJSON(message.newDataset));
    message.updatedDataset !== undefined && (obj.updatedDataset = notificationMethodToJSON(message.updatedDataset));
    message.imageAddedToDataset !== undefined &&
      (obj.imageAddedToDataset = notificationMethodToJSON(message.imageAddedToDataset));
    message.majorModuleReleased !== undefined &&
      (obj.majorModuleReleased = notificationMethodToJSON(message.majorModuleReleased));
    message.minorModuleReleased !== undefined &&
      (obj.minorModuleReleased = notificationMethodToJSON(message.minorModuleReleased));
    return obj;
  },

  create<I extends Exact<DeepPartial<UserNotificationSettings>, I>>(base?: I): UserNotificationSettings {
    return UserNotificationSettings.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserNotificationSettings>, I>>(object: I): UserNotificationSettings {
    const message = createBaseUserNotificationSettings();
    message.userQuantComplete = object.userQuantComplete ?? 0;
    message.quantShared = object.quantShared ?? 0;
    message.newDataset = object.newDataset ?? 0;
    message.updatedDataset = object.updatedDataset ?? 0;
    message.imageAddedToDataset = object.imageAddedToDataset ?? 0;
    message.majorModuleReleased = object.majorModuleReleased ?? 0;
    message.minorModuleReleased = object.minorModuleReleased ?? 0;
    return message;
  },
};

function createBaseUserNotification(): UserNotification {
  return { subject: "", contents: "", from: "", timeStampUnixSec: 0 };
}

export const UserNotification = {
  encode(message: UserNotification, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.subject !== "") {
      writer.uint32(10).string(message.subject);
    }
    if (message.contents !== "") {
      writer.uint32(18).string(message.contents);
    }
    if (message.from !== "") {
      writer.uint32(26).string(message.from);
    }
    if (message.timeStampUnixSec !== 0) {
      writer.uint32(32).uint64(message.timeStampUnixSec);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserNotification {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserNotification();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.subject = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.contents = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.from = reader.string();
          continue;
        case 4:
          if (tag !== 32) {
            break;
          }

          message.timeStampUnixSec = longToNumber(reader.uint64() as Long);
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): UserNotification {
    return {
      subject: isSet(object.subject) ? String(object.subject) : "",
      contents: isSet(object.contents) ? String(object.contents) : "",
      from: isSet(object.from) ? String(object.from) : "",
      timeStampUnixSec: isSet(object.timeStampUnixSec) ? Number(object.timeStampUnixSec) : 0,
    };
  },

  toJSON(message: UserNotification): unknown {
    const obj: any = {};
    message.subject !== undefined && (obj.subject = message.subject);
    message.contents !== undefined && (obj.contents = message.contents);
    message.from !== undefined && (obj.from = message.from);
    message.timeStampUnixSec !== undefined && (obj.timeStampUnixSec = Math.round(message.timeStampUnixSec));
    return obj;
  },

  create<I extends Exact<DeepPartial<UserNotification>, I>>(base?: I): UserNotification {
    return UserNotification.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserNotification>, I>>(object: I): UserNotification {
    const message = createBaseUserNotification();
    message.subject = object.subject ?? "";
    message.contents = object.contents ?? "";
    message.from = object.from ?? "";
    message.timeStampUnixSec = object.timeStampUnixSec ?? 0;
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
