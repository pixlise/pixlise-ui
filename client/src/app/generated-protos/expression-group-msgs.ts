/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { ExpressionGroup } from "./expression-group";
import { ResponseStatus, responseStatusFromJSON, responseStatusToJSON } from "./response";

export const protobufPackage = "";

/** TODO: Paginate? */
export interface ExpressionGroupListReq {
}

export interface ExpressionGroupListResp {
  status: ResponseStatus;
  groups: { [key: string]: ExpressionGroup };
}

export interface ExpressionGroupListResp_GroupsEntry {
  key: string;
  value: ExpressionGroup | undefined;
}

export interface ExpressionGroupSetReq {
  id: string;
  group: ExpressionGroup | undefined;
}

export interface ExpressionGroupSetResp {
  status: ResponseStatus;
}

export interface ExpressionGroupDeleteReq {
  id: string;
}

export interface ExpressionGroupDeleteResp {
  status: ResponseStatus;
}

function createBaseExpressionGroupListReq(): ExpressionGroupListReq {
  return {};
}

export const ExpressionGroupListReq = {
  encode(_: ExpressionGroupListReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExpressionGroupListReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExpressionGroupListReq();
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

  fromJSON(_: any): ExpressionGroupListReq {
    return {};
  },

  toJSON(_: ExpressionGroupListReq): unknown {
    const obj: any = {};
    return obj;
  },

  create<I extends Exact<DeepPartial<ExpressionGroupListReq>, I>>(base?: I): ExpressionGroupListReq {
    return ExpressionGroupListReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ExpressionGroupListReq>, I>>(_: I): ExpressionGroupListReq {
    const message = createBaseExpressionGroupListReq();
    return message;
  },
};

function createBaseExpressionGroupListResp(): ExpressionGroupListResp {
  return { status: 0, groups: {} };
}

export const ExpressionGroupListResp = {
  encode(message: ExpressionGroupListResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    Object.entries(message.groups).forEach(([key, value]) => {
      ExpressionGroupListResp_GroupsEntry.encode({ key: key as any, value }, writer.uint32(18).fork()).ldelim();
    });
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExpressionGroupListResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExpressionGroupListResp();
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

          const entry2 = ExpressionGroupListResp_GroupsEntry.decode(reader, reader.uint32());
          if (entry2.value !== undefined) {
            message.groups[entry2.key] = entry2.value;
          }
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ExpressionGroupListResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      groups: isObject(object.groups)
        ? Object.entries(object.groups).reduce<{ [key: string]: ExpressionGroup }>((acc, [key, value]) => {
          acc[key] = ExpressionGroup.fromJSON(value);
          return acc;
        }, {})
        : {},
    };
  },

  toJSON(message: ExpressionGroupListResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    obj.groups = {};
    if (message.groups) {
      Object.entries(message.groups).forEach(([k, v]) => {
        obj.groups[k] = ExpressionGroup.toJSON(v);
      });
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ExpressionGroupListResp>, I>>(base?: I): ExpressionGroupListResp {
    return ExpressionGroupListResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ExpressionGroupListResp>, I>>(object: I): ExpressionGroupListResp {
    const message = createBaseExpressionGroupListResp();
    message.status = object.status ?? 0;
    message.groups = Object.entries(object.groups ?? {}).reduce<{ [key: string]: ExpressionGroup }>(
      (acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = ExpressionGroup.fromPartial(value);
        }
        return acc;
      },
      {},
    );
    return message;
  },
};

function createBaseExpressionGroupListResp_GroupsEntry(): ExpressionGroupListResp_GroupsEntry {
  return { key: "", value: undefined };
}

export const ExpressionGroupListResp_GroupsEntry = {
  encode(message: ExpressionGroupListResp_GroupsEntry, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.key !== "") {
      writer.uint32(10).string(message.key);
    }
    if (message.value !== undefined) {
      ExpressionGroup.encode(message.value, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExpressionGroupListResp_GroupsEntry {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExpressionGroupListResp_GroupsEntry();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.key = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.value = ExpressionGroup.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ExpressionGroupListResp_GroupsEntry {
    return {
      key: isSet(object.key) ? String(object.key) : "",
      value: isSet(object.value) ? ExpressionGroup.fromJSON(object.value) : undefined,
    };
  },

  toJSON(message: ExpressionGroupListResp_GroupsEntry): unknown {
    const obj: any = {};
    message.key !== undefined && (obj.key = message.key);
    message.value !== undefined && (obj.value = message.value ? ExpressionGroup.toJSON(message.value) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<ExpressionGroupListResp_GroupsEntry>, I>>(
    base?: I,
  ): ExpressionGroupListResp_GroupsEntry {
    return ExpressionGroupListResp_GroupsEntry.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ExpressionGroupListResp_GroupsEntry>, I>>(
    object: I,
  ): ExpressionGroupListResp_GroupsEntry {
    const message = createBaseExpressionGroupListResp_GroupsEntry();
    message.key = object.key ?? "";
    message.value = (object.value !== undefined && object.value !== null)
      ? ExpressionGroup.fromPartial(object.value)
      : undefined;
    return message;
  },
};

function createBaseExpressionGroupSetReq(): ExpressionGroupSetReq {
  return { id: "", group: undefined };
}

export const ExpressionGroupSetReq = {
  encode(message: ExpressionGroupSetReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    if (message.group !== undefined) {
      ExpressionGroup.encode(message.group, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExpressionGroupSetReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExpressionGroupSetReq();
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

          message.group = ExpressionGroup.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ExpressionGroupSetReq {
    return {
      id: isSet(object.id) ? String(object.id) : "",
      group: isSet(object.group) ? ExpressionGroup.fromJSON(object.group) : undefined,
    };
  },

  toJSON(message: ExpressionGroupSetReq): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    message.group !== undefined && (obj.group = message.group ? ExpressionGroup.toJSON(message.group) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<ExpressionGroupSetReq>, I>>(base?: I): ExpressionGroupSetReq {
    return ExpressionGroupSetReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ExpressionGroupSetReq>, I>>(object: I): ExpressionGroupSetReq {
    const message = createBaseExpressionGroupSetReq();
    message.id = object.id ?? "";
    message.group = (object.group !== undefined && object.group !== null)
      ? ExpressionGroup.fromPartial(object.group)
      : undefined;
    return message;
  },
};

function createBaseExpressionGroupSetResp(): ExpressionGroupSetResp {
  return { status: 0 };
}

export const ExpressionGroupSetResp = {
  encode(message: ExpressionGroupSetResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExpressionGroupSetResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExpressionGroupSetResp();
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

  fromJSON(object: any): ExpressionGroupSetResp {
    return { status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0 };
  },

  toJSON(message: ExpressionGroupSetResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    return obj;
  },

  create<I extends Exact<DeepPartial<ExpressionGroupSetResp>, I>>(base?: I): ExpressionGroupSetResp {
    return ExpressionGroupSetResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ExpressionGroupSetResp>, I>>(object: I): ExpressionGroupSetResp {
    const message = createBaseExpressionGroupSetResp();
    message.status = object.status ?? 0;
    return message;
  },
};

function createBaseExpressionGroupDeleteReq(): ExpressionGroupDeleteReq {
  return { id: "" };
}

export const ExpressionGroupDeleteReq = {
  encode(message: ExpressionGroupDeleteReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExpressionGroupDeleteReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExpressionGroupDeleteReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.id = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ExpressionGroupDeleteReq {
    return { id: isSet(object.id) ? String(object.id) : "" };
  },

  toJSON(message: ExpressionGroupDeleteReq): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    return obj;
  },

  create<I extends Exact<DeepPartial<ExpressionGroupDeleteReq>, I>>(base?: I): ExpressionGroupDeleteReq {
    return ExpressionGroupDeleteReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ExpressionGroupDeleteReq>, I>>(object: I): ExpressionGroupDeleteReq {
    const message = createBaseExpressionGroupDeleteReq();
    message.id = object.id ?? "";
    return message;
  },
};

function createBaseExpressionGroupDeleteResp(): ExpressionGroupDeleteResp {
  return { status: 0 };
}

export const ExpressionGroupDeleteResp = {
  encode(message: ExpressionGroupDeleteResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExpressionGroupDeleteResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExpressionGroupDeleteResp();
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

  fromJSON(object: any): ExpressionGroupDeleteResp {
    return { status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0 };
  },

  toJSON(message: ExpressionGroupDeleteResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    return obj;
  },

  create<I extends Exact<DeepPartial<ExpressionGroupDeleteResp>, I>>(base?: I): ExpressionGroupDeleteResp {
    return ExpressionGroupDeleteResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ExpressionGroupDeleteResp>, I>>(object: I): ExpressionGroupDeleteResp {
    const message = createBaseExpressionGroupDeleteResp();
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

function isObject(value: any): boolean {
  return typeof value === "object" && value !== null;
}

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
