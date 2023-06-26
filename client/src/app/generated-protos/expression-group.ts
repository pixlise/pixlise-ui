/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { Ownership } from "./ownership-access";

export const protobufPackage = "";

export interface ExpressionGroupItem {
  expressionID: string;
  rangeMin: number;
  rangeMax: number;
}

export interface ExpressionGroup {
  name: string;
  groupItems: ExpressionGroupItem[];
  tags: string[];
  owner: Ownership | undefined;
}

function createBaseExpressionGroupItem(): ExpressionGroupItem {
  return { expressionID: "", rangeMin: 0, rangeMax: 0 };
}

export const ExpressionGroupItem = {
  encode(message: ExpressionGroupItem, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.expressionID !== "") {
      writer.uint32(10).string(message.expressionID);
    }
    if (message.rangeMin !== 0) {
      writer.uint32(21).float(message.rangeMin);
    }
    if (message.rangeMax !== 0) {
      writer.uint32(29).float(message.rangeMax);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExpressionGroupItem {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExpressionGroupItem();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.expressionID = reader.string();
          continue;
        case 2:
          if (tag !== 21) {
            break;
          }

          message.rangeMin = reader.float();
          continue;
        case 3:
          if (tag !== 29) {
            break;
          }

          message.rangeMax = reader.float();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ExpressionGroupItem {
    return {
      expressionID: isSet(object.expressionID) ? String(object.expressionID) : "",
      rangeMin: isSet(object.rangeMin) ? Number(object.rangeMin) : 0,
      rangeMax: isSet(object.rangeMax) ? Number(object.rangeMax) : 0,
    };
  },

  toJSON(message: ExpressionGroupItem): unknown {
    const obj: any = {};
    message.expressionID !== undefined && (obj.expressionID = message.expressionID);
    message.rangeMin !== undefined && (obj.rangeMin = message.rangeMin);
    message.rangeMax !== undefined && (obj.rangeMax = message.rangeMax);
    return obj;
  },

  create<I extends Exact<DeepPartial<ExpressionGroupItem>, I>>(base?: I): ExpressionGroupItem {
    return ExpressionGroupItem.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ExpressionGroupItem>, I>>(object: I): ExpressionGroupItem {
    const message = createBaseExpressionGroupItem();
    message.expressionID = object.expressionID ?? "";
    message.rangeMin = object.rangeMin ?? 0;
    message.rangeMax = object.rangeMax ?? 0;
    return message;
  },
};

function createBaseExpressionGroup(): ExpressionGroup {
  return { name: "", groupItems: [], tags: [], owner: undefined };
}

export const ExpressionGroup = {
  encode(message: ExpressionGroup, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.name !== "") {
      writer.uint32(10).string(message.name);
    }
    for (const v of message.groupItems) {
      ExpressionGroupItem.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    for (const v of message.tags) {
      writer.uint32(26).string(v!);
    }
    if (message.owner !== undefined) {
      Ownership.encode(message.owner, writer.uint32(34).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExpressionGroup {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExpressionGroup();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.name = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.groupItems.push(ExpressionGroupItem.decode(reader, reader.uint32()));
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.tags.push(reader.string());
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.owner = Ownership.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ExpressionGroup {
    return {
      name: isSet(object.name) ? String(object.name) : "",
      groupItems: Array.isArray(object?.groupItems)
        ? object.groupItems.map((e: any) => ExpressionGroupItem.fromJSON(e))
        : [],
      tags: Array.isArray(object?.tags) ? object.tags.map((e: any) => String(e)) : [],
      owner: isSet(object.owner) ? Ownership.fromJSON(object.owner) : undefined,
    };
  },

  toJSON(message: ExpressionGroup): unknown {
    const obj: any = {};
    message.name !== undefined && (obj.name = message.name);
    if (message.groupItems) {
      obj.groupItems = message.groupItems.map((e) => e ? ExpressionGroupItem.toJSON(e) : undefined);
    } else {
      obj.groupItems = [];
    }
    if (message.tags) {
      obj.tags = message.tags.map((e) => e);
    } else {
      obj.tags = [];
    }
    message.owner !== undefined && (obj.owner = message.owner ? Ownership.toJSON(message.owner) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<ExpressionGroup>, I>>(base?: I): ExpressionGroup {
    return ExpressionGroup.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ExpressionGroup>, I>>(object: I): ExpressionGroup {
    const message = createBaseExpressionGroup();
    message.name = object.name ?? "";
    message.groupItems = object.groupItems?.map((e) => ExpressionGroupItem.fromPartial(e)) || [];
    message.tags = object.tags?.map((e) => e) || [];
    message.owner = (object.owner !== undefined && object.owner !== null)
      ? Ownership.fromPartial(object.owner)
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
