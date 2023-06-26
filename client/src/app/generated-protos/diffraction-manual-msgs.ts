/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { ManualDiffractionPeak } from "./diffraction";
import { ResponseStatus, responseStatusFromJSON, responseStatusToJSON } from "./response";

export const protobufPackage = "";

export interface DiffractionPeakManualListReq {
  scanId: string;
}

export interface DiffractionPeakManualListResp {
  status: ResponseStatus;
  /** id->ManualDiffractionPeak */
  peaks: { [key: string]: ManualDiffractionPeak };
}

export interface DiffractionPeakManualListResp_PeaksEntry {
  key: string;
  value: ManualDiffractionPeak | undefined;
}

export interface DiffractionPeakManualWriteReq {
  scanId: string;
  diffractionPeakId: string;
  peak: ManualDiffractionPeak | undefined;
}

export interface DiffractionPeakManualWriteResp {
  status: ResponseStatus;
}

export interface DiffractionPeakManualDeleteReq {
  scanId: string;
  diffractionPeakId: string;
}

export interface DiffractionPeakManualDeleteResp {
  status: ResponseStatus;
}

function createBaseDiffractionPeakManualListReq(): DiffractionPeakManualListReq {
  return { scanId: "" };
}

export const DiffractionPeakManualListReq = {
  encode(message: DiffractionPeakManualListReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.scanId !== "") {
      writer.uint32(10).string(message.scanId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DiffractionPeakManualListReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDiffractionPeakManualListReq();
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

  fromJSON(object: any): DiffractionPeakManualListReq {
    return { scanId: isSet(object.scanId) ? String(object.scanId) : "" };
  },

  toJSON(message: DiffractionPeakManualListReq): unknown {
    const obj: any = {};
    message.scanId !== undefined && (obj.scanId = message.scanId);
    return obj;
  },

  create<I extends Exact<DeepPartial<DiffractionPeakManualListReq>, I>>(base?: I): DiffractionPeakManualListReq {
    return DiffractionPeakManualListReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DiffractionPeakManualListReq>, I>>(object: I): DiffractionPeakManualListReq {
    const message = createBaseDiffractionPeakManualListReq();
    message.scanId = object.scanId ?? "";
    return message;
  },
};

function createBaseDiffractionPeakManualListResp(): DiffractionPeakManualListResp {
  return { status: 0, peaks: {} };
}

export const DiffractionPeakManualListResp = {
  encode(message: DiffractionPeakManualListResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    Object.entries(message.peaks).forEach(([key, value]) => {
      DiffractionPeakManualListResp_PeaksEntry.encode({ key: key as any, value }, writer.uint32(18).fork()).ldelim();
    });
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DiffractionPeakManualListResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDiffractionPeakManualListResp();
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

          const entry2 = DiffractionPeakManualListResp_PeaksEntry.decode(reader, reader.uint32());
          if (entry2.value !== undefined) {
            message.peaks[entry2.key] = entry2.value;
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

  fromJSON(object: any): DiffractionPeakManualListResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      peaks: isObject(object.peaks)
        ? Object.entries(object.peaks).reduce<{ [key: string]: ManualDiffractionPeak }>((acc, [key, value]) => {
          acc[key] = ManualDiffractionPeak.fromJSON(value);
          return acc;
        }, {})
        : {},
    };
  },

  toJSON(message: DiffractionPeakManualListResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    obj.peaks = {};
    if (message.peaks) {
      Object.entries(message.peaks).forEach(([k, v]) => {
        obj.peaks[k] = ManualDiffractionPeak.toJSON(v);
      });
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<DiffractionPeakManualListResp>, I>>(base?: I): DiffractionPeakManualListResp {
    return DiffractionPeakManualListResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DiffractionPeakManualListResp>, I>>(
    object: I,
  ): DiffractionPeakManualListResp {
    const message = createBaseDiffractionPeakManualListResp();
    message.status = object.status ?? 0;
    message.peaks = Object.entries(object.peaks ?? {}).reduce<{ [key: string]: ManualDiffractionPeak }>(
      (acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = ManualDiffractionPeak.fromPartial(value);
        }
        return acc;
      },
      {},
    );
    return message;
  },
};

function createBaseDiffractionPeakManualListResp_PeaksEntry(): DiffractionPeakManualListResp_PeaksEntry {
  return { key: "", value: undefined };
}

export const DiffractionPeakManualListResp_PeaksEntry = {
  encode(message: DiffractionPeakManualListResp_PeaksEntry, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.key !== "") {
      writer.uint32(10).string(message.key);
    }
    if (message.value !== undefined) {
      ManualDiffractionPeak.encode(message.value, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DiffractionPeakManualListResp_PeaksEntry {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDiffractionPeakManualListResp_PeaksEntry();
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

          message.value = ManualDiffractionPeak.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): DiffractionPeakManualListResp_PeaksEntry {
    return {
      key: isSet(object.key) ? String(object.key) : "",
      value: isSet(object.value) ? ManualDiffractionPeak.fromJSON(object.value) : undefined,
    };
  },

  toJSON(message: DiffractionPeakManualListResp_PeaksEntry): unknown {
    const obj: any = {};
    message.key !== undefined && (obj.key = message.key);
    message.value !== undefined &&
      (obj.value = message.value ? ManualDiffractionPeak.toJSON(message.value) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<DiffractionPeakManualListResp_PeaksEntry>, I>>(
    base?: I,
  ): DiffractionPeakManualListResp_PeaksEntry {
    return DiffractionPeakManualListResp_PeaksEntry.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DiffractionPeakManualListResp_PeaksEntry>, I>>(
    object: I,
  ): DiffractionPeakManualListResp_PeaksEntry {
    const message = createBaseDiffractionPeakManualListResp_PeaksEntry();
    message.key = object.key ?? "";
    message.value = (object.value !== undefined && object.value !== null)
      ? ManualDiffractionPeak.fromPartial(object.value)
      : undefined;
    return message;
  },
};

function createBaseDiffractionPeakManualWriteReq(): DiffractionPeakManualWriteReq {
  return { scanId: "", diffractionPeakId: "", peak: undefined };
}

export const DiffractionPeakManualWriteReq = {
  encode(message: DiffractionPeakManualWriteReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.scanId !== "") {
      writer.uint32(10).string(message.scanId);
    }
    if (message.diffractionPeakId !== "") {
      writer.uint32(18).string(message.diffractionPeakId);
    }
    if (message.peak !== undefined) {
      ManualDiffractionPeak.encode(message.peak, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DiffractionPeakManualWriteReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDiffractionPeakManualWriteReq();
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

          message.diffractionPeakId = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.peak = ManualDiffractionPeak.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): DiffractionPeakManualWriteReq {
    return {
      scanId: isSet(object.scanId) ? String(object.scanId) : "",
      diffractionPeakId: isSet(object.diffractionPeakId) ? String(object.diffractionPeakId) : "",
      peak: isSet(object.peak) ? ManualDiffractionPeak.fromJSON(object.peak) : undefined,
    };
  },

  toJSON(message: DiffractionPeakManualWriteReq): unknown {
    const obj: any = {};
    message.scanId !== undefined && (obj.scanId = message.scanId);
    message.diffractionPeakId !== undefined && (obj.diffractionPeakId = message.diffractionPeakId);
    message.peak !== undefined && (obj.peak = message.peak ? ManualDiffractionPeak.toJSON(message.peak) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<DiffractionPeakManualWriteReq>, I>>(base?: I): DiffractionPeakManualWriteReq {
    return DiffractionPeakManualWriteReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DiffractionPeakManualWriteReq>, I>>(
    object: I,
  ): DiffractionPeakManualWriteReq {
    const message = createBaseDiffractionPeakManualWriteReq();
    message.scanId = object.scanId ?? "";
    message.diffractionPeakId = object.diffractionPeakId ?? "";
    message.peak = (object.peak !== undefined && object.peak !== null)
      ? ManualDiffractionPeak.fromPartial(object.peak)
      : undefined;
    return message;
  },
};

function createBaseDiffractionPeakManualWriteResp(): DiffractionPeakManualWriteResp {
  return { status: 0 };
}

export const DiffractionPeakManualWriteResp = {
  encode(message: DiffractionPeakManualWriteResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DiffractionPeakManualWriteResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDiffractionPeakManualWriteResp();
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

  fromJSON(object: any): DiffractionPeakManualWriteResp {
    return { status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0 };
  },

  toJSON(message: DiffractionPeakManualWriteResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    return obj;
  },

  create<I extends Exact<DeepPartial<DiffractionPeakManualWriteResp>, I>>(base?: I): DiffractionPeakManualWriteResp {
    return DiffractionPeakManualWriteResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DiffractionPeakManualWriteResp>, I>>(
    object: I,
  ): DiffractionPeakManualWriteResp {
    const message = createBaseDiffractionPeakManualWriteResp();
    message.status = object.status ?? 0;
    return message;
  },
};

function createBaseDiffractionPeakManualDeleteReq(): DiffractionPeakManualDeleteReq {
  return { scanId: "", diffractionPeakId: "" };
}

export const DiffractionPeakManualDeleteReq = {
  encode(message: DiffractionPeakManualDeleteReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.scanId !== "") {
      writer.uint32(10).string(message.scanId);
    }
    if (message.diffractionPeakId !== "") {
      writer.uint32(18).string(message.diffractionPeakId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DiffractionPeakManualDeleteReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDiffractionPeakManualDeleteReq();
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

          message.diffractionPeakId = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): DiffractionPeakManualDeleteReq {
    return {
      scanId: isSet(object.scanId) ? String(object.scanId) : "",
      diffractionPeakId: isSet(object.diffractionPeakId) ? String(object.diffractionPeakId) : "",
    };
  },

  toJSON(message: DiffractionPeakManualDeleteReq): unknown {
    const obj: any = {};
    message.scanId !== undefined && (obj.scanId = message.scanId);
    message.diffractionPeakId !== undefined && (obj.diffractionPeakId = message.diffractionPeakId);
    return obj;
  },

  create<I extends Exact<DeepPartial<DiffractionPeakManualDeleteReq>, I>>(base?: I): DiffractionPeakManualDeleteReq {
    return DiffractionPeakManualDeleteReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DiffractionPeakManualDeleteReq>, I>>(
    object: I,
  ): DiffractionPeakManualDeleteReq {
    const message = createBaseDiffractionPeakManualDeleteReq();
    message.scanId = object.scanId ?? "";
    message.diffractionPeakId = object.diffractionPeakId ?? "";
    return message;
  },
};

function createBaseDiffractionPeakManualDeleteResp(): DiffractionPeakManualDeleteResp {
  return { status: 0 };
}

export const DiffractionPeakManualDeleteResp = {
  encode(message: DiffractionPeakManualDeleteResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DiffractionPeakManualDeleteResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDiffractionPeakManualDeleteResp();
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

  fromJSON(object: any): DiffractionPeakManualDeleteResp {
    return { status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0 };
  },

  toJSON(message: DiffractionPeakManualDeleteResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    return obj;
  },

  create<I extends Exact<DeepPartial<DiffractionPeakManualDeleteResp>, I>>(base?: I): DiffractionPeakManualDeleteResp {
    return DiffractionPeakManualDeleteResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DiffractionPeakManualDeleteResp>, I>>(
    object: I,
  ): DiffractionPeakManualDeleteResp {
    const message = createBaseDiffractionPeakManualDeleteResp();
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
