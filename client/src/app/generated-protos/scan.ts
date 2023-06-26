/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { AccessControl, Ownership } from "./ownership-access";

export const protobufPackage = "";

export enum ScanDataType {
  /** SD_UNKNOWN - https://protobuf.dev/programming-guides/dos-donts/ says specify an unknown as 0 */
  SD_UNKNOWN = 0,
  SD_IMAGE = 1,
  SD_XRF = 2,
  SD_RGBU = 3,
  UNRECOGNIZED = -1,
}

export function scanDataTypeFromJSON(object: any): ScanDataType {
  switch (object) {
    case 0:
    case "SD_UNKNOWN":
      return ScanDataType.SD_UNKNOWN;
    case 1:
    case "SD_IMAGE":
      return ScanDataType.SD_IMAGE;
    case 2:
    case "SD_XRF":
      return ScanDataType.SD_XRF;
    case 3:
    case "SD_RGBU":
      return ScanDataType.SD_RGBU;
    case -1:
    case "UNRECOGNIZED":
    default:
      return ScanDataType.UNRECOGNIZED;
  }
}

export function scanDataTypeToJSON(object: ScanDataType): string {
  switch (object) {
    case ScanDataType.SD_UNKNOWN:
      return "SD_UNKNOWN";
    case ScanDataType.SD_IMAGE:
      return "SD_IMAGE";
    case ScanDataType.SD_XRF:
      return "SD_XRF";
    case ScanDataType.SD_RGBU:
      return "SD_RGBU";
    case ScanDataType.UNRECOGNIZED:
    default:
      return "UNRECOGNIZED";
  }
}

export enum ScanInstrument {
  /** UNKNOWN_INSTRUMENT - https://protobuf.dev/programming-guides/dos-donts/ says specify an unknown as 0 */
  UNKNOWN_INSTRUMENT = 0,
  PIXL_FM = 1,
  PIXL_EM = 2,
  /** JPL_BREADBOARD - future possibilities like BRUKER, etc... */
  JPL_BREADBOARD = 3,
  UNRECOGNIZED = -1,
}

export function scanInstrumentFromJSON(object: any): ScanInstrument {
  switch (object) {
    case 0:
    case "UNKNOWN_INSTRUMENT":
      return ScanInstrument.UNKNOWN_INSTRUMENT;
    case 1:
    case "PIXL_FM":
      return ScanInstrument.PIXL_FM;
    case 2:
    case "PIXL_EM":
      return ScanInstrument.PIXL_EM;
    case 3:
    case "JPL_BREADBOARD":
      return ScanInstrument.JPL_BREADBOARD;
    case -1:
    case "UNRECOGNIZED":
    default:
      return ScanInstrument.UNRECOGNIZED;
  }
}

export function scanInstrumentToJSON(object: ScanInstrument): string {
  switch (object) {
    case ScanInstrument.UNKNOWN_INSTRUMENT:
      return "UNKNOWN_INSTRUMENT";
    case ScanInstrument.PIXL_FM:
      return "PIXL_FM";
    case ScanInstrument.PIXL_EM:
      return "PIXL_EM";
    case ScanInstrument.JPL_BREADBOARD:
      return "JPL_BREADBOARD";
    case ScanInstrument.UNRECOGNIZED:
    default:
      return "UNRECOGNIZED";
  }
}

export interface ScanItem {
  /** Unique ID for this scan */
  id: string;
  /** Title to show for this scan */
  title: string;
  /** Description to show */
  description: string;
  dataTypes: ScanItem_ScanTypeCount[];
  /** The instrument that collected the scan */
  instrument: ScanInstrument;
  /**
   * Configuration name of the instrument as text
   * For PIXL, this is the detector config used, so we run quantifications with
   * the correct config
   */
  instrumentConfig: string;
  /**
   * Unix time stamp for this scan (just to order it, so we don't care if this is the
   * time when the instrument did the scan, or when data was ingested into PIXLISE,
   * just need a time!)
   */
  timestampUnixSec: string;
  /**
   * Meta-data for the scan to describe in an instrument-specific way when and where
   * it was collected
   *
   * NOTE: for PIXL scans, these will contain:
   * driveId, drive
   * siteId, site,
   * targetId, target
   * sol
   * RTT (round-trip token)
   * SCLK
   */
  meta: { [key: string]: string };
  /**
   * Contents for the scan - what data types it has, and how many
   * NOTE: for PIXL scans, this will contain:
   * normalSpectra (count)
   * dwellSpectra (count)
   * bulkSpectra (count)
   * maxSpectra (count)
   * pseudoIntensity (count)
   * images (count)
   */
  contentCounts: { [key: string]: number };
  /** For PIXL this is how many PMCs */
  scanPoints: number;
  /** Optional, but dataset may have been uploaded by a given user */
  owner:
    | Ownership
    | undefined;
  /** Who is allowed to access this scan */
  access: AccessControl | undefined;
}

/**
 * Contains the type and how many of each
 * For PIXL:
 * XRF (PMC count)
 * IMAGE (MCC count+custom image count)
 * RGBU (0 or 2)
 */
export interface ScanItem_ScanTypeCount {
  dataType: ScanDataType;
  count: number;
}

export interface ScanItem_MetaEntry {
  key: string;
  value: string;
}

export interface ScanItem_ContentCountsEntry {
  key: string;
  value: number;
}

export interface ScanMetaDataItem {
  /**
   * Only storing the metadata label outside of the item, here we just store its index
   * This index refers to the strings defined in ScanMetaLabelsResp
   */
  labelIndex: number;
  fvalue?: number | undefined;
  ivalue?: number | undefined;
  svalue?: string | undefined;
}

function createBaseScanItem(): ScanItem {
  return {
    id: "",
    title: "",
    description: "",
    dataTypes: [],
    instrument: 0,
    instrumentConfig: "",
    timestampUnixSec: "",
    meta: {},
    contentCounts: {},
    scanPoints: 0,
    owner: undefined,
    access: undefined,
  };
}

export const ScanItem = {
  encode(message: ScanItem, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    if (message.title !== "") {
      writer.uint32(18).string(message.title);
    }
    if (message.description !== "") {
      writer.uint32(26).string(message.description);
    }
    for (const v of message.dataTypes) {
      ScanItem_ScanTypeCount.encode(v!, writer.uint32(34).fork()).ldelim();
    }
    if (message.instrument !== 0) {
      writer.uint32(40).int32(message.instrument);
    }
    if (message.instrumentConfig !== "") {
      writer.uint32(50).string(message.instrumentConfig);
    }
    if (message.timestampUnixSec !== "") {
      writer.uint32(58).string(message.timestampUnixSec);
    }
    Object.entries(message.meta).forEach(([key, value]) => {
      ScanItem_MetaEntry.encode({ key: key as any, value }, writer.uint32(66).fork()).ldelim();
    });
    Object.entries(message.contentCounts).forEach(([key, value]) => {
      ScanItem_ContentCountsEntry.encode({ key: key as any, value }, writer.uint32(74).fork()).ldelim();
    });
    if (message.scanPoints !== 0) {
      writer.uint32(80).uint32(message.scanPoints);
    }
    if (message.owner !== undefined) {
      Ownership.encode(message.owner, writer.uint32(90).fork()).ldelim();
    }
    if (message.access !== undefined) {
      AccessControl.encode(message.access, writer.uint32(98).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ScanItem {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseScanItem();
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

          message.title = reader.string();
          continue;
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

          message.dataTypes.push(ScanItem_ScanTypeCount.decode(reader, reader.uint32()));
          continue;
        case 5:
          if (tag !== 40) {
            break;
          }

          message.instrument = reader.int32() as any;
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.instrumentConfig = reader.string();
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.timestampUnixSec = reader.string();
          continue;
        case 8:
          if (tag !== 66) {
            break;
          }

          const entry8 = ScanItem_MetaEntry.decode(reader, reader.uint32());
          if (entry8.value !== undefined) {
            message.meta[entry8.key] = entry8.value;
          }
          continue;
        case 9:
          if (tag !== 74) {
            break;
          }

          const entry9 = ScanItem_ContentCountsEntry.decode(reader, reader.uint32());
          if (entry9.value !== undefined) {
            message.contentCounts[entry9.key] = entry9.value;
          }
          continue;
        case 10:
          if (tag !== 80) {
            break;
          }

          message.scanPoints = reader.uint32();
          continue;
        case 11:
          if (tag !== 90) {
            break;
          }

          message.owner = Ownership.decode(reader, reader.uint32());
          continue;
        case 12:
          if (tag !== 98) {
            break;
          }

          message.access = AccessControl.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ScanItem {
    return {
      id: isSet(object.id) ? String(object.id) : "",
      title: isSet(object.title) ? String(object.title) : "",
      description: isSet(object.description) ? String(object.description) : "",
      dataTypes: Array.isArray(object?.dataTypes)
        ? object.dataTypes.map((e: any) => ScanItem_ScanTypeCount.fromJSON(e))
        : [],
      instrument: isSet(object.instrument) ? scanInstrumentFromJSON(object.instrument) : 0,
      instrumentConfig: isSet(object.instrumentConfig) ? String(object.instrumentConfig) : "",
      timestampUnixSec: isSet(object.timestampUnixSec) ? String(object.timestampUnixSec) : "",
      meta: isObject(object.meta)
        ? Object.entries(object.meta).reduce<{ [key: string]: string }>((acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        }, {})
        : {},
      contentCounts: isObject(object.contentCounts)
        ? Object.entries(object.contentCounts).reduce<{ [key: string]: number }>((acc, [key, value]) => {
          acc[key] = Number(value);
          return acc;
        }, {})
        : {},
      scanPoints: isSet(object.scanPoints) ? Number(object.scanPoints) : 0,
      owner: isSet(object.owner) ? Ownership.fromJSON(object.owner) : undefined,
      access: isSet(object.access) ? AccessControl.fromJSON(object.access) : undefined,
    };
  },

  toJSON(message: ScanItem): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    message.title !== undefined && (obj.title = message.title);
    message.description !== undefined && (obj.description = message.description);
    if (message.dataTypes) {
      obj.dataTypes = message.dataTypes.map((e) => e ? ScanItem_ScanTypeCount.toJSON(e) : undefined);
    } else {
      obj.dataTypes = [];
    }
    message.instrument !== undefined && (obj.instrument = scanInstrumentToJSON(message.instrument));
    message.instrumentConfig !== undefined && (obj.instrumentConfig = message.instrumentConfig);
    message.timestampUnixSec !== undefined && (obj.timestampUnixSec = message.timestampUnixSec);
    obj.meta = {};
    if (message.meta) {
      Object.entries(message.meta).forEach(([k, v]) => {
        obj.meta[k] = v;
      });
    }
    obj.contentCounts = {};
    if (message.contentCounts) {
      Object.entries(message.contentCounts).forEach(([k, v]) => {
        obj.contentCounts[k] = Math.round(v);
      });
    }
    message.scanPoints !== undefined && (obj.scanPoints = Math.round(message.scanPoints));
    message.owner !== undefined && (obj.owner = message.owner ? Ownership.toJSON(message.owner) : undefined);
    message.access !== undefined && (obj.access = message.access ? AccessControl.toJSON(message.access) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<ScanItem>, I>>(base?: I): ScanItem {
    return ScanItem.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ScanItem>, I>>(object: I): ScanItem {
    const message = createBaseScanItem();
    message.id = object.id ?? "";
    message.title = object.title ?? "";
    message.description = object.description ?? "";
    message.dataTypes = object.dataTypes?.map((e) => ScanItem_ScanTypeCount.fromPartial(e)) || [];
    message.instrument = object.instrument ?? 0;
    message.instrumentConfig = object.instrumentConfig ?? "";
    message.timestampUnixSec = object.timestampUnixSec ?? "";
    message.meta = Object.entries(object.meta ?? {}).reduce<{ [key: string]: string }>((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = String(value);
      }
      return acc;
    }, {});
    message.contentCounts = Object.entries(object.contentCounts ?? {}).reduce<{ [key: string]: number }>(
      (acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = Number(value);
        }
        return acc;
      },
      {},
    );
    message.scanPoints = object.scanPoints ?? 0;
    message.owner = (object.owner !== undefined && object.owner !== null)
      ? Ownership.fromPartial(object.owner)
      : undefined;
    message.access = (object.access !== undefined && object.access !== null)
      ? AccessControl.fromPartial(object.access)
      : undefined;
    return message;
  },
};

function createBaseScanItem_ScanTypeCount(): ScanItem_ScanTypeCount {
  return { dataType: 0, count: 0 };
}

export const ScanItem_ScanTypeCount = {
  encode(message: ScanItem_ScanTypeCount, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.dataType !== 0) {
      writer.uint32(8).int32(message.dataType);
    }
    if (message.count !== 0) {
      writer.uint32(16).uint32(message.count);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ScanItem_ScanTypeCount {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseScanItem_ScanTypeCount();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.dataType = reader.int32() as any;
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.count = reader.uint32();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ScanItem_ScanTypeCount {
    return {
      dataType: isSet(object.dataType) ? scanDataTypeFromJSON(object.dataType) : 0,
      count: isSet(object.count) ? Number(object.count) : 0,
    };
  },

  toJSON(message: ScanItem_ScanTypeCount): unknown {
    const obj: any = {};
    message.dataType !== undefined && (obj.dataType = scanDataTypeToJSON(message.dataType));
    message.count !== undefined && (obj.count = Math.round(message.count));
    return obj;
  },

  create<I extends Exact<DeepPartial<ScanItem_ScanTypeCount>, I>>(base?: I): ScanItem_ScanTypeCount {
    return ScanItem_ScanTypeCount.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ScanItem_ScanTypeCount>, I>>(object: I): ScanItem_ScanTypeCount {
    const message = createBaseScanItem_ScanTypeCount();
    message.dataType = object.dataType ?? 0;
    message.count = object.count ?? 0;
    return message;
  },
};

function createBaseScanItem_MetaEntry(): ScanItem_MetaEntry {
  return { key: "", value: "" };
}

export const ScanItem_MetaEntry = {
  encode(message: ScanItem_MetaEntry, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.key !== "") {
      writer.uint32(10).string(message.key);
    }
    if (message.value !== "") {
      writer.uint32(18).string(message.value);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ScanItem_MetaEntry {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseScanItem_MetaEntry();
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

          message.value = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ScanItem_MetaEntry {
    return { key: isSet(object.key) ? String(object.key) : "", value: isSet(object.value) ? String(object.value) : "" };
  },

  toJSON(message: ScanItem_MetaEntry): unknown {
    const obj: any = {};
    message.key !== undefined && (obj.key = message.key);
    message.value !== undefined && (obj.value = message.value);
    return obj;
  },

  create<I extends Exact<DeepPartial<ScanItem_MetaEntry>, I>>(base?: I): ScanItem_MetaEntry {
    return ScanItem_MetaEntry.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ScanItem_MetaEntry>, I>>(object: I): ScanItem_MetaEntry {
    const message = createBaseScanItem_MetaEntry();
    message.key = object.key ?? "";
    message.value = object.value ?? "";
    return message;
  },
};

function createBaseScanItem_ContentCountsEntry(): ScanItem_ContentCountsEntry {
  return { key: "", value: 0 };
}

export const ScanItem_ContentCountsEntry = {
  encode(message: ScanItem_ContentCountsEntry, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.key !== "") {
      writer.uint32(10).string(message.key);
    }
    if (message.value !== 0) {
      writer.uint32(16).int32(message.value);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ScanItem_ContentCountsEntry {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseScanItem_ContentCountsEntry();
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
          if (tag !== 16) {
            break;
          }

          message.value = reader.int32();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ScanItem_ContentCountsEntry {
    return { key: isSet(object.key) ? String(object.key) : "", value: isSet(object.value) ? Number(object.value) : 0 };
  },

  toJSON(message: ScanItem_ContentCountsEntry): unknown {
    const obj: any = {};
    message.key !== undefined && (obj.key = message.key);
    message.value !== undefined && (obj.value = Math.round(message.value));
    return obj;
  },

  create<I extends Exact<DeepPartial<ScanItem_ContentCountsEntry>, I>>(base?: I): ScanItem_ContentCountsEntry {
    return ScanItem_ContentCountsEntry.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ScanItem_ContentCountsEntry>, I>>(object: I): ScanItem_ContentCountsEntry {
    const message = createBaseScanItem_ContentCountsEntry();
    message.key = object.key ?? "";
    message.value = object.value ?? 0;
    return message;
  },
};

function createBaseScanMetaDataItem(): ScanMetaDataItem {
  return { labelIndex: 0, fvalue: undefined, ivalue: undefined, svalue: undefined };
}

export const ScanMetaDataItem = {
  encode(message: ScanMetaDataItem, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.labelIndex !== 0) {
      writer.uint32(8).int32(message.labelIndex);
    }
    if (message.fvalue !== undefined) {
      writer.uint32(21).float(message.fvalue);
    }
    if (message.ivalue !== undefined) {
      writer.uint32(24).int32(message.ivalue);
    }
    if (message.svalue !== undefined) {
      writer.uint32(34).string(message.svalue);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ScanMetaDataItem {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseScanMetaDataItem();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.labelIndex = reader.int32();
          continue;
        case 2:
          if (tag !== 21) {
            break;
          }

          message.fvalue = reader.float();
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.ivalue = reader.int32();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.svalue = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ScanMetaDataItem {
    return {
      labelIndex: isSet(object.labelIndex) ? Number(object.labelIndex) : 0,
      fvalue: isSet(object.fvalue) ? Number(object.fvalue) : undefined,
      ivalue: isSet(object.ivalue) ? Number(object.ivalue) : undefined,
      svalue: isSet(object.svalue) ? String(object.svalue) : undefined,
    };
  },

  toJSON(message: ScanMetaDataItem): unknown {
    const obj: any = {};
    message.labelIndex !== undefined && (obj.labelIndex = Math.round(message.labelIndex));
    message.fvalue !== undefined && (obj.fvalue = message.fvalue);
    message.ivalue !== undefined && (obj.ivalue = Math.round(message.ivalue));
    message.svalue !== undefined && (obj.svalue = message.svalue);
    return obj;
  },

  create<I extends Exact<DeepPartial<ScanMetaDataItem>, I>>(base?: I): ScanMetaDataItem {
    return ScanMetaDataItem.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ScanMetaDataItem>, I>>(object: I): ScanMetaDataItem {
    const message = createBaseScanMetaDataItem();
    message.labelIndex = object.labelIndex ?? 0;
    message.fvalue = object.fvalue ?? undefined;
    message.ivalue = object.ivalue ?? undefined;
    message.svalue = object.svalue ?? undefined;
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
