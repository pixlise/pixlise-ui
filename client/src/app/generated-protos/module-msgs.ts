/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { DataModule } from "./modules";
import { ResponseStatus, responseStatusFromJSON, responseStatusToJSON } from "./response";

export const protobufPackage = "";

export interface DataModuleListReq {
}

export interface DataModuleListResp {
  status: ResponseStatus;
  modules: { [key: string]: DataModule };
}

export interface DataModuleListResp_ModulesEntry {
  key: string;
  value: DataModule | undefined;
}

export interface DataModuleReq {
  id: string;
}

export interface DataModuleResp {
  status: ResponseStatus;
  id: string;
  module: DataModule | undefined;
}

/** If id is blank, assume its new and generate an ID to return, otherwise update & return same one */
export interface DataModuleWriteReq {
  id: string;
  module: DataModule | undefined;
}

export interface DataModuleWriteResp {
  status: ResponseStatus;
  id: string;
  module: DataModule | undefined;
}

function createBaseDataModuleListReq(): DataModuleListReq {
  return {};
}

export const DataModuleListReq = {
  encode(_: DataModuleListReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DataModuleListReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDataModuleListReq();
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

  fromJSON(_: any): DataModuleListReq {
    return {};
  },

  toJSON(_: DataModuleListReq): unknown {
    const obj: any = {};
    return obj;
  },

  create<I extends Exact<DeepPartial<DataModuleListReq>, I>>(base?: I): DataModuleListReq {
    return DataModuleListReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DataModuleListReq>, I>>(_: I): DataModuleListReq {
    const message = createBaseDataModuleListReq();
    return message;
  },
};

function createBaseDataModuleListResp(): DataModuleListResp {
  return { status: 0, modules: {} };
}

export const DataModuleListResp = {
  encode(message: DataModuleListResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    Object.entries(message.modules).forEach(([key, value]) => {
      DataModuleListResp_ModulesEntry.encode({ key: key as any, value }, writer.uint32(18).fork()).ldelim();
    });
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DataModuleListResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDataModuleListResp();
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

          const entry2 = DataModuleListResp_ModulesEntry.decode(reader, reader.uint32());
          if (entry2.value !== undefined) {
            message.modules[entry2.key] = entry2.value;
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

  fromJSON(object: any): DataModuleListResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      modules: isObject(object.modules)
        ? Object.entries(object.modules).reduce<{ [key: string]: DataModule }>((acc, [key, value]) => {
          acc[key] = DataModule.fromJSON(value);
          return acc;
        }, {})
        : {},
    };
  },

  toJSON(message: DataModuleListResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    obj.modules = {};
    if (message.modules) {
      Object.entries(message.modules).forEach(([k, v]) => {
        obj.modules[k] = DataModule.toJSON(v);
      });
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<DataModuleListResp>, I>>(base?: I): DataModuleListResp {
    return DataModuleListResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DataModuleListResp>, I>>(object: I): DataModuleListResp {
    const message = createBaseDataModuleListResp();
    message.status = object.status ?? 0;
    message.modules = Object.entries(object.modules ?? {}).reduce<{ [key: string]: DataModule }>(
      (acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = DataModule.fromPartial(value);
        }
        return acc;
      },
      {},
    );
    return message;
  },
};

function createBaseDataModuleListResp_ModulesEntry(): DataModuleListResp_ModulesEntry {
  return { key: "", value: undefined };
}

export const DataModuleListResp_ModulesEntry = {
  encode(message: DataModuleListResp_ModulesEntry, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.key !== "") {
      writer.uint32(10).string(message.key);
    }
    if (message.value !== undefined) {
      DataModule.encode(message.value, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DataModuleListResp_ModulesEntry {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDataModuleListResp_ModulesEntry();
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

          message.value = DataModule.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): DataModuleListResp_ModulesEntry {
    return {
      key: isSet(object.key) ? String(object.key) : "",
      value: isSet(object.value) ? DataModule.fromJSON(object.value) : undefined,
    };
  },

  toJSON(message: DataModuleListResp_ModulesEntry): unknown {
    const obj: any = {};
    message.key !== undefined && (obj.key = message.key);
    message.value !== undefined && (obj.value = message.value ? DataModule.toJSON(message.value) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<DataModuleListResp_ModulesEntry>, I>>(base?: I): DataModuleListResp_ModulesEntry {
    return DataModuleListResp_ModulesEntry.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DataModuleListResp_ModulesEntry>, I>>(
    object: I,
  ): DataModuleListResp_ModulesEntry {
    const message = createBaseDataModuleListResp_ModulesEntry();
    message.key = object.key ?? "";
    message.value = (object.value !== undefined && object.value !== null)
      ? DataModule.fromPartial(object.value)
      : undefined;
    return message;
  },
};

function createBaseDataModuleReq(): DataModuleReq {
  return { id: "" };
}

export const DataModuleReq = {
  encode(message: DataModuleReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DataModuleReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDataModuleReq();
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

  fromJSON(object: any): DataModuleReq {
    return { id: isSet(object.id) ? String(object.id) : "" };
  },

  toJSON(message: DataModuleReq): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    return obj;
  },

  create<I extends Exact<DeepPartial<DataModuleReq>, I>>(base?: I): DataModuleReq {
    return DataModuleReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DataModuleReq>, I>>(object: I): DataModuleReq {
    const message = createBaseDataModuleReq();
    message.id = object.id ?? "";
    return message;
  },
};

function createBaseDataModuleResp(): DataModuleResp {
  return { status: 0, id: "", module: undefined };
}

export const DataModuleResp = {
  encode(message: DataModuleResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    if (message.id !== "") {
      writer.uint32(18).string(message.id);
    }
    if (message.module !== undefined) {
      DataModule.encode(message.module, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DataModuleResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDataModuleResp();
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

          message.id = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.module = DataModule.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): DataModuleResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      id: isSet(object.id) ? String(object.id) : "",
      module: isSet(object.module) ? DataModule.fromJSON(object.module) : undefined,
    };
  },

  toJSON(message: DataModuleResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    message.id !== undefined && (obj.id = message.id);
    message.module !== undefined && (obj.module = message.module ? DataModule.toJSON(message.module) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<DataModuleResp>, I>>(base?: I): DataModuleResp {
    return DataModuleResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DataModuleResp>, I>>(object: I): DataModuleResp {
    const message = createBaseDataModuleResp();
    message.status = object.status ?? 0;
    message.id = object.id ?? "";
    message.module = (object.module !== undefined && object.module !== null)
      ? DataModule.fromPartial(object.module)
      : undefined;
    return message;
  },
};

function createBaseDataModuleWriteReq(): DataModuleWriteReq {
  return { id: "", module: undefined };
}

export const DataModuleWriteReq = {
  encode(message: DataModuleWriteReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    if (message.module !== undefined) {
      DataModule.encode(message.module, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DataModuleWriteReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDataModuleWriteReq();
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

          message.module = DataModule.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): DataModuleWriteReq {
    return {
      id: isSet(object.id) ? String(object.id) : "",
      module: isSet(object.module) ? DataModule.fromJSON(object.module) : undefined,
    };
  },

  toJSON(message: DataModuleWriteReq): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    message.module !== undefined && (obj.module = message.module ? DataModule.toJSON(message.module) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<DataModuleWriteReq>, I>>(base?: I): DataModuleWriteReq {
    return DataModuleWriteReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DataModuleWriteReq>, I>>(object: I): DataModuleWriteReq {
    const message = createBaseDataModuleWriteReq();
    message.id = object.id ?? "";
    message.module = (object.module !== undefined && object.module !== null)
      ? DataModule.fromPartial(object.module)
      : undefined;
    return message;
  },
};

function createBaseDataModuleWriteResp(): DataModuleWriteResp {
  return { status: 0, id: "", module: undefined };
}

export const DataModuleWriteResp = {
  encode(message: DataModuleWriteResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    if (message.id !== "") {
      writer.uint32(18).string(message.id);
    }
    if (message.module !== undefined) {
      DataModule.encode(message.module, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DataModuleWriteResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDataModuleWriteResp();
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

          message.id = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.module = DataModule.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): DataModuleWriteResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      id: isSet(object.id) ? String(object.id) : "",
      module: isSet(object.module) ? DataModule.fromJSON(object.module) : undefined,
    };
  },

  toJSON(message: DataModuleWriteResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    message.id !== undefined && (obj.id = message.id);
    message.module !== undefined && (obj.module = message.module ? DataModule.toJSON(message.module) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<DataModuleWriteResp>, I>>(base?: I): DataModuleWriteResp {
    return DataModuleWriteResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DataModuleWriteResp>, I>>(object: I): DataModuleWriteResp {
    const message = createBaseDataModuleWriteResp();
    message.status = object.status ?? 0;
    message.id = object.id ?? "";
    message.module = (object.module !== undefined && object.module !== null)
      ? DataModule.fromPartial(object.module)
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

function isObject(value: any): boolean {
  return typeof value === "object" && value !== null;
}

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
