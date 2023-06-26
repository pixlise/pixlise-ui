/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { ResponseStatus, responseStatusFromJSON, responseStatusToJSON } from "./response";
import { UserDetails, UserRole } from "./user";

export const protobufPackage = "";

/**
 * //////////////////////////////////
 * Get all users
 */
export interface UserListReq {
  /** Get all users who have a role */
  roleId?:
    | string
    | undefined;
  /** Get a specific user by ID */
  userId?:
    | string
    | undefined;
  /** Get all users who have searchText in their name/surname */
  searchText?: string | undefined;
}

export interface UserListResp {
  status: ResponseStatus;
  details: UserDetails[];
}

/**
 * //////////////////////////////////
 * Get all user roles
 */
export interface UserRoleListReq {
}

export interface UserRoleListResp {
  status: ResponseStatus;
  roles: UserRole[];
}

/**
 * //////////////////////////////////
 * Get roles for a given user
 */
export interface UserRolesListReq {
  userId: string;
}

export interface UserRolesListResp {
  status: ResponseStatus;
  roles: UserRole[];
}

/**
 * //////////////////////////////////
 * Add a user role to a user
 */
export interface UserAddRoleReq {
  userId: string;
  roleId: string;
}

/** Changing user roles, this should publish a UserDetailsUpd */
export interface UserAddRoleResp {
  status: ResponseStatus;
}

/**
 * //////////////////////////////////
 * Delete a user role for a user
 */
export interface UserDeleteRoleReq {
  userId: string;
  roleId: string;
}

/** Changing user roles, this should publish a UserDetailsUpd */
export interface UserDeleteRoleResp {
  status: ResponseStatus;
}

function createBaseUserListReq(): UserListReq {
  return { roleId: undefined, userId: undefined, searchText: undefined };
}

export const UserListReq = {
  encode(message: UserListReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.roleId !== undefined) {
      writer.uint32(10).string(message.roleId);
    }
    if (message.userId !== undefined) {
      writer.uint32(18).string(message.userId);
    }
    if (message.searchText !== undefined) {
      writer.uint32(26).string(message.searchText);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserListReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserListReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.roleId = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.userId = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.searchText = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): UserListReq {
    return {
      roleId: isSet(object.roleId) ? String(object.roleId) : undefined,
      userId: isSet(object.userId) ? String(object.userId) : undefined,
      searchText: isSet(object.searchText) ? String(object.searchText) : undefined,
    };
  },

  toJSON(message: UserListReq): unknown {
    const obj: any = {};
    message.roleId !== undefined && (obj.roleId = message.roleId);
    message.userId !== undefined && (obj.userId = message.userId);
    message.searchText !== undefined && (obj.searchText = message.searchText);
    return obj;
  },

  create<I extends Exact<DeepPartial<UserListReq>, I>>(base?: I): UserListReq {
    return UserListReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserListReq>, I>>(object: I): UserListReq {
    const message = createBaseUserListReq();
    message.roleId = object.roleId ?? undefined;
    message.userId = object.userId ?? undefined;
    message.searchText = object.searchText ?? undefined;
    return message;
  },
};

function createBaseUserListResp(): UserListResp {
  return { status: 0, details: [] };
}

export const UserListResp = {
  encode(message: UserListResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    for (const v of message.details) {
      UserDetails.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserListResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserListResp();
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

          message.details.push(UserDetails.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): UserListResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      details: Array.isArray(object?.details) ? object.details.map((e: any) => UserDetails.fromJSON(e)) : [],
    };
  },

  toJSON(message: UserListResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    if (message.details) {
      obj.details = message.details.map((e) => e ? UserDetails.toJSON(e) : undefined);
    } else {
      obj.details = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<UserListResp>, I>>(base?: I): UserListResp {
    return UserListResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserListResp>, I>>(object: I): UserListResp {
    const message = createBaseUserListResp();
    message.status = object.status ?? 0;
    message.details = object.details?.map((e) => UserDetails.fromPartial(e)) || [];
    return message;
  },
};

function createBaseUserRoleListReq(): UserRoleListReq {
  return {};
}

export const UserRoleListReq = {
  encode(_: UserRoleListReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserRoleListReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserRoleListReq();
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

  fromJSON(_: any): UserRoleListReq {
    return {};
  },

  toJSON(_: UserRoleListReq): unknown {
    const obj: any = {};
    return obj;
  },

  create<I extends Exact<DeepPartial<UserRoleListReq>, I>>(base?: I): UserRoleListReq {
    return UserRoleListReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserRoleListReq>, I>>(_: I): UserRoleListReq {
    const message = createBaseUserRoleListReq();
    return message;
  },
};

function createBaseUserRoleListResp(): UserRoleListResp {
  return { status: 0, roles: [] };
}

export const UserRoleListResp = {
  encode(message: UserRoleListResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    for (const v of message.roles) {
      UserRole.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserRoleListResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserRoleListResp();
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

          message.roles.push(UserRole.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): UserRoleListResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      roles: Array.isArray(object?.roles) ? object.roles.map((e: any) => UserRole.fromJSON(e)) : [],
    };
  },

  toJSON(message: UserRoleListResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    if (message.roles) {
      obj.roles = message.roles.map((e) => e ? UserRole.toJSON(e) : undefined);
    } else {
      obj.roles = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<UserRoleListResp>, I>>(base?: I): UserRoleListResp {
    return UserRoleListResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserRoleListResp>, I>>(object: I): UserRoleListResp {
    const message = createBaseUserRoleListResp();
    message.status = object.status ?? 0;
    message.roles = object.roles?.map((e) => UserRole.fromPartial(e)) || [];
    return message;
  },
};

function createBaseUserRolesListReq(): UserRolesListReq {
  return { userId: "" };
}

export const UserRolesListReq = {
  encode(message: UserRolesListReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.userId !== "") {
      writer.uint32(10).string(message.userId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserRolesListReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserRolesListReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.userId = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): UserRolesListReq {
    return { userId: isSet(object.userId) ? String(object.userId) : "" };
  },

  toJSON(message: UserRolesListReq): unknown {
    const obj: any = {};
    message.userId !== undefined && (obj.userId = message.userId);
    return obj;
  },

  create<I extends Exact<DeepPartial<UserRolesListReq>, I>>(base?: I): UserRolesListReq {
    return UserRolesListReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserRolesListReq>, I>>(object: I): UserRolesListReq {
    const message = createBaseUserRolesListReq();
    message.userId = object.userId ?? "";
    return message;
  },
};

function createBaseUserRolesListResp(): UserRolesListResp {
  return { status: 0, roles: [] };
}

export const UserRolesListResp = {
  encode(message: UserRolesListResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    for (const v of message.roles) {
      UserRole.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserRolesListResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserRolesListResp();
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

          message.roles.push(UserRole.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): UserRolesListResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      roles: Array.isArray(object?.roles) ? object.roles.map((e: any) => UserRole.fromJSON(e)) : [],
    };
  },

  toJSON(message: UserRolesListResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    if (message.roles) {
      obj.roles = message.roles.map((e) => e ? UserRole.toJSON(e) : undefined);
    } else {
      obj.roles = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<UserRolesListResp>, I>>(base?: I): UserRolesListResp {
    return UserRolesListResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserRolesListResp>, I>>(object: I): UserRolesListResp {
    const message = createBaseUserRolesListResp();
    message.status = object.status ?? 0;
    message.roles = object.roles?.map((e) => UserRole.fromPartial(e)) || [];
    return message;
  },
};

function createBaseUserAddRoleReq(): UserAddRoleReq {
  return { userId: "", roleId: "" };
}

export const UserAddRoleReq = {
  encode(message: UserAddRoleReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.userId !== "") {
      writer.uint32(10).string(message.userId);
    }
    if (message.roleId !== "") {
      writer.uint32(18).string(message.roleId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserAddRoleReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserAddRoleReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.userId = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.roleId = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): UserAddRoleReq {
    return {
      userId: isSet(object.userId) ? String(object.userId) : "",
      roleId: isSet(object.roleId) ? String(object.roleId) : "",
    };
  },

  toJSON(message: UserAddRoleReq): unknown {
    const obj: any = {};
    message.userId !== undefined && (obj.userId = message.userId);
    message.roleId !== undefined && (obj.roleId = message.roleId);
    return obj;
  },

  create<I extends Exact<DeepPartial<UserAddRoleReq>, I>>(base?: I): UserAddRoleReq {
    return UserAddRoleReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserAddRoleReq>, I>>(object: I): UserAddRoleReq {
    const message = createBaseUserAddRoleReq();
    message.userId = object.userId ?? "";
    message.roleId = object.roleId ?? "";
    return message;
  },
};

function createBaseUserAddRoleResp(): UserAddRoleResp {
  return { status: 0 };
}

export const UserAddRoleResp = {
  encode(message: UserAddRoleResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserAddRoleResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserAddRoleResp();
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

  fromJSON(object: any): UserAddRoleResp {
    return { status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0 };
  },

  toJSON(message: UserAddRoleResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    return obj;
  },

  create<I extends Exact<DeepPartial<UserAddRoleResp>, I>>(base?: I): UserAddRoleResp {
    return UserAddRoleResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserAddRoleResp>, I>>(object: I): UserAddRoleResp {
    const message = createBaseUserAddRoleResp();
    message.status = object.status ?? 0;
    return message;
  },
};

function createBaseUserDeleteRoleReq(): UserDeleteRoleReq {
  return { userId: "", roleId: "" };
}

export const UserDeleteRoleReq = {
  encode(message: UserDeleteRoleReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.userId !== "") {
      writer.uint32(10).string(message.userId);
    }
    if (message.roleId !== "") {
      writer.uint32(18).string(message.roleId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserDeleteRoleReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserDeleteRoleReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.userId = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.roleId = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): UserDeleteRoleReq {
    return {
      userId: isSet(object.userId) ? String(object.userId) : "",
      roleId: isSet(object.roleId) ? String(object.roleId) : "",
    };
  },

  toJSON(message: UserDeleteRoleReq): unknown {
    const obj: any = {};
    message.userId !== undefined && (obj.userId = message.userId);
    message.roleId !== undefined && (obj.roleId = message.roleId);
    return obj;
  },

  create<I extends Exact<DeepPartial<UserDeleteRoleReq>, I>>(base?: I): UserDeleteRoleReq {
    return UserDeleteRoleReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserDeleteRoleReq>, I>>(object: I): UserDeleteRoleReq {
    const message = createBaseUserDeleteRoleReq();
    message.userId = object.userId ?? "";
    message.roleId = object.roleId ?? "";
    return message;
  },
};

function createBaseUserDeleteRoleResp(): UserDeleteRoleResp {
  return { status: 0 };
}

export const UserDeleteRoleResp = {
  encode(message: UserDeleteRoleResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserDeleteRoleResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserDeleteRoleResp();
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

  fromJSON(object: any): UserDeleteRoleResp {
    return { status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0 };
  },

  toJSON(message: UserDeleteRoleResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    return obj;
  },

  create<I extends Exact<DeepPartial<UserDeleteRoleResp>, I>>(base?: I): UserDeleteRoleResp {
    return UserDeleteRoleResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserDeleteRoleResp>, I>>(object: I): UserDeleteRoleResp {
    const message = createBaseUserDeleteRoleResp();
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
