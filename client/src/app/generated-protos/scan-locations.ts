/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { ScanMetaDataItem } from "./scan";

export const protobufPackage = "";

/**
 * Defines a single location in a scan. This is type-agnostic, only storing metadata for the location
 * while other data collected at this location is intended to be downloaded by other messages
 * For example, a given location may have
 */
export interface Location {
  /** In PIXL, this is the "PMC" aka "PIXL motor count" value */
  id: number;
  x: number;
  y: number;
  z: number;
  /** Any meta-data for the location is stored here. Examples */
  meta: { [key: number]: ScanMetaDataItem };
}

export interface Location_MetaEntry {
  key: number;
  value: ScanMetaDataItem | undefined;
}

function createBaseLocation(): Location {
  return { id: 0, x: 0, y: 0, z: 0, meta: {} };
}

export const Location = {
  encode(message: Location, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== 0) {
      writer.uint32(8).int32(message.id);
    }
    if (message.x !== 0) {
      writer.uint32(21).float(message.x);
    }
    if (message.y !== 0) {
      writer.uint32(29).float(message.y);
    }
    if (message.z !== 0) {
      writer.uint32(37).float(message.z);
    }
    Object.entries(message.meta).forEach(([key, value]) => {
      Location_MetaEntry.encode({ key: key as any, value }, writer.uint32(42).fork()).ldelim();
    });
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Location {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseLocation();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.id = reader.int32();
          continue;
        case 2:
          if (tag !== 21) {
            break;
          }

          message.x = reader.float();
          continue;
        case 3:
          if (tag !== 29) {
            break;
          }

          message.y = reader.float();
          continue;
        case 4:
          if (tag !== 37) {
            break;
          }

          message.z = reader.float();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          const entry5 = Location_MetaEntry.decode(reader, reader.uint32());
          if (entry5.value !== undefined) {
            message.meta[entry5.key] = entry5.value;
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

  fromJSON(object: any): Location {
    return {
      id: isSet(object.id) ? Number(object.id) : 0,
      x: isSet(object.x) ? Number(object.x) : 0,
      y: isSet(object.y) ? Number(object.y) : 0,
      z: isSet(object.z) ? Number(object.z) : 0,
      meta: isObject(object.meta)
        ? Object.entries(object.meta).reduce<{ [key: number]: ScanMetaDataItem }>((acc, [key, value]) => {
          acc[Number(key)] = ScanMetaDataItem.fromJSON(value);
          return acc;
        }, {})
        : {},
    };
  },

  toJSON(message: Location): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = Math.round(message.id));
    message.x !== undefined && (obj.x = message.x);
    message.y !== undefined && (obj.y = message.y);
    message.z !== undefined && (obj.z = message.z);
    obj.meta = {};
    if (message.meta) {
      Object.entries(message.meta).forEach(([k, v]) => {
        obj.meta[k] = ScanMetaDataItem.toJSON(v);
      });
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Location>, I>>(base?: I): Location {
    return Location.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<Location>, I>>(object: I): Location {
    const message = createBaseLocation();
    message.id = object.id ?? 0;
    message.x = object.x ?? 0;
    message.y = object.y ?? 0;
    message.z = object.z ?? 0;
    message.meta = Object.entries(object.meta ?? {}).reduce<{ [key: number]: ScanMetaDataItem }>(
      (acc, [key, value]) => {
        if (value !== undefined) {
          acc[Number(key)] = ScanMetaDataItem.fromPartial(value);
        }
        return acc;
      },
      {},
    );
    return message;
  },
};

function createBaseLocation_MetaEntry(): Location_MetaEntry {
  return { key: 0, value: undefined };
}

export const Location_MetaEntry = {
  encode(message: Location_MetaEntry, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.key !== 0) {
      writer.uint32(8).int32(message.key);
    }
    if (message.value !== undefined) {
      ScanMetaDataItem.encode(message.value, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Location_MetaEntry {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseLocation_MetaEntry();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.key = reader.int32();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.value = ScanMetaDataItem.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Location_MetaEntry {
    return {
      key: isSet(object.key) ? Number(object.key) : 0,
      value: isSet(object.value) ? ScanMetaDataItem.fromJSON(object.value) : undefined,
    };
  },

  toJSON(message: Location_MetaEntry): unknown {
    const obj: any = {};
    message.key !== undefined && (obj.key = Math.round(message.key));
    message.value !== undefined && (obj.value = message.value ? ScanMetaDataItem.toJSON(message.value) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<Location_MetaEntry>, I>>(base?: I): Location_MetaEntry {
    return Location_MetaEntry.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<Location_MetaEntry>, I>>(object: I): Location_MetaEntry {
    const message = createBaseLocation_MetaEntry();
    message.key = object.key ?? 0;
    message.value = (object.value !== undefined && object.value !== null)
      ? ScanMetaDataItem.fromPartial(object.value)
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
