/* eslint-disable */
import * as Long from "long";
import * as _m0 from "protobufjs/minimal";
import { Ownership } from "./ownership-access";

export const protobufPackage = "";

export interface DataExpression {
  id: string;
  name: string;
  sourceCode: string;
  sourceLanguage: string;
  comments: string;
  tags: string[];
  moduleReferences: ModuleReference[];
  owner:
    | Ownership
    | undefined;
  /** DOIMetadata doiMetadata = 10; */
  recentExecStats: DataExpressionExecStats | undefined;
}

export interface ModuleReference {
  moduleId: string;
  version: string;
}

export interface DataExpressionExecStats {
  dataRequired: string[];
  runtimeMs: number;
  timeStampUnixSec: number;
}

export interface ExpressionResultItem {
  location: number;
  values: number[];
}

function createBaseDataExpression(): DataExpression {
  return {
    id: "",
    name: "",
    sourceCode: "",
    sourceLanguage: "",
    comments: "",
    tags: [],
    moduleReferences: [],
    owner: undefined,
    recentExecStats: undefined,
  };
}

export const DataExpression = {
  encode(message: DataExpression, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    if (message.name !== "") {
      writer.uint32(18).string(message.name);
    }
    if (message.sourceCode !== "") {
      writer.uint32(26).string(message.sourceCode);
    }
    if (message.sourceLanguage !== "") {
      writer.uint32(34).string(message.sourceLanguage);
    }
    if (message.comments !== "") {
      writer.uint32(42).string(message.comments);
    }
    for (const v of message.tags) {
      writer.uint32(50).string(v!);
    }
    for (const v of message.moduleReferences) {
      ModuleReference.encode(v!, writer.uint32(58).fork()).ldelim();
    }
    if (message.owner !== undefined) {
      Ownership.encode(message.owner, writer.uint32(66).fork()).ldelim();
    }
    if (message.recentExecStats !== undefined) {
      DataExpressionExecStats.encode(message.recentExecStats, writer.uint32(74).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DataExpression {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDataExpression();
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

          message.sourceCode = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.sourceLanguage = reader.string();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.comments = reader.string();
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.tags.push(reader.string());
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.moduleReferences.push(ModuleReference.decode(reader, reader.uint32()));
          continue;
        case 8:
          if (tag !== 66) {
            break;
          }

          message.owner = Ownership.decode(reader, reader.uint32());
          continue;
        case 9:
          if (tag !== 74) {
            break;
          }

          message.recentExecStats = DataExpressionExecStats.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): DataExpression {
    return {
      id: isSet(object.id) ? String(object.id) : "",
      name: isSet(object.name) ? String(object.name) : "",
      sourceCode: isSet(object.sourceCode) ? String(object.sourceCode) : "",
      sourceLanguage: isSet(object.sourceLanguage) ? String(object.sourceLanguage) : "",
      comments: isSet(object.comments) ? String(object.comments) : "",
      tags: Array.isArray(object?.tags) ? object.tags.map((e: any) => String(e)) : [],
      moduleReferences: Array.isArray(object?.moduleReferences)
        ? object.moduleReferences.map((e: any) => ModuleReference.fromJSON(e))
        : [],
      owner: isSet(object.owner) ? Ownership.fromJSON(object.owner) : undefined,
      recentExecStats: isSet(object.recentExecStats)
        ? DataExpressionExecStats.fromJSON(object.recentExecStats)
        : undefined,
    };
  },

  toJSON(message: DataExpression): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    message.name !== undefined && (obj.name = message.name);
    message.sourceCode !== undefined && (obj.sourceCode = message.sourceCode);
    message.sourceLanguage !== undefined && (obj.sourceLanguage = message.sourceLanguage);
    message.comments !== undefined && (obj.comments = message.comments);
    if (message.tags) {
      obj.tags = message.tags.map((e) => e);
    } else {
      obj.tags = [];
    }
    if (message.moduleReferences) {
      obj.moduleReferences = message.moduleReferences.map((e) => e ? ModuleReference.toJSON(e) : undefined);
    } else {
      obj.moduleReferences = [];
    }
    message.owner !== undefined && (obj.owner = message.owner ? Ownership.toJSON(message.owner) : undefined);
    message.recentExecStats !== undefined && (obj.recentExecStats = message.recentExecStats
      ? DataExpressionExecStats.toJSON(message.recentExecStats)
      : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<DataExpression>, I>>(base?: I): DataExpression {
    return DataExpression.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DataExpression>, I>>(object: I): DataExpression {
    const message = createBaseDataExpression();
    message.id = object.id ?? "";
    message.name = object.name ?? "";
    message.sourceCode = object.sourceCode ?? "";
    message.sourceLanguage = object.sourceLanguage ?? "";
    message.comments = object.comments ?? "";
    message.tags = object.tags?.map((e) => e) || [];
    message.moduleReferences = object.moduleReferences?.map((e) => ModuleReference.fromPartial(e)) || [];
    message.owner = (object.owner !== undefined && object.owner !== null)
      ? Ownership.fromPartial(object.owner)
      : undefined;
    message.recentExecStats = (object.recentExecStats !== undefined && object.recentExecStats !== null)
      ? DataExpressionExecStats.fromPartial(object.recentExecStats)
      : undefined;
    return message;
  },
};

function createBaseModuleReference(): ModuleReference {
  return { moduleId: "", version: "" };
}

export const ModuleReference = {
  encode(message: ModuleReference, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.moduleId !== "") {
      writer.uint32(10).string(message.moduleId);
    }
    if (message.version !== "") {
      writer.uint32(18).string(message.version);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ModuleReference {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseModuleReference();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.moduleId = reader.string();
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

  fromJSON(object: any): ModuleReference {
    return {
      moduleId: isSet(object.moduleId) ? String(object.moduleId) : "",
      version: isSet(object.version) ? String(object.version) : "",
    };
  },

  toJSON(message: ModuleReference): unknown {
    const obj: any = {};
    message.moduleId !== undefined && (obj.moduleId = message.moduleId);
    message.version !== undefined && (obj.version = message.version);
    return obj;
  },

  create<I extends Exact<DeepPartial<ModuleReference>, I>>(base?: I): ModuleReference {
    return ModuleReference.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ModuleReference>, I>>(object: I): ModuleReference {
    const message = createBaseModuleReference();
    message.moduleId = object.moduleId ?? "";
    message.version = object.version ?? "";
    return message;
  },
};

function createBaseDataExpressionExecStats(): DataExpressionExecStats {
  return { dataRequired: [], runtimeMs: 0, timeStampUnixSec: 0 };
}

export const DataExpressionExecStats = {
  encode(message: DataExpressionExecStats, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.dataRequired) {
      writer.uint32(10).string(v!);
    }
    if (message.runtimeMs !== 0) {
      writer.uint32(21).float(message.runtimeMs);
    }
    if (message.timeStampUnixSec !== 0) {
      writer.uint32(24).uint64(message.timeStampUnixSec);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DataExpressionExecStats {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDataExpressionExecStats();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.dataRequired.push(reader.string());
          continue;
        case 2:
          if (tag !== 21) {
            break;
          }

          message.runtimeMs = reader.float();
          continue;
        case 3:
          if (tag !== 24) {
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

  fromJSON(object: any): DataExpressionExecStats {
    return {
      dataRequired: Array.isArray(object?.dataRequired) ? object.dataRequired.map((e: any) => String(e)) : [],
      runtimeMs: isSet(object.runtimeMs) ? Number(object.runtimeMs) : 0,
      timeStampUnixSec: isSet(object.timeStampUnixSec) ? Number(object.timeStampUnixSec) : 0,
    };
  },

  toJSON(message: DataExpressionExecStats): unknown {
    const obj: any = {};
    if (message.dataRequired) {
      obj.dataRequired = message.dataRequired.map((e) => e);
    } else {
      obj.dataRequired = [];
    }
    message.runtimeMs !== undefined && (obj.runtimeMs = message.runtimeMs);
    message.timeStampUnixSec !== undefined && (obj.timeStampUnixSec = Math.round(message.timeStampUnixSec));
    return obj;
  },

  create<I extends Exact<DeepPartial<DataExpressionExecStats>, I>>(base?: I): DataExpressionExecStats {
    return DataExpressionExecStats.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DataExpressionExecStats>, I>>(object: I): DataExpressionExecStats {
    const message = createBaseDataExpressionExecStats();
    message.dataRequired = object.dataRequired?.map((e) => e) || [];
    message.runtimeMs = object.runtimeMs ?? 0;
    message.timeStampUnixSec = object.timeStampUnixSec ?? 0;
    return message;
  },
};

function createBaseExpressionResultItem(): ExpressionResultItem {
  return { location: 0, values: [] };
}

export const ExpressionResultItem = {
  encode(message: ExpressionResultItem, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.location !== 0) {
      writer.uint32(8).int32(message.location);
    }
    writer.uint32(18).fork();
    for (const v of message.values) {
      writer.float(v);
    }
    writer.ldelim();
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExpressionResultItem {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExpressionResultItem();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.location = reader.int32();
          continue;
        case 2:
          if (tag === 21) {
            message.values.push(reader.float());

            continue;
          }

          if (tag === 18) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.values.push(reader.float());
            }

            continue;
          }

          break;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ExpressionResultItem {
    return {
      location: isSet(object.location) ? Number(object.location) : 0,
      values: Array.isArray(object?.values) ? object.values.map((e: any) => Number(e)) : [],
    };
  },

  toJSON(message: ExpressionResultItem): unknown {
    const obj: any = {};
    message.location !== undefined && (obj.location = Math.round(message.location));
    if (message.values) {
      obj.values = message.values.map((e) => e);
    } else {
      obj.values = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ExpressionResultItem>, I>>(base?: I): ExpressionResultItem {
    return ExpressionResultItem.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ExpressionResultItem>, I>>(object: I): ExpressionResultItem {
    const message = createBaseExpressionResultItem();
    message.location = object.location ?? 0;
    message.values = object.values?.map((e) => e) || [];
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
