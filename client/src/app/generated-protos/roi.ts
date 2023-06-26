/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { Ownership } from "./ownership-access";

export const protobufPackage = "";

export interface ROIItem {
  name: string;
  locationIndexes: number[];
  description: string;
  imageName: string;
  pixelIndexes: number[];
  /** MistROIItem  MistROIItem `json:"mistROIItem"` */
  tags: string[];
  owner: Ownership | undefined;
}

export interface ROIItemSummary {
  name: string;
  description: string;
  imageName: string;
  tags: string[];
  owner: Ownership | undefined;
}

export interface ROIItemWithId {
  id: string;
  item: ROIItem | undefined;
}

function createBaseROIItem(): ROIItem {
  return {
    name: "",
    locationIndexes: [],
    description: "",
    imageName: "",
    pixelIndexes: [],
    tags: [],
    owner: undefined,
  };
}

export const ROIItem = {
  encode(message: ROIItem, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.name !== "") {
      writer.uint32(10).string(message.name);
    }
    writer.uint32(18).fork();
    for (const v of message.locationIndexes) {
      writer.uint32(v);
    }
    writer.ldelim();
    if (message.description !== "") {
      writer.uint32(26).string(message.description);
    }
    if (message.imageName !== "") {
      writer.uint32(34).string(message.imageName);
    }
    writer.uint32(42).fork();
    for (const v of message.pixelIndexes) {
      writer.uint32(v);
    }
    writer.ldelim();
    for (const v of message.tags) {
      writer.uint32(58).string(v!);
    }
    if (message.owner !== undefined) {
      Ownership.encode(message.owner, writer.uint32(66).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ROIItem {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseROIItem();
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
          if (tag === 16) {
            message.locationIndexes.push(reader.uint32());

            continue;
          }

          if (tag === 18) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.locationIndexes.push(reader.uint32());
            }

            continue;
          }

          break;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.description = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.imageName = reader.string();
          continue;
        case 5:
          if (tag === 40) {
            message.pixelIndexes.push(reader.uint32());

            continue;
          }

          if (tag === 42) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.pixelIndexes.push(reader.uint32());
            }

            continue;
          }

          break;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.tags.push(reader.string());
          continue;
        case 8:
          if (tag !== 66) {
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

  fromJSON(object: any): ROIItem {
    return {
      name: isSet(object.name) ? String(object.name) : "",
      locationIndexes: Array.isArray(object?.locationIndexes) ? object.locationIndexes.map((e: any) => Number(e)) : [],
      description: isSet(object.description) ? String(object.description) : "",
      imageName: isSet(object.imageName) ? String(object.imageName) : "",
      pixelIndexes: Array.isArray(object?.pixelIndexes) ? object.pixelIndexes.map((e: any) => Number(e)) : [],
      tags: Array.isArray(object?.tags) ? object.tags.map((e: any) => String(e)) : [],
      owner: isSet(object.owner) ? Ownership.fromJSON(object.owner) : undefined,
    };
  },

  toJSON(message: ROIItem): unknown {
    const obj: any = {};
    message.name !== undefined && (obj.name = message.name);
    if (message.locationIndexes) {
      obj.locationIndexes = message.locationIndexes.map((e) => Math.round(e));
    } else {
      obj.locationIndexes = [];
    }
    message.description !== undefined && (obj.description = message.description);
    message.imageName !== undefined && (obj.imageName = message.imageName);
    if (message.pixelIndexes) {
      obj.pixelIndexes = message.pixelIndexes.map((e) => Math.round(e));
    } else {
      obj.pixelIndexes = [];
    }
    if (message.tags) {
      obj.tags = message.tags.map((e) => e);
    } else {
      obj.tags = [];
    }
    message.owner !== undefined && (obj.owner = message.owner ? Ownership.toJSON(message.owner) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<ROIItem>, I>>(base?: I): ROIItem {
    return ROIItem.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ROIItem>, I>>(object: I): ROIItem {
    const message = createBaseROIItem();
    message.name = object.name ?? "";
    message.locationIndexes = object.locationIndexes?.map((e) => e) || [];
    message.description = object.description ?? "";
    message.imageName = object.imageName ?? "";
    message.pixelIndexes = object.pixelIndexes?.map((e) => e) || [];
    message.tags = object.tags?.map((e) => e) || [];
    message.owner = (object.owner !== undefined && object.owner !== null)
      ? Ownership.fromPartial(object.owner)
      : undefined;
    return message;
  },
};

function createBaseROIItemSummary(): ROIItemSummary {
  return { name: "", description: "", imageName: "", tags: [], owner: undefined };
}

export const ROIItemSummary = {
  encode(message: ROIItemSummary, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.name !== "") {
      writer.uint32(10).string(message.name);
    }
    if (message.description !== "") {
      writer.uint32(18).string(message.description);
    }
    if (message.imageName !== "") {
      writer.uint32(26).string(message.imageName);
    }
    for (const v of message.tags) {
      writer.uint32(34).string(v!);
    }
    if (message.owner !== undefined) {
      Ownership.encode(message.owner, writer.uint32(42).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ROIItemSummary {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseROIItemSummary();
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

          message.description = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.imageName = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.tags.push(reader.string());
          continue;
        case 5:
          if (tag !== 42) {
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

  fromJSON(object: any): ROIItemSummary {
    return {
      name: isSet(object.name) ? String(object.name) : "",
      description: isSet(object.description) ? String(object.description) : "",
      imageName: isSet(object.imageName) ? String(object.imageName) : "",
      tags: Array.isArray(object?.tags) ? object.tags.map((e: any) => String(e)) : [],
      owner: isSet(object.owner) ? Ownership.fromJSON(object.owner) : undefined,
    };
  },

  toJSON(message: ROIItemSummary): unknown {
    const obj: any = {};
    message.name !== undefined && (obj.name = message.name);
    message.description !== undefined && (obj.description = message.description);
    message.imageName !== undefined && (obj.imageName = message.imageName);
    if (message.tags) {
      obj.tags = message.tags.map((e) => e);
    } else {
      obj.tags = [];
    }
    message.owner !== undefined && (obj.owner = message.owner ? Ownership.toJSON(message.owner) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<ROIItemSummary>, I>>(base?: I): ROIItemSummary {
    return ROIItemSummary.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ROIItemSummary>, I>>(object: I): ROIItemSummary {
    const message = createBaseROIItemSummary();
    message.name = object.name ?? "";
    message.description = object.description ?? "";
    message.imageName = object.imageName ?? "";
    message.tags = object.tags?.map((e) => e) || [];
    message.owner = (object.owner !== undefined && object.owner !== null)
      ? Ownership.fromPartial(object.owner)
      : undefined;
    return message;
  },
};

function createBaseROIItemWithId(): ROIItemWithId {
  return { id: "", item: undefined };
}

export const ROIItemWithId = {
  encode(message: ROIItemWithId, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    if (message.item !== undefined) {
      ROIItem.encode(message.item, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ROIItemWithId {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseROIItemWithId();
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

          message.item = ROIItem.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ROIItemWithId {
    return {
      id: isSet(object.id) ? String(object.id) : "",
      item: isSet(object.item) ? ROIItem.fromJSON(object.item) : undefined,
    };
  },

  toJSON(message: ROIItemWithId): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    message.item !== undefined && (obj.item = message.item ? ROIItem.toJSON(message.item) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<ROIItemWithId>, I>>(base?: I): ROIItemWithId {
    return ROIItemWithId.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ROIItemWithId>, I>>(object: I): ROIItemWithId {
    const message = createBaseROIItemWithId();
    message.id = object.id ?? "";
    message.item = (object.item !== undefined && object.item !== null) ? ROIItem.fromPartial(object.item) : undefined;
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
