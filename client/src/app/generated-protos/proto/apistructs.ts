/* eslint-disable */
import * as _m0 from "protobufjs/minimal";

export const protobufPackage = "";

/** Replacement for HTTP status codes */
export enum ResponseStatus {
  OK = 0,
  NOT_FOUND = 1,
  BAD_REQUEST = 2,
  SERVER_ERROR = 3,
  UNRECOGNIZED = -1,
}

export function responseStatusFromJSON(object: any): ResponseStatus {
  switch (object) {
    case 0:
    case "OK":
      return ResponseStatus.OK;
    case 1:
    case "NOT_FOUND":
      return ResponseStatus.NOT_FOUND;
    case 2:
    case "BAD_REQUEST":
      return ResponseStatus.BAD_REQUEST;
    case 3:
    case "SERVER_ERROR":
      return ResponseStatus.SERVER_ERROR;
    case -1:
    case "UNRECOGNIZED":
    default:
      return ResponseStatus.UNRECOGNIZED;
  }
}

export function responseStatusToJSON(object: ResponseStatus): string {
  switch (object) {
    case ResponseStatus.OK:
      return "OK";
    case ResponseStatus.NOT_FOUND:
      return "NOT_FOUND";
    case ResponseStatus.BAD_REQUEST:
      return "BAD_REQUEST";
    case ResponseStatus.SERVER_ERROR:
      return "SERVER_ERROR";
    case ResponseStatus.UNRECOGNIZED:
    default:
      return "UNRECOGNIZED";
  }
}

/**
 * //////////////////////////////////
 * HTTP requests/responses
 * //////////////////////////////////
 */
export interface BeginWSConnectionResponse {
  connToken: string;
}

export interface VersionResponse {
  versions: VersionResponse_Version[];
}

export interface VersionResponse_Version {
  component: string;
  version: string;
}

/**
 * //////////////////////////////////
 * User details
 */
export interface UserDetailsReq {
}

export interface UserDetails {
  id: string;
  name: string;
  email: string;
  iconURL: string;
  dataCollectionVersion: string;
  hints: UserDetails_Hints | undefined;
  notifications: UserDetails_Notifications | undefined;
  permissions: string[];
}

export enum UserDetails_NotificationMethod {
  NONE = 0,
  EMAIL = 1,
  UI = 2,
  BOTH = 3,
  UNRECOGNIZED = -1,
}

export function userDetails_NotificationMethodFromJSON(object: any): UserDetails_NotificationMethod {
  switch (object) {
    case 0:
    case "NONE":
      return UserDetails_NotificationMethod.NONE;
    case 1:
    case "EMAIL":
      return UserDetails_NotificationMethod.EMAIL;
    case 2:
    case "UI":
      return UserDetails_NotificationMethod.UI;
    case 3:
    case "BOTH":
      return UserDetails_NotificationMethod.BOTH;
    case -1:
    case "UNRECOGNIZED":
    default:
      return UserDetails_NotificationMethod.UNRECOGNIZED;
  }
}

export function userDetails_NotificationMethodToJSON(object: UserDetails_NotificationMethod): string {
  switch (object) {
    case UserDetails_NotificationMethod.NONE:
      return "NONE";
    case UserDetails_NotificationMethod.EMAIL:
      return "EMAIL";
    case UserDetails_NotificationMethod.UI:
      return "UI";
    case UserDetails_NotificationMethod.BOTH:
      return "BOTH";
    case UserDetails_NotificationMethod.UNRECOGNIZED:
    default:
      return "UNRECOGNIZED";
  }
}

export interface UserDetails_Hints {
  enabled: boolean;
  dismissedHints: string[];
}

export interface UserDetails_Notifications {
  userQuantComplete: UserDetails_NotificationMethod;
  quantShared: UserDetails_NotificationMethod;
  newDataset: UserDetails_NotificationMethod;
  updatedDataset: UserDetails_NotificationMethod;
  imageAddedToDataset: UserDetails_NotificationMethod;
  majorModuleReleased: UserDetails_NotificationMethod;
  minorModuleReleased: UserDetails_NotificationMethod;
}

export interface UserDetailsResp {
  status: ResponseStatus;
  details: UserDetails | undefined;
}

export interface UserDetailsUpd {
  details: UserDetails | undefined;
}

export interface SetUserDetailsReq {
  Details: UserDetails | undefined;
}

export interface SetUserDetailsResp {
  status: ResponseStatus;
}

/**
 * //////////////////////////////////
 * Datasets
 */
export interface DatasetListReq {
  solFilter: string;
}

export interface DatasetItem {
  sol: string;
  rtt: string;
}

export interface DatasetListResp {
  status: ResponseStatus;
  datasets: DatasetItem[];
}

export interface DatasetReq {
  datasetID: string;
}

export interface DatasetResp {
  status: ResponseStatus;
  dataset: DatasetItem | undefined;
}

/**
 * //////////////////////////////////
 * The overall wrapper WSMessage
 */
export interface WSMessage {
  /**
   * Helps associate request and response:
   * Should be a number counting up for each request sent from client, responses should include the same number
   * Other messages can leave this empty
   */
  msgId: number;
  userDetailsReq?: UserDetailsReq | undefined;
  userDetailsResp?: UserDetailsResp | undefined;
  userDetailsUpd?: UserDetailsUpd | undefined;
  setUserDetailsReq?: SetUserDetailsReq | undefined;
  setUserDetailsResp?: SetUserDetailsResp | undefined;
  datasetListReq?: DatasetListReq | undefined;
  datasetListResp?: DatasetListResp | undefined;
  datasetReq?: DatasetReq | undefined;
  datasetResp?: DatasetResp | undefined;
}

function createBaseBeginWSConnectionResponse(): BeginWSConnectionResponse {
  return { connToken: "" };
}

export const BeginWSConnectionResponse = {
  encode(message: BeginWSConnectionResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.connToken !== "") {
      writer.uint32(10).string(message.connToken);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): BeginWSConnectionResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseBeginWSConnectionResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.connToken = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): BeginWSConnectionResponse {
    return { connToken: isSet(object.connToken) ? String(object.connToken) : "" };
  },

  toJSON(message: BeginWSConnectionResponse): unknown {
    const obj: any = {};
    message.connToken !== undefined && (obj.connToken = message.connToken);
    return obj;
  },

  create<I extends Exact<DeepPartial<BeginWSConnectionResponse>, I>>(base?: I): BeginWSConnectionResponse {
    return BeginWSConnectionResponse.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<BeginWSConnectionResponse>, I>>(object: I): BeginWSConnectionResponse {
    const message = createBaseBeginWSConnectionResponse();
    message.connToken = object.connToken ?? "";
    return message;
  },
};

function createBaseVersionResponse(): VersionResponse {
  return { versions: [] };
}

export const VersionResponse = {
  encode(message: VersionResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.versions) {
      VersionResponse_Version.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): VersionResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseVersionResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.versions.push(VersionResponse_Version.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): VersionResponse {
    return {
      versions: Array.isArray(object?.versions)
        ? object.versions.map((e: any) => VersionResponse_Version.fromJSON(e))
        : [],
    };
  },

  toJSON(message: VersionResponse): unknown {
    const obj: any = {};
    if (message.versions) {
      obj.versions = message.versions.map((e) => e ? VersionResponse_Version.toJSON(e) : undefined);
    } else {
      obj.versions = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<VersionResponse>, I>>(base?: I): VersionResponse {
    return VersionResponse.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<VersionResponse>, I>>(object: I): VersionResponse {
    const message = createBaseVersionResponse();
    message.versions = object.versions?.map((e) => VersionResponse_Version.fromPartial(e)) || [];
    return message;
  },
};

function createBaseVersionResponse_Version(): VersionResponse_Version {
  return { component: "", version: "" };
}

export const VersionResponse_Version = {
  encode(message: VersionResponse_Version, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.component !== "") {
      writer.uint32(10).string(message.component);
    }
    if (message.version !== "") {
      writer.uint32(18).string(message.version);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): VersionResponse_Version {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseVersionResponse_Version();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.component = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.version = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): VersionResponse_Version {
    return {
      component: isSet(object.component) ? String(object.component) : "",
      version: isSet(object.version) ? String(object.version) : "",
    };
  },

  toJSON(message: VersionResponse_Version): unknown {
    const obj: any = {};
    message.component !== undefined && (obj.component = message.component);
    message.version !== undefined && (obj.version = message.version);
    return obj;
  },

  create<I extends Exact<DeepPartial<VersionResponse_Version>, I>>(base?: I): VersionResponse_Version {
    return VersionResponse_Version.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<VersionResponse_Version>, I>>(object: I): VersionResponse_Version {
    const message = createBaseVersionResponse_Version();
    message.component = object.component ?? "";
    message.version = object.version ?? "";
    return message;
  },
};

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

function createBaseUserDetails(): UserDetails {
  return {
    id: "",
    name: "",
    email: "",
    iconURL: "",
    dataCollectionVersion: "",
    hints: undefined,
    notifications: undefined,
    permissions: [],
  };
}

export const UserDetails = {
  encode(message: UserDetails, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    if (message.name !== "") {
      writer.uint32(18).string(message.name);
    }
    if (message.email !== "") {
      writer.uint32(26).string(message.email);
    }
    if (message.iconURL !== "") {
      writer.uint32(34).string(message.iconURL);
    }
    if (message.dataCollectionVersion !== "") {
      writer.uint32(42).string(message.dataCollectionVersion);
    }
    if (message.hints !== undefined) {
      UserDetails_Hints.encode(message.hints, writer.uint32(50).fork()).ldelim();
    }
    if (message.notifications !== undefined) {
      UserDetails_Notifications.encode(message.notifications, writer.uint32(58).fork()).ldelim();
    }
    for (const v of message.permissions) {
      writer.uint32(66).string(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserDetails {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserDetails();
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

          message.email = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.iconURL = reader.string();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.dataCollectionVersion = reader.string();
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.hints = UserDetails_Hints.decode(reader, reader.uint32());
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.notifications = UserDetails_Notifications.decode(reader, reader.uint32());
          continue;
        case 8:
          if (tag !== 66) {
            break;
          }

          message.permissions.push(reader.string());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): UserDetails {
    return {
      id: isSet(object.id) ? String(object.id) : "",
      name: isSet(object.name) ? String(object.name) : "",
      email: isSet(object.email) ? String(object.email) : "",
      iconURL: isSet(object.iconURL) ? String(object.iconURL) : "",
      dataCollectionVersion: isSet(object.dataCollectionVersion) ? String(object.dataCollectionVersion) : "",
      hints: isSet(object.hints) ? UserDetails_Hints.fromJSON(object.hints) : undefined,
      notifications: isSet(object.notifications) ? UserDetails_Notifications.fromJSON(object.notifications) : undefined,
      permissions: Array.isArray(object?.permissions) ? object.permissions.map((e: any) => String(e)) : [],
    };
  },

  toJSON(message: UserDetails): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    message.name !== undefined && (obj.name = message.name);
    message.email !== undefined && (obj.email = message.email);
    message.iconURL !== undefined && (obj.iconURL = message.iconURL);
    message.dataCollectionVersion !== undefined && (obj.dataCollectionVersion = message.dataCollectionVersion);
    message.hints !== undefined && (obj.hints = message.hints ? UserDetails_Hints.toJSON(message.hints) : undefined);
    message.notifications !== undefined &&
      (obj.notifications = message.notifications ? UserDetails_Notifications.toJSON(message.notifications) : undefined);
    if (message.permissions) {
      obj.permissions = message.permissions.map((e) => e);
    } else {
      obj.permissions = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<UserDetails>, I>>(base?: I): UserDetails {
    return UserDetails.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserDetails>, I>>(object: I): UserDetails {
    const message = createBaseUserDetails();
    message.id = object.id ?? "";
    message.name = object.name ?? "";
    message.email = object.email ?? "";
    message.iconURL = object.iconURL ?? "";
    message.dataCollectionVersion = object.dataCollectionVersion ?? "";
    message.hints = (object.hints !== undefined && object.hints !== null)
      ? UserDetails_Hints.fromPartial(object.hints)
      : undefined;
    message.notifications = (object.notifications !== undefined && object.notifications !== null)
      ? UserDetails_Notifications.fromPartial(object.notifications)
      : undefined;
    message.permissions = object.permissions?.map((e) => e) || [];
    return message;
  },
};

function createBaseUserDetails_Hints(): UserDetails_Hints {
  return { enabled: false, dismissedHints: [] };
}

export const UserDetails_Hints = {
  encode(message: UserDetails_Hints, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.enabled === true) {
      writer.uint32(8).bool(message.enabled);
    }
    for (const v of message.dismissedHints) {
      writer.uint32(18).string(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserDetails_Hints {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserDetails_Hints();
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

  fromJSON(object: any): UserDetails_Hints {
    return {
      enabled: isSet(object.enabled) ? Boolean(object.enabled) : false,
      dismissedHints: Array.isArray(object?.dismissedHints) ? object.dismissedHints.map((e: any) => String(e)) : [],
    };
  },

  toJSON(message: UserDetails_Hints): unknown {
    const obj: any = {};
    message.enabled !== undefined && (obj.enabled = message.enabled);
    if (message.dismissedHints) {
      obj.dismissedHints = message.dismissedHints.map((e) => e);
    } else {
      obj.dismissedHints = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<UserDetails_Hints>, I>>(base?: I): UserDetails_Hints {
    return UserDetails_Hints.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserDetails_Hints>, I>>(object: I): UserDetails_Hints {
    const message = createBaseUserDetails_Hints();
    message.enabled = object.enabled ?? false;
    message.dismissedHints = object.dismissedHints?.map((e) => e) || [];
    return message;
  },
};

function createBaseUserDetails_Notifications(): UserDetails_Notifications {
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

export const UserDetails_Notifications = {
  encode(message: UserDetails_Notifications, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
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

  decode(input: _m0.Reader | Uint8Array, length?: number): UserDetails_Notifications {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserDetails_Notifications();
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

  fromJSON(object: any): UserDetails_Notifications {
    return {
      userQuantComplete: isSet(object.userQuantComplete)
        ? userDetails_NotificationMethodFromJSON(object.userQuantComplete)
        : 0,
      quantShared: isSet(object.quantShared) ? userDetails_NotificationMethodFromJSON(object.quantShared) : 0,
      newDataset: isSet(object.newDataset) ? userDetails_NotificationMethodFromJSON(object.newDataset) : 0,
      updatedDataset: isSet(object.updatedDataset) ? userDetails_NotificationMethodFromJSON(object.updatedDataset) : 0,
      imageAddedToDataset: isSet(object.imageAddedToDataset)
        ? userDetails_NotificationMethodFromJSON(object.imageAddedToDataset)
        : 0,
      majorModuleReleased: isSet(object.majorModuleReleased)
        ? userDetails_NotificationMethodFromJSON(object.majorModuleReleased)
        : 0,
      minorModuleReleased: isSet(object.minorModuleReleased)
        ? userDetails_NotificationMethodFromJSON(object.minorModuleReleased)
        : 0,
    };
  },

  toJSON(message: UserDetails_Notifications): unknown {
    const obj: any = {};
    message.userQuantComplete !== undefined &&
      (obj.userQuantComplete = userDetails_NotificationMethodToJSON(message.userQuantComplete));
    message.quantShared !== undefined && (obj.quantShared = userDetails_NotificationMethodToJSON(message.quantShared));
    message.newDataset !== undefined && (obj.newDataset = userDetails_NotificationMethodToJSON(message.newDataset));
    message.updatedDataset !== undefined &&
      (obj.updatedDataset = userDetails_NotificationMethodToJSON(message.updatedDataset));
    message.imageAddedToDataset !== undefined &&
      (obj.imageAddedToDataset = userDetails_NotificationMethodToJSON(message.imageAddedToDataset));
    message.majorModuleReleased !== undefined &&
      (obj.majorModuleReleased = userDetails_NotificationMethodToJSON(message.majorModuleReleased));
    message.minorModuleReleased !== undefined &&
      (obj.minorModuleReleased = userDetails_NotificationMethodToJSON(message.minorModuleReleased));
    return obj;
  },

  create<I extends Exact<DeepPartial<UserDetails_Notifications>, I>>(base?: I): UserDetails_Notifications {
    return UserDetails_Notifications.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserDetails_Notifications>, I>>(object: I): UserDetails_Notifications {
    const message = createBaseUserDetails_Notifications();
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

function createBaseSetUserDetailsReq(): SetUserDetailsReq {
  return { Details: undefined };
}

export const SetUserDetailsReq = {
  encode(message: SetUserDetailsReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.Details !== undefined) {
      UserDetails.encode(message.Details, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SetUserDetailsReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSetUserDetailsReq();
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

  fromJSON(object: any): SetUserDetailsReq {
    return { Details: isSet(object.Details) ? UserDetails.fromJSON(object.Details) : undefined };
  },

  toJSON(message: SetUserDetailsReq): unknown {
    const obj: any = {};
    message.Details !== undefined && (obj.Details = message.Details ? UserDetails.toJSON(message.Details) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<SetUserDetailsReq>, I>>(base?: I): SetUserDetailsReq {
    return SetUserDetailsReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SetUserDetailsReq>, I>>(object: I): SetUserDetailsReq {
    const message = createBaseSetUserDetailsReq();
    message.Details = (object.Details !== undefined && object.Details !== null)
      ? UserDetails.fromPartial(object.Details)
      : undefined;
    return message;
  },
};

function createBaseSetUserDetailsResp(): SetUserDetailsResp {
  return { status: 0 };
}

export const SetUserDetailsResp = {
  encode(message: SetUserDetailsResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SetUserDetailsResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSetUserDetailsResp();
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

  fromJSON(object: any): SetUserDetailsResp {
    return { status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0 };
  },

  toJSON(message: SetUserDetailsResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    return obj;
  },

  create<I extends Exact<DeepPartial<SetUserDetailsResp>, I>>(base?: I): SetUserDetailsResp {
    return SetUserDetailsResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SetUserDetailsResp>, I>>(object: I): SetUserDetailsResp {
    const message = createBaseSetUserDetailsResp();
    message.status = object.status ?? 0;
    return message;
  },
};

function createBaseDatasetListReq(): DatasetListReq {
  return { solFilter: "" };
}

export const DatasetListReq = {
  encode(message: DatasetListReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.solFilter !== "") {
      writer.uint32(10).string(message.solFilter);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DatasetListReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDatasetListReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.solFilter = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): DatasetListReq {
    return { solFilter: isSet(object.solFilter) ? String(object.solFilter) : "" };
  },

  toJSON(message: DatasetListReq): unknown {
    const obj: any = {};
    message.solFilter !== undefined && (obj.solFilter = message.solFilter);
    return obj;
  },

  create<I extends Exact<DeepPartial<DatasetListReq>, I>>(base?: I): DatasetListReq {
    return DatasetListReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DatasetListReq>, I>>(object: I): DatasetListReq {
    const message = createBaseDatasetListReq();
    message.solFilter = object.solFilter ?? "";
    return message;
  },
};

function createBaseDatasetItem(): DatasetItem {
  return { sol: "", rtt: "" };
}

export const DatasetItem = {
  encode(message: DatasetItem, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.sol !== "") {
      writer.uint32(10).string(message.sol);
    }
    if (message.rtt !== "") {
      writer.uint32(18).string(message.rtt);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DatasetItem {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDatasetItem();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.sol = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.rtt = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): DatasetItem {
    return { sol: isSet(object.sol) ? String(object.sol) : "", rtt: isSet(object.rtt) ? String(object.rtt) : "" };
  },

  toJSON(message: DatasetItem): unknown {
    const obj: any = {};
    message.sol !== undefined && (obj.sol = message.sol);
    message.rtt !== undefined && (obj.rtt = message.rtt);
    return obj;
  },

  create<I extends Exact<DeepPartial<DatasetItem>, I>>(base?: I): DatasetItem {
    return DatasetItem.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DatasetItem>, I>>(object: I): DatasetItem {
    const message = createBaseDatasetItem();
    message.sol = object.sol ?? "";
    message.rtt = object.rtt ?? "";
    return message;
  },
};

function createBaseDatasetListResp(): DatasetListResp {
  return { status: 0, datasets: [] };
}

export const DatasetListResp = {
  encode(message: DatasetListResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    for (const v of message.datasets) {
      DatasetItem.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DatasetListResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDatasetListResp();
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

          message.datasets.push(DatasetItem.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): DatasetListResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      datasets: Array.isArray(object?.datasets) ? object.datasets.map((e: any) => DatasetItem.fromJSON(e)) : [],
    };
  },

  toJSON(message: DatasetListResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    if (message.datasets) {
      obj.datasets = message.datasets.map((e) => e ? DatasetItem.toJSON(e) : undefined);
    } else {
      obj.datasets = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<DatasetListResp>, I>>(base?: I): DatasetListResp {
    return DatasetListResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DatasetListResp>, I>>(object: I): DatasetListResp {
    const message = createBaseDatasetListResp();
    message.status = object.status ?? 0;
    message.datasets = object.datasets?.map((e) => DatasetItem.fromPartial(e)) || [];
    return message;
  },
};

function createBaseDatasetReq(): DatasetReq {
  return { datasetID: "" };
}

export const DatasetReq = {
  encode(message: DatasetReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.datasetID !== "") {
      writer.uint32(10).string(message.datasetID);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DatasetReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDatasetReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
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

  fromJSON(object: any): DatasetReq {
    return { datasetID: isSet(object.datasetID) ? String(object.datasetID) : "" };
  },

  toJSON(message: DatasetReq): unknown {
    const obj: any = {};
    message.datasetID !== undefined && (obj.datasetID = message.datasetID);
    return obj;
  },

  create<I extends Exact<DeepPartial<DatasetReq>, I>>(base?: I): DatasetReq {
    return DatasetReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DatasetReq>, I>>(object: I): DatasetReq {
    const message = createBaseDatasetReq();
    message.datasetID = object.datasetID ?? "";
    return message;
  },
};

function createBaseDatasetResp(): DatasetResp {
  return { status: 0, dataset: undefined };
}

export const DatasetResp = {
  encode(message: DatasetResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    if (message.dataset !== undefined) {
      DatasetItem.encode(message.dataset, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DatasetResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDatasetResp();
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

          message.dataset = DatasetItem.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): DatasetResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      dataset: isSet(object.dataset) ? DatasetItem.fromJSON(object.dataset) : undefined,
    };
  },

  toJSON(message: DatasetResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    message.dataset !== undefined && (obj.dataset = message.dataset ? DatasetItem.toJSON(message.dataset) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<DatasetResp>, I>>(base?: I): DatasetResp {
    return DatasetResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DatasetResp>, I>>(object: I): DatasetResp {
    const message = createBaseDatasetResp();
    message.status = object.status ?? 0;
    message.dataset = (object.dataset !== undefined && object.dataset !== null)
      ? DatasetItem.fromPartial(object.dataset)
      : undefined;
    return message;
  },
};

function createBaseWSMessage(): WSMessage {
  return {
    msgId: 0,
    userDetailsReq: undefined,
    userDetailsResp: undefined,
    userDetailsUpd: undefined,
    setUserDetailsReq: undefined,
    setUserDetailsResp: undefined,
    datasetListReq: undefined,
    datasetListResp: undefined,
    datasetReq: undefined,
    datasetResp: undefined,
  };
}

export const WSMessage = {
  encode(message: WSMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.msgId !== 0) {
      writer.uint32(8).uint32(message.msgId);
    }
    if (message.userDetailsReq !== undefined) {
      UserDetailsReq.encode(message.userDetailsReq, writer.uint32(18).fork()).ldelim();
    }
    if (message.userDetailsResp !== undefined) {
      UserDetailsResp.encode(message.userDetailsResp, writer.uint32(26).fork()).ldelim();
    }
    if (message.userDetailsUpd !== undefined) {
      UserDetailsUpd.encode(message.userDetailsUpd, writer.uint32(34).fork()).ldelim();
    }
    if (message.setUserDetailsReq !== undefined) {
      SetUserDetailsReq.encode(message.setUserDetailsReq, writer.uint32(42).fork()).ldelim();
    }
    if (message.setUserDetailsResp !== undefined) {
      SetUserDetailsResp.encode(message.setUserDetailsResp, writer.uint32(50).fork()).ldelim();
    }
    if (message.datasetListReq !== undefined) {
      DatasetListReq.encode(message.datasetListReq, writer.uint32(58).fork()).ldelim();
    }
    if (message.datasetListResp !== undefined) {
      DatasetListResp.encode(message.datasetListResp, writer.uint32(66).fork()).ldelim();
    }
    if (message.datasetReq !== undefined) {
      DatasetReq.encode(message.datasetReq, writer.uint32(74).fork()).ldelim();
    }
    if (message.datasetResp !== undefined) {
      DatasetResp.encode(message.datasetResp, writer.uint32(82).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): WSMessage {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseWSMessage();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.msgId = reader.uint32();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.userDetailsReq = UserDetailsReq.decode(reader, reader.uint32());
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.userDetailsResp = UserDetailsResp.decode(reader, reader.uint32());
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.userDetailsUpd = UserDetailsUpd.decode(reader, reader.uint32());
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.setUserDetailsReq = SetUserDetailsReq.decode(reader, reader.uint32());
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.setUserDetailsResp = SetUserDetailsResp.decode(reader, reader.uint32());
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.datasetListReq = DatasetListReq.decode(reader, reader.uint32());
          continue;
        case 8:
          if (tag !== 66) {
            break;
          }

          message.datasetListResp = DatasetListResp.decode(reader, reader.uint32());
          continue;
        case 9:
          if (tag !== 74) {
            break;
          }

          message.datasetReq = DatasetReq.decode(reader, reader.uint32());
          continue;
        case 10:
          if (tag !== 82) {
            break;
          }

          message.datasetResp = DatasetResp.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): WSMessage {
    return {
      msgId: isSet(object.msgId) ? Number(object.msgId) : 0,
      userDetailsReq: isSet(object.userDetailsReq) ? UserDetailsReq.fromJSON(object.userDetailsReq) : undefined,
      userDetailsResp: isSet(object.userDetailsResp) ? UserDetailsResp.fromJSON(object.userDetailsResp) : undefined,
      userDetailsUpd: isSet(object.userDetailsUpd) ? UserDetailsUpd.fromJSON(object.userDetailsUpd) : undefined,
      setUserDetailsReq: isSet(object.setUserDetailsReq)
        ? SetUserDetailsReq.fromJSON(object.setUserDetailsReq)
        : undefined,
      setUserDetailsResp: isSet(object.setUserDetailsResp)
        ? SetUserDetailsResp.fromJSON(object.setUserDetailsResp)
        : undefined,
      datasetListReq: isSet(object.datasetListReq) ? DatasetListReq.fromJSON(object.datasetListReq) : undefined,
      datasetListResp: isSet(object.datasetListResp) ? DatasetListResp.fromJSON(object.datasetListResp) : undefined,
      datasetReq: isSet(object.datasetReq) ? DatasetReq.fromJSON(object.datasetReq) : undefined,
      datasetResp: isSet(object.datasetResp) ? DatasetResp.fromJSON(object.datasetResp) : undefined,
    };
  },

  toJSON(message: WSMessage): unknown {
    const obj: any = {};
    message.msgId !== undefined && (obj.msgId = Math.round(message.msgId));
    message.userDetailsReq !== undefined &&
      (obj.userDetailsReq = message.userDetailsReq ? UserDetailsReq.toJSON(message.userDetailsReq) : undefined);
    message.userDetailsResp !== undefined &&
      (obj.userDetailsResp = message.userDetailsResp ? UserDetailsResp.toJSON(message.userDetailsResp) : undefined);
    message.userDetailsUpd !== undefined &&
      (obj.userDetailsUpd = message.userDetailsUpd ? UserDetailsUpd.toJSON(message.userDetailsUpd) : undefined);
    message.setUserDetailsReq !== undefined && (obj.setUserDetailsReq = message.setUserDetailsReq
      ? SetUserDetailsReq.toJSON(message.setUserDetailsReq)
      : undefined);
    message.setUserDetailsResp !== undefined && (obj.setUserDetailsResp = message.setUserDetailsResp
      ? SetUserDetailsResp.toJSON(message.setUserDetailsResp)
      : undefined);
    message.datasetListReq !== undefined &&
      (obj.datasetListReq = message.datasetListReq ? DatasetListReq.toJSON(message.datasetListReq) : undefined);
    message.datasetListResp !== undefined &&
      (obj.datasetListResp = message.datasetListResp ? DatasetListResp.toJSON(message.datasetListResp) : undefined);
    message.datasetReq !== undefined &&
      (obj.datasetReq = message.datasetReq ? DatasetReq.toJSON(message.datasetReq) : undefined);
    message.datasetResp !== undefined &&
      (obj.datasetResp = message.datasetResp ? DatasetResp.toJSON(message.datasetResp) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<WSMessage>, I>>(base?: I): WSMessage {
    return WSMessage.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<WSMessage>, I>>(object: I): WSMessage {
    const message = createBaseWSMessage();
    message.msgId = object.msgId ?? 0;
    message.userDetailsReq = (object.userDetailsReq !== undefined && object.userDetailsReq !== null)
      ? UserDetailsReq.fromPartial(object.userDetailsReq)
      : undefined;
    message.userDetailsResp = (object.userDetailsResp !== undefined && object.userDetailsResp !== null)
      ? UserDetailsResp.fromPartial(object.userDetailsResp)
      : undefined;
    message.userDetailsUpd = (object.userDetailsUpd !== undefined && object.userDetailsUpd !== null)
      ? UserDetailsUpd.fromPartial(object.userDetailsUpd)
      : undefined;
    message.setUserDetailsReq = (object.setUserDetailsReq !== undefined && object.setUserDetailsReq !== null)
      ? SetUserDetailsReq.fromPartial(object.setUserDetailsReq)
      : undefined;
    message.setUserDetailsResp = (object.setUserDetailsResp !== undefined && object.setUserDetailsResp !== null)
      ? SetUserDetailsResp.fromPartial(object.setUserDetailsResp)
      : undefined;
    message.datasetListReq = (object.datasetListReq !== undefined && object.datasetListReq !== null)
      ? DatasetListReq.fromPartial(object.datasetListReq)
      : undefined;
    message.datasetListResp = (object.datasetListResp !== undefined && object.datasetListResp !== null)
      ? DatasetListResp.fromPartial(object.datasetListResp)
      : undefined;
    message.datasetReq = (object.datasetReq !== undefined && object.datasetReq !== null)
      ? DatasetReq.fromPartial(object.datasetReq)
      : undefined;
    message.datasetResp = (object.datasetResp !== undefined && object.datasetResp !== null)
      ? DatasetResp.fromPartial(object.datasetResp)
      : undefined;
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
