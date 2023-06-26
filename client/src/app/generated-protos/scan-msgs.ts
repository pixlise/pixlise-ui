/* eslint-disable */
import * as Long from "long";
import * as _m0 from "protobufjs/minimal";
import { ResponseStatus, responseStatusFromJSON, responseStatusToJSON } from "./response";
import { ScanItem } from "./scan";

export const protobufPackage = "";

/**
 * Allows listing scans. Contains search fields. If these are all blank
 * all scans are returned
 */
export interface ScanListReq {
  /**
   * Allows flexible fields, because scans have flexible metadata
   * but for PIXL suggestions are:
   * - driveId, drive
   * - siteId, site,
   * - targetId, target
   * - sol
   * - RTT (round-trip token)
   * - SCLK
   * - hasDwell
   * - hasNormal
   * Others (generic):
   * - title
   * - description
   * - instrument
   * - timeStampUnixSec
   */
  searchFilters: { [key: string]: string };
  /**
   * Allows specifying limits around meta values, such as in PIXL's
   * case, we would allow:
   * - sol
   * - RTT
   * - SCLK
   * - PMCs
   * Others (generic):
   * - timeStampUnixSec
   * (Otherwise use exact matching in searchFilters)
   */
  searchMinMaxFilters: { [key: string]: ScanListReq_MinMaxInt };
}

export interface ScanListReq_SearchFiltersEntry {
  key: string;
  value: string;
}

export interface ScanListReq_MinMaxInt {
  min: number;
  max: number;
}

export interface ScanListReq_SearchMinMaxFiltersEntry {
  key: string;
  value: ScanListReq_MinMaxInt | undefined;
}

export interface ScanListResp {
  status: ResponseStatus;
  scans: ScanItem[];
}

/**
 * This just notifies client that something changed... we don't send out a list
 * of all scans because of the filtering possibilities in the request!
 * If we added/modified or deleted a scan, that has to be re-requested by the client
 * potentially after offering the user the option?
 */
export interface ScanListUpd {
}

/** This should trigger a ScanListUpd to go out */
export interface ScanUploadReq {
  id: string;
  /** currently only allows jpl-breadboard */
  format: string;
  /** jpl-breadboard implies this is a zip file of MSA files */
  zippedData: Uint8Array;
}

export interface ScanUploadResp {
  status: ResponseStatus;
}

/** This should trigger a ScanListUpd to go out */
export interface ScanMetaWriteReq {
  scanId: string;
  title: string;
  description: string;
  metaFields: { [key: string]: string };
}

export interface ScanMetaWriteReq_MetaFieldsEntry {
  key: string;
  value: string;
}

export interface ScanMetaWriteResp {
  status: ResponseStatus;
}

/**
 * Triggering a re-import, should publish a ScanListUpd to go out
 * Useful really only if there is a pipeline hooked up for this kind of data that we
 * can re-trigger for. If it's a user-uploaded scan, we can't do anything really...
 */
export interface ScanTriggerReImportReq {
  scanId: string;
}

export interface ScanTriggerReImportResp {
  status: ResponseStatus;
}

export interface ScanMetaLabelsReq {
  scanId: string;
}

export interface ScanMetaLabelsResp {
  status: ResponseStatus;
  metaLabels: string[];
}

function createBaseScanListReq(): ScanListReq {
  return { searchFilters: {}, searchMinMaxFilters: {} };
}

export const ScanListReq = {
  encode(message: ScanListReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    Object.entries(message.searchFilters).forEach(([key, value]) => {
      ScanListReq_SearchFiltersEntry.encode({ key: key as any, value }, writer.uint32(10).fork()).ldelim();
    });
    Object.entries(message.searchMinMaxFilters).forEach(([key, value]) => {
      ScanListReq_SearchMinMaxFiltersEntry.encode({ key: key as any, value }, writer.uint32(18).fork()).ldelim();
    });
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ScanListReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseScanListReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          const entry1 = ScanListReq_SearchFiltersEntry.decode(reader, reader.uint32());
          if (entry1.value !== undefined) {
            message.searchFilters[entry1.key] = entry1.value;
          }
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          const entry2 = ScanListReq_SearchMinMaxFiltersEntry.decode(reader, reader.uint32());
          if (entry2.value !== undefined) {
            message.searchMinMaxFilters[entry2.key] = entry2.value;
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

  fromJSON(object: any): ScanListReq {
    return {
      searchFilters: isObject(object.searchFilters)
        ? Object.entries(object.searchFilters).reduce<{ [key: string]: string }>((acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        }, {})
        : {},
      searchMinMaxFilters: isObject(object.searchMinMaxFilters)
        ? Object.entries(object.searchMinMaxFilters).reduce<{ [key: string]: ScanListReq_MinMaxInt }>(
          (acc, [key, value]) => {
            acc[key] = ScanListReq_MinMaxInt.fromJSON(value);
            return acc;
          },
          {},
        )
        : {},
    };
  },

  toJSON(message: ScanListReq): unknown {
    const obj: any = {};
    obj.searchFilters = {};
    if (message.searchFilters) {
      Object.entries(message.searchFilters).forEach(([k, v]) => {
        obj.searchFilters[k] = v;
      });
    }
    obj.searchMinMaxFilters = {};
    if (message.searchMinMaxFilters) {
      Object.entries(message.searchMinMaxFilters).forEach(([k, v]) => {
        obj.searchMinMaxFilters[k] = ScanListReq_MinMaxInt.toJSON(v);
      });
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ScanListReq>, I>>(base?: I): ScanListReq {
    return ScanListReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ScanListReq>, I>>(object: I): ScanListReq {
    const message = createBaseScanListReq();
    message.searchFilters = Object.entries(object.searchFilters ?? {}).reduce<{ [key: string]: string }>(
      (acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = String(value);
        }
        return acc;
      },
      {},
    );
    message.searchMinMaxFilters = Object.entries(object.searchMinMaxFilters ?? {}).reduce<
      { [key: string]: ScanListReq_MinMaxInt }
    >((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = ScanListReq_MinMaxInt.fromPartial(value);
      }
      return acc;
    }, {});
    return message;
  },
};

function createBaseScanListReq_SearchFiltersEntry(): ScanListReq_SearchFiltersEntry {
  return { key: "", value: "" };
}

export const ScanListReq_SearchFiltersEntry = {
  encode(message: ScanListReq_SearchFiltersEntry, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.key !== "") {
      writer.uint32(10).string(message.key);
    }
    if (message.value !== "") {
      writer.uint32(18).string(message.value);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ScanListReq_SearchFiltersEntry {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseScanListReq_SearchFiltersEntry();
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

  fromJSON(object: any): ScanListReq_SearchFiltersEntry {
    return { key: isSet(object.key) ? String(object.key) : "", value: isSet(object.value) ? String(object.value) : "" };
  },

  toJSON(message: ScanListReq_SearchFiltersEntry): unknown {
    const obj: any = {};
    message.key !== undefined && (obj.key = message.key);
    message.value !== undefined && (obj.value = message.value);
    return obj;
  },

  create<I extends Exact<DeepPartial<ScanListReq_SearchFiltersEntry>, I>>(base?: I): ScanListReq_SearchFiltersEntry {
    return ScanListReq_SearchFiltersEntry.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ScanListReq_SearchFiltersEntry>, I>>(
    object: I,
  ): ScanListReq_SearchFiltersEntry {
    const message = createBaseScanListReq_SearchFiltersEntry();
    message.key = object.key ?? "";
    message.value = object.value ?? "";
    return message;
  },
};

function createBaseScanListReq_MinMaxInt(): ScanListReq_MinMaxInt {
  return { min: 0, max: 0 };
}

export const ScanListReq_MinMaxInt = {
  encode(message: ScanListReq_MinMaxInt, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.min !== 0) {
      writer.uint32(8).int64(message.min);
    }
    if (message.max !== 0) {
      writer.uint32(16).int64(message.max);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ScanListReq_MinMaxInt {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseScanListReq_MinMaxInt();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.min = longToNumber(reader.int64() as Long);
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.max = longToNumber(reader.int64() as Long);
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ScanListReq_MinMaxInt {
    return { min: isSet(object.min) ? Number(object.min) : 0, max: isSet(object.max) ? Number(object.max) : 0 };
  },

  toJSON(message: ScanListReq_MinMaxInt): unknown {
    const obj: any = {};
    message.min !== undefined && (obj.min = Math.round(message.min));
    message.max !== undefined && (obj.max = Math.round(message.max));
    return obj;
  },

  create<I extends Exact<DeepPartial<ScanListReq_MinMaxInt>, I>>(base?: I): ScanListReq_MinMaxInt {
    return ScanListReq_MinMaxInt.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ScanListReq_MinMaxInt>, I>>(object: I): ScanListReq_MinMaxInt {
    const message = createBaseScanListReq_MinMaxInt();
    message.min = object.min ?? 0;
    message.max = object.max ?? 0;
    return message;
  },
};

function createBaseScanListReq_SearchMinMaxFiltersEntry(): ScanListReq_SearchMinMaxFiltersEntry {
  return { key: "", value: undefined };
}

export const ScanListReq_SearchMinMaxFiltersEntry = {
  encode(message: ScanListReq_SearchMinMaxFiltersEntry, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.key !== "") {
      writer.uint32(10).string(message.key);
    }
    if (message.value !== undefined) {
      ScanListReq_MinMaxInt.encode(message.value, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ScanListReq_SearchMinMaxFiltersEntry {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseScanListReq_SearchMinMaxFiltersEntry();
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

          message.value = ScanListReq_MinMaxInt.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ScanListReq_SearchMinMaxFiltersEntry {
    return {
      key: isSet(object.key) ? String(object.key) : "",
      value: isSet(object.value) ? ScanListReq_MinMaxInt.fromJSON(object.value) : undefined,
    };
  },

  toJSON(message: ScanListReq_SearchMinMaxFiltersEntry): unknown {
    const obj: any = {};
    message.key !== undefined && (obj.key = message.key);
    message.value !== undefined &&
      (obj.value = message.value ? ScanListReq_MinMaxInt.toJSON(message.value) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<ScanListReq_SearchMinMaxFiltersEntry>, I>>(
    base?: I,
  ): ScanListReq_SearchMinMaxFiltersEntry {
    return ScanListReq_SearchMinMaxFiltersEntry.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ScanListReq_SearchMinMaxFiltersEntry>, I>>(
    object: I,
  ): ScanListReq_SearchMinMaxFiltersEntry {
    const message = createBaseScanListReq_SearchMinMaxFiltersEntry();
    message.key = object.key ?? "";
    message.value = (object.value !== undefined && object.value !== null)
      ? ScanListReq_MinMaxInt.fromPartial(object.value)
      : undefined;
    return message;
  },
};

function createBaseScanListResp(): ScanListResp {
  return { status: 0, scans: [] };
}

export const ScanListResp = {
  encode(message: ScanListResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    for (const v of message.scans) {
      ScanItem.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ScanListResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseScanListResp();
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

          message.scans.push(ScanItem.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ScanListResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      scans: Array.isArray(object?.scans) ? object.scans.map((e: any) => ScanItem.fromJSON(e)) : [],
    };
  },

  toJSON(message: ScanListResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    if (message.scans) {
      obj.scans = message.scans.map((e) => e ? ScanItem.toJSON(e) : undefined);
    } else {
      obj.scans = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ScanListResp>, I>>(base?: I): ScanListResp {
    return ScanListResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ScanListResp>, I>>(object: I): ScanListResp {
    const message = createBaseScanListResp();
    message.status = object.status ?? 0;
    message.scans = object.scans?.map((e) => ScanItem.fromPartial(e)) || [];
    return message;
  },
};

function createBaseScanListUpd(): ScanListUpd {
  return {};
}

export const ScanListUpd = {
  encode(_: ScanListUpd, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ScanListUpd {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseScanListUpd();
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

  fromJSON(_: any): ScanListUpd {
    return {};
  },

  toJSON(_: ScanListUpd): unknown {
    const obj: any = {};
    return obj;
  },

  create<I extends Exact<DeepPartial<ScanListUpd>, I>>(base?: I): ScanListUpd {
    return ScanListUpd.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ScanListUpd>, I>>(_: I): ScanListUpd {
    const message = createBaseScanListUpd();
    return message;
  },
};

function createBaseScanUploadReq(): ScanUploadReq {
  return { id: "", format: "", zippedData: new Uint8Array() };
}

export const ScanUploadReq = {
  encode(message: ScanUploadReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    if (message.format !== "") {
      writer.uint32(18).string(message.format);
    }
    if (message.zippedData.length !== 0) {
      writer.uint32(26).bytes(message.zippedData);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ScanUploadReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseScanUploadReq();
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

          message.format = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.zippedData = reader.bytes();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ScanUploadReq {
    return {
      id: isSet(object.id) ? String(object.id) : "",
      format: isSet(object.format) ? String(object.format) : "",
      zippedData: isSet(object.zippedData) ? bytesFromBase64(object.zippedData) : new Uint8Array(),
    };
  },

  toJSON(message: ScanUploadReq): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    message.format !== undefined && (obj.format = message.format);
    message.zippedData !== undefined &&
      (obj.zippedData = base64FromBytes(message.zippedData !== undefined ? message.zippedData : new Uint8Array()));
    return obj;
  },

  create<I extends Exact<DeepPartial<ScanUploadReq>, I>>(base?: I): ScanUploadReq {
    return ScanUploadReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ScanUploadReq>, I>>(object: I): ScanUploadReq {
    const message = createBaseScanUploadReq();
    message.id = object.id ?? "";
    message.format = object.format ?? "";
    message.zippedData = object.zippedData ?? new Uint8Array();
    return message;
  },
};

function createBaseScanUploadResp(): ScanUploadResp {
  return { status: 0 };
}

export const ScanUploadResp = {
  encode(message: ScanUploadResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ScanUploadResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseScanUploadResp();
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

  fromJSON(object: any): ScanUploadResp {
    return { status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0 };
  },

  toJSON(message: ScanUploadResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    return obj;
  },

  create<I extends Exact<DeepPartial<ScanUploadResp>, I>>(base?: I): ScanUploadResp {
    return ScanUploadResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ScanUploadResp>, I>>(object: I): ScanUploadResp {
    const message = createBaseScanUploadResp();
    message.status = object.status ?? 0;
    return message;
  },
};

function createBaseScanMetaWriteReq(): ScanMetaWriteReq {
  return { scanId: "", title: "", description: "", metaFields: {} };
}

export const ScanMetaWriteReq = {
  encode(message: ScanMetaWriteReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.scanId !== "") {
      writer.uint32(10).string(message.scanId);
    }
    if (message.title !== "") {
      writer.uint32(18).string(message.title);
    }
    if (message.description !== "") {
      writer.uint32(26).string(message.description);
    }
    Object.entries(message.metaFields).forEach(([key, value]) => {
      ScanMetaWriteReq_MetaFieldsEntry.encode({ key: key as any, value }, writer.uint32(34).fork()).ldelim();
    });
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ScanMetaWriteReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseScanMetaWriteReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.scanId = reader.string();
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

          const entry4 = ScanMetaWriteReq_MetaFieldsEntry.decode(reader, reader.uint32());
          if (entry4.value !== undefined) {
            message.metaFields[entry4.key] = entry4.value;
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

  fromJSON(object: any): ScanMetaWriteReq {
    return {
      scanId: isSet(object.scanId) ? String(object.scanId) : "",
      title: isSet(object.title) ? String(object.title) : "",
      description: isSet(object.description) ? String(object.description) : "",
      metaFields: isObject(object.metaFields)
        ? Object.entries(object.metaFields).reduce<{ [key: string]: string }>((acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        }, {})
        : {},
    };
  },

  toJSON(message: ScanMetaWriteReq): unknown {
    const obj: any = {};
    message.scanId !== undefined && (obj.scanId = message.scanId);
    message.title !== undefined && (obj.title = message.title);
    message.description !== undefined && (obj.description = message.description);
    obj.metaFields = {};
    if (message.metaFields) {
      Object.entries(message.metaFields).forEach(([k, v]) => {
        obj.metaFields[k] = v;
      });
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ScanMetaWriteReq>, I>>(base?: I): ScanMetaWriteReq {
    return ScanMetaWriteReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ScanMetaWriteReq>, I>>(object: I): ScanMetaWriteReq {
    const message = createBaseScanMetaWriteReq();
    message.scanId = object.scanId ?? "";
    message.title = object.title ?? "";
    message.description = object.description ?? "";
    message.metaFields = Object.entries(object.metaFields ?? {}).reduce<{ [key: string]: string }>(
      (acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = String(value);
        }
        return acc;
      },
      {},
    );
    return message;
  },
};

function createBaseScanMetaWriteReq_MetaFieldsEntry(): ScanMetaWriteReq_MetaFieldsEntry {
  return { key: "", value: "" };
}

export const ScanMetaWriteReq_MetaFieldsEntry = {
  encode(message: ScanMetaWriteReq_MetaFieldsEntry, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.key !== "") {
      writer.uint32(10).string(message.key);
    }
    if (message.value !== "") {
      writer.uint32(18).string(message.value);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ScanMetaWriteReq_MetaFieldsEntry {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseScanMetaWriteReq_MetaFieldsEntry();
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

  fromJSON(object: any): ScanMetaWriteReq_MetaFieldsEntry {
    return { key: isSet(object.key) ? String(object.key) : "", value: isSet(object.value) ? String(object.value) : "" };
  },

  toJSON(message: ScanMetaWriteReq_MetaFieldsEntry): unknown {
    const obj: any = {};
    message.key !== undefined && (obj.key = message.key);
    message.value !== undefined && (obj.value = message.value);
    return obj;
  },

  create<I extends Exact<DeepPartial<ScanMetaWriteReq_MetaFieldsEntry>, I>>(
    base?: I,
  ): ScanMetaWriteReq_MetaFieldsEntry {
    return ScanMetaWriteReq_MetaFieldsEntry.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ScanMetaWriteReq_MetaFieldsEntry>, I>>(
    object: I,
  ): ScanMetaWriteReq_MetaFieldsEntry {
    const message = createBaseScanMetaWriteReq_MetaFieldsEntry();
    message.key = object.key ?? "";
    message.value = object.value ?? "";
    return message;
  },
};

function createBaseScanMetaWriteResp(): ScanMetaWriteResp {
  return { status: 0 };
}

export const ScanMetaWriteResp = {
  encode(message: ScanMetaWriteResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ScanMetaWriteResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseScanMetaWriteResp();
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

  fromJSON(object: any): ScanMetaWriteResp {
    return { status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0 };
  },

  toJSON(message: ScanMetaWriteResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    return obj;
  },

  create<I extends Exact<DeepPartial<ScanMetaWriteResp>, I>>(base?: I): ScanMetaWriteResp {
    return ScanMetaWriteResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ScanMetaWriteResp>, I>>(object: I): ScanMetaWriteResp {
    const message = createBaseScanMetaWriteResp();
    message.status = object.status ?? 0;
    return message;
  },
};

function createBaseScanTriggerReImportReq(): ScanTriggerReImportReq {
  return { scanId: "" };
}

export const ScanTriggerReImportReq = {
  encode(message: ScanTriggerReImportReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.scanId !== "") {
      writer.uint32(10).string(message.scanId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ScanTriggerReImportReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseScanTriggerReImportReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.scanId = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ScanTriggerReImportReq {
    return { scanId: isSet(object.scanId) ? String(object.scanId) : "" };
  },

  toJSON(message: ScanTriggerReImportReq): unknown {
    const obj: any = {};
    message.scanId !== undefined && (obj.scanId = message.scanId);
    return obj;
  },

  create<I extends Exact<DeepPartial<ScanTriggerReImportReq>, I>>(base?: I): ScanTriggerReImportReq {
    return ScanTriggerReImportReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ScanTriggerReImportReq>, I>>(object: I): ScanTriggerReImportReq {
    const message = createBaseScanTriggerReImportReq();
    message.scanId = object.scanId ?? "";
    return message;
  },
};

function createBaseScanTriggerReImportResp(): ScanTriggerReImportResp {
  return { status: 0 };
}

export const ScanTriggerReImportResp = {
  encode(message: ScanTriggerReImportResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ScanTriggerReImportResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseScanTriggerReImportResp();
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

  fromJSON(object: any): ScanTriggerReImportResp {
    return { status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0 };
  },

  toJSON(message: ScanTriggerReImportResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    return obj;
  },

  create<I extends Exact<DeepPartial<ScanTriggerReImportResp>, I>>(base?: I): ScanTriggerReImportResp {
    return ScanTriggerReImportResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ScanTriggerReImportResp>, I>>(object: I): ScanTriggerReImportResp {
    const message = createBaseScanTriggerReImportResp();
    message.status = object.status ?? 0;
    return message;
  },
};

function createBaseScanMetaLabelsReq(): ScanMetaLabelsReq {
  return { scanId: "" };
}

export const ScanMetaLabelsReq = {
  encode(message: ScanMetaLabelsReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.scanId !== "") {
      writer.uint32(10).string(message.scanId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ScanMetaLabelsReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseScanMetaLabelsReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.scanId = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ScanMetaLabelsReq {
    return { scanId: isSet(object.scanId) ? String(object.scanId) : "" };
  },

  toJSON(message: ScanMetaLabelsReq): unknown {
    const obj: any = {};
    message.scanId !== undefined && (obj.scanId = message.scanId);
    return obj;
  },

  create<I extends Exact<DeepPartial<ScanMetaLabelsReq>, I>>(base?: I): ScanMetaLabelsReq {
    return ScanMetaLabelsReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ScanMetaLabelsReq>, I>>(object: I): ScanMetaLabelsReq {
    const message = createBaseScanMetaLabelsReq();
    message.scanId = object.scanId ?? "";
    return message;
  },
};

function createBaseScanMetaLabelsResp(): ScanMetaLabelsResp {
  return { status: 0, metaLabels: [] };
}

export const ScanMetaLabelsResp = {
  encode(message: ScanMetaLabelsResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    for (const v of message.metaLabels) {
      writer.uint32(18).string(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ScanMetaLabelsResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseScanMetaLabelsResp();
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

          message.metaLabels.push(reader.string());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ScanMetaLabelsResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      metaLabels: Array.isArray(object?.metaLabels) ? object.metaLabels.map((e: any) => String(e)) : [],
    };
  },

  toJSON(message: ScanMetaLabelsResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    if (message.metaLabels) {
      obj.metaLabels = message.metaLabels.map((e) => e);
    } else {
      obj.metaLabels = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ScanMetaLabelsResp>, I>>(base?: I): ScanMetaLabelsResp {
    return ScanMetaLabelsResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ScanMetaLabelsResp>, I>>(object: I): ScanMetaLabelsResp {
    const message = createBaseScanMetaLabelsResp();
    message.status = object.status ?? 0;
    message.metaLabels = object.metaLabels?.map((e) => e) || [];
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

function bytesFromBase64(b64: string): Uint8Array {
  if (tsProtoGlobalThis.Buffer) {
    return Uint8Array.from(tsProtoGlobalThis.Buffer.from(b64, "base64"));
  } else {
    const bin = tsProtoGlobalThis.atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; ++i) {
      arr[i] = bin.charCodeAt(i);
    }
    return arr;
  }
}

function base64FromBytes(arr: Uint8Array): string {
  if (tsProtoGlobalThis.Buffer) {
    return tsProtoGlobalThis.Buffer.from(arr).toString("base64");
  } else {
    const bin: string[] = [];
    arr.forEach((byte) => {
      bin.push(String.fromCharCode(byte));
    });
    return tsProtoGlobalThis.btoa(bin.join(""));
  }
}

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

function isObject(value: any): boolean {
  return typeof value === "object" && value !== null;
}

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
