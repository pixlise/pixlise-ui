/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { ResponseStatus, responseStatusFromJSON, responseStatusToJSON } from "./response";
import { ROIItem, ROIItemSummary, ROIItemWithId } from "./roi";

export const protobufPackage = "";

export interface RegionOfInterestListReq {
}

export interface RegionOfInterestListResp {
  status: ResponseStatus;
  RegionsOfInterest: { [key: string]: ROIItemSummary };
}

export interface RegionOfInterestListResp_RegionsOfInterestEntry {
  key: string;
  value: ROIItemSummary | undefined;
}

export interface RegionOfInterestReq {
  id: string;
}

export interface RegionOfInterestResp {
  status: ResponseStatus;
  RegionOfInterest: ROIItem | undefined;
}

export interface RegionOfInterestWriteReq {
  /**
   * For each of these, if ID is blank, assume it's a new one (and we return the ID), otherwise
   * assume it's an overwrite
   */
  items: ROIItemWithId[];
}

export interface RegionOfInterestWriteResp {
  status: ResponseStatus;
  items: ROIItemWithId[];
}

export interface RegionOfInterestDeleteReq {
  id: string;
}

export interface RegionOfInterestDeleteResp {
  status: ResponseStatus;
}

function createBaseRegionOfInterestListReq(): RegionOfInterestListReq {
  return {};
}

export const RegionOfInterestListReq = {
  encode(_: RegionOfInterestListReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): RegionOfInterestListReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRegionOfInterestListReq();
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

  fromJSON(_: any): RegionOfInterestListReq {
    return {};
  },

  toJSON(_: RegionOfInterestListReq): unknown {
    const obj: any = {};
    return obj;
  },

  create<I extends Exact<DeepPartial<RegionOfInterestListReq>, I>>(base?: I): RegionOfInterestListReq {
    return RegionOfInterestListReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<RegionOfInterestListReq>, I>>(_: I): RegionOfInterestListReq {
    const message = createBaseRegionOfInterestListReq();
    return message;
  },
};

function createBaseRegionOfInterestListResp(): RegionOfInterestListResp {
  return { status: 0, RegionsOfInterest: {} };
}

export const RegionOfInterestListResp = {
  encode(message: RegionOfInterestListResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    Object.entries(message.RegionsOfInterest).forEach(([key, value]) => {
      RegionOfInterestListResp_RegionsOfInterestEntry.encode({ key: key as any, value }, writer.uint32(18).fork())
        .ldelim();
    });
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): RegionOfInterestListResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRegionOfInterestListResp();
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

          const entry2 = RegionOfInterestListResp_RegionsOfInterestEntry.decode(reader, reader.uint32());
          if (entry2.value !== undefined) {
            message.RegionsOfInterest[entry2.key] = entry2.value;
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

  fromJSON(object: any): RegionOfInterestListResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      RegionsOfInterest: isObject(object.RegionsOfInterest)
        ? Object.entries(object.RegionsOfInterest).reduce<{ [key: string]: ROIItemSummary }>((acc, [key, value]) => {
          acc[key] = ROIItemSummary.fromJSON(value);
          return acc;
        }, {})
        : {},
    };
  },

  toJSON(message: RegionOfInterestListResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    obj.RegionsOfInterest = {};
    if (message.RegionsOfInterest) {
      Object.entries(message.RegionsOfInterest).forEach(([k, v]) => {
        obj.RegionsOfInterest[k] = ROIItemSummary.toJSON(v);
      });
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<RegionOfInterestListResp>, I>>(base?: I): RegionOfInterestListResp {
    return RegionOfInterestListResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<RegionOfInterestListResp>, I>>(object: I): RegionOfInterestListResp {
    const message = createBaseRegionOfInterestListResp();
    message.status = object.status ?? 0;
    message.RegionsOfInterest = Object.entries(object.RegionsOfInterest ?? {}).reduce<
      { [key: string]: ROIItemSummary }
    >((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = ROIItemSummary.fromPartial(value);
      }
      return acc;
    }, {});
    return message;
  },
};

function createBaseRegionOfInterestListResp_RegionsOfInterestEntry(): RegionOfInterestListResp_RegionsOfInterestEntry {
  return { key: "", value: undefined };
}

export const RegionOfInterestListResp_RegionsOfInterestEntry = {
  encode(
    message: RegionOfInterestListResp_RegionsOfInterestEntry,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    if (message.key !== "") {
      writer.uint32(10).string(message.key);
    }
    if (message.value !== undefined) {
      ROIItemSummary.encode(message.value, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): RegionOfInterestListResp_RegionsOfInterestEntry {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRegionOfInterestListResp_RegionsOfInterestEntry();
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

          message.value = ROIItemSummary.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): RegionOfInterestListResp_RegionsOfInterestEntry {
    return {
      key: isSet(object.key) ? String(object.key) : "",
      value: isSet(object.value) ? ROIItemSummary.fromJSON(object.value) : undefined,
    };
  },

  toJSON(message: RegionOfInterestListResp_RegionsOfInterestEntry): unknown {
    const obj: any = {};
    message.key !== undefined && (obj.key = message.key);
    message.value !== undefined && (obj.value = message.value ? ROIItemSummary.toJSON(message.value) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<RegionOfInterestListResp_RegionsOfInterestEntry>, I>>(
    base?: I,
  ): RegionOfInterestListResp_RegionsOfInterestEntry {
    return RegionOfInterestListResp_RegionsOfInterestEntry.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<RegionOfInterestListResp_RegionsOfInterestEntry>, I>>(
    object: I,
  ): RegionOfInterestListResp_RegionsOfInterestEntry {
    const message = createBaseRegionOfInterestListResp_RegionsOfInterestEntry();
    message.key = object.key ?? "";
    message.value = (object.value !== undefined && object.value !== null)
      ? ROIItemSummary.fromPartial(object.value)
      : undefined;
    return message;
  },
};

function createBaseRegionOfInterestReq(): RegionOfInterestReq {
  return { id: "" };
}

export const RegionOfInterestReq = {
  encode(message: RegionOfInterestReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): RegionOfInterestReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRegionOfInterestReq();
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

  fromJSON(object: any): RegionOfInterestReq {
    return { id: isSet(object.id) ? String(object.id) : "" };
  },

  toJSON(message: RegionOfInterestReq): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    return obj;
  },

  create<I extends Exact<DeepPartial<RegionOfInterestReq>, I>>(base?: I): RegionOfInterestReq {
    return RegionOfInterestReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<RegionOfInterestReq>, I>>(object: I): RegionOfInterestReq {
    const message = createBaseRegionOfInterestReq();
    message.id = object.id ?? "";
    return message;
  },
};

function createBaseRegionOfInterestResp(): RegionOfInterestResp {
  return { status: 0, RegionOfInterest: undefined };
}

export const RegionOfInterestResp = {
  encode(message: RegionOfInterestResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    if (message.RegionOfInterest !== undefined) {
      ROIItem.encode(message.RegionOfInterest, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): RegionOfInterestResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRegionOfInterestResp();
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

          message.RegionOfInterest = ROIItem.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): RegionOfInterestResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      RegionOfInterest: isSet(object.RegionOfInterest) ? ROIItem.fromJSON(object.RegionOfInterest) : undefined,
    };
  },

  toJSON(message: RegionOfInterestResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    message.RegionOfInterest !== undefined &&
      (obj.RegionOfInterest = message.RegionOfInterest ? ROIItem.toJSON(message.RegionOfInterest) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<RegionOfInterestResp>, I>>(base?: I): RegionOfInterestResp {
    return RegionOfInterestResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<RegionOfInterestResp>, I>>(object: I): RegionOfInterestResp {
    const message = createBaseRegionOfInterestResp();
    message.status = object.status ?? 0;
    message.RegionOfInterest = (object.RegionOfInterest !== undefined && object.RegionOfInterest !== null)
      ? ROIItem.fromPartial(object.RegionOfInterest)
      : undefined;
    return message;
  },
};

function createBaseRegionOfInterestWriteReq(): RegionOfInterestWriteReq {
  return { items: [] };
}

export const RegionOfInterestWriteReq = {
  encode(message: RegionOfInterestWriteReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.items) {
      ROIItemWithId.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): RegionOfInterestWriteReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRegionOfInterestWriteReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.items.push(ROIItemWithId.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): RegionOfInterestWriteReq {
    return { items: Array.isArray(object?.items) ? object.items.map((e: any) => ROIItemWithId.fromJSON(e)) : [] };
  },

  toJSON(message: RegionOfInterestWriteReq): unknown {
    const obj: any = {};
    if (message.items) {
      obj.items = message.items.map((e) => e ? ROIItemWithId.toJSON(e) : undefined);
    } else {
      obj.items = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<RegionOfInterestWriteReq>, I>>(base?: I): RegionOfInterestWriteReq {
    return RegionOfInterestWriteReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<RegionOfInterestWriteReq>, I>>(object: I): RegionOfInterestWriteReq {
    const message = createBaseRegionOfInterestWriteReq();
    message.items = object.items?.map((e) => ROIItemWithId.fromPartial(e)) || [];
    return message;
  },
};

function createBaseRegionOfInterestWriteResp(): RegionOfInterestWriteResp {
  return { status: 0, items: [] };
}

export const RegionOfInterestWriteResp = {
  encode(message: RegionOfInterestWriteResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    for (const v of message.items) {
      ROIItemWithId.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): RegionOfInterestWriteResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRegionOfInterestWriteResp();
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

          message.items.push(ROIItemWithId.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): RegionOfInterestWriteResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      items: Array.isArray(object?.items) ? object.items.map((e: any) => ROIItemWithId.fromJSON(e)) : [],
    };
  },

  toJSON(message: RegionOfInterestWriteResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    if (message.items) {
      obj.items = message.items.map((e) => e ? ROIItemWithId.toJSON(e) : undefined);
    } else {
      obj.items = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<RegionOfInterestWriteResp>, I>>(base?: I): RegionOfInterestWriteResp {
    return RegionOfInterestWriteResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<RegionOfInterestWriteResp>, I>>(object: I): RegionOfInterestWriteResp {
    const message = createBaseRegionOfInterestWriteResp();
    message.status = object.status ?? 0;
    message.items = object.items?.map((e) => ROIItemWithId.fromPartial(e)) || [];
    return message;
  },
};

function createBaseRegionOfInterestDeleteReq(): RegionOfInterestDeleteReq {
  return { id: "" };
}

export const RegionOfInterestDeleteReq = {
  encode(message: RegionOfInterestDeleteReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): RegionOfInterestDeleteReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRegionOfInterestDeleteReq();
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

  fromJSON(object: any): RegionOfInterestDeleteReq {
    return { id: isSet(object.id) ? String(object.id) : "" };
  },

  toJSON(message: RegionOfInterestDeleteReq): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    return obj;
  },

  create<I extends Exact<DeepPartial<RegionOfInterestDeleteReq>, I>>(base?: I): RegionOfInterestDeleteReq {
    return RegionOfInterestDeleteReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<RegionOfInterestDeleteReq>, I>>(object: I): RegionOfInterestDeleteReq {
    const message = createBaseRegionOfInterestDeleteReq();
    message.id = object.id ?? "";
    return message;
  },
};

function createBaseRegionOfInterestDeleteResp(): RegionOfInterestDeleteResp {
  return { status: 0 };
}

export const RegionOfInterestDeleteResp = {
  encode(message: RegionOfInterestDeleteResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): RegionOfInterestDeleteResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRegionOfInterestDeleteResp();
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

  fromJSON(object: any): RegionOfInterestDeleteResp {
    return { status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0 };
  },

  toJSON(message: RegionOfInterestDeleteResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    return obj;
  },

  create<I extends Exact<DeepPartial<RegionOfInterestDeleteResp>, I>>(base?: I): RegionOfInterestDeleteResp {
    return RegionOfInterestDeleteResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<RegionOfInterestDeleteResp>, I>>(object: I): RegionOfInterestDeleteResp {
    const message = createBaseRegionOfInterestDeleteResp();
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
