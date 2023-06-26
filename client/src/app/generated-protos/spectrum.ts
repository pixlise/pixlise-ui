/* eslint-disable */
import * as Long from "long";
import * as _m0 from "protobufjs/minimal";
import { ScanMetaDataItem } from "./scan";

export const protobufPackage = "";

export enum SpectrumType {
  SPECTRUM_UNKNOWN = 0,
  SPECTRUM_MAX = 1,
  SPECTRUM_BULK = 2,
  SPECTRUM_NORMAL = 3,
  SPECTRUM_DWELL = 4,
  UNRECOGNIZED = -1,
}

export function spectrumTypeFromJSON(object: any): SpectrumType {
  switch (object) {
    case 0:
    case "SPECTRUM_UNKNOWN":
      return SpectrumType.SPECTRUM_UNKNOWN;
    case 1:
    case "SPECTRUM_MAX":
      return SpectrumType.SPECTRUM_MAX;
    case 2:
    case "SPECTRUM_BULK":
      return SpectrumType.SPECTRUM_BULK;
    case 3:
    case "SPECTRUM_NORMAL":
      return SpectrumType.SPECTRUM_NORMAL;
    case 4:
    case "SPECTRUM_DWELL":
      return SpectrumType.SPECTRUM_DWELL;
    case -1:
    case "UNRECOGNIZED":
    default:
      return SpectrumType.UNRECOGNIZED;
  }
}

export function spectrumTypeToJSON(object: SpectrumType): string {
  switch (object) {
    case SpectrumType.SPECTRUM_UNKNOWN:
      return "SPECTRUM_UNKNOWN";
    case SpectrumType.SPECTRUM_MAX:
      return "SPECTRUM_MAX";
    case SpectrumType.SPECTRUM_BULK:
      return "SPECTRUM_BULK";
    case SpectrumType.SPECTRUM_NORMAL:
      return "SPECTRUM_NORMAL";
    case SpectrumType.SPECTRUM_DWELL:
      return "SPECTRUM_DWELL";
    case SpectrumType.UNRECOGNIZED:
    default:
      return "UNRECOGNIZED";
  }
}

export interface Spectrum {
  /** Which detector the spectrum is from */
  detector: string;
  /** We store some "special" spectra in a dataset, such as the bulk-sum of all spectra, so */
  type: SpectrumType;
  /**
   * it doesn't need to be calculated on the fly. It's also calculated on-board by the PIXL
   * instrument
   */
  counts: number[];
  /** The maximum count found in the entire spectrum */
  maxCount: number;
  /** Any meta-data for a spectrum is stored here. Examples are values in */
  meta: { [key: number]: ScanMetaDataItem };
}

export interface Spectrum_MetaEntry {
  key: number;
  value: ScanMetaDataItem | undefined;
}

export interface Spectra {
  spectra: Spectrum[];
}

function createBaseSpectrum(): Spectrum {
  return { detector: "", type: 0, counts: [], maxCount: 0, meta: {} };
}

export const Spectrum = {
  encode(message: Spectrum, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.detector !== "") {
      writer.uint32(10).string(message.detector);
    }
    if (message.type !== 0) {
      writer.uint32(16).int32(message.type);
    }
    writer.uint32(26).fork();
    for (const v of message.counts) {
      writer.int64(v);
    }
    writer.ldelim();
    if (message.maxCount !== 0) {
      writer.uint32(32).int64(message.maxCount);
    }
    Object.entries(message.meta).forEach(([key, value]) => {
      Spectrum_MetaEntry.encode({ key: key as any, value }, writer.uint32(42).fork()).ldelim();
    });
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Spectrum {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSpectrum();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.detector = reader.string();
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.type = reader.int32() as any;
          continue;
        case 3:
          if (tag === 24) {
            message.counts.push(longToNumber(reader.int64() as Long));

            continue;
          }

          if (tag === 26) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.counts.push(longToNumber(reader.int64() as Long));
            }

            continue;
          }

          break;
        case 4:
          if (tag !== 32) {
            break;
          }

          message.maxCount = longToNumber(reader.int64() as Long);
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          const entry5 = Spectrum_MetaEntry.decode(reader, reader.uint32());
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

  fromJSON(object: any): Spectrum {
    return {
      detector: isSet(object.detector) ? String(object.detector) : "",
      type: isSet(object.type) ? spectrumTypeFromJSON(object.type) : 0,
      counts: Array.isArray(object?.counts) ? object.counts.map((e: any) => Number(e)) : [],
      maxCount: isSet(object.maxCount) ? Number(object.maxCount) : 0,
      meta: isObject(object.meta)
        ? Object.entries(object.meta).reduce<{ [key: number]: ScanMetaDataItem }>((acc, [key, value]) => {
          acc[Number(key)] = ScanMetaDataItem.fromJSON(value);
          return acc;
        }, {})
        : {},
    };
  },

  toJSON(message: Spectrum): unknown {
    const obj: any = {};
    message.detector !== undefined && (obj.detector = message.detector);
    message.type !== undefined && (obj.type = spectrumTypeToJSON(message.type));
    if (message.counts) {
      obj.counts = message.counts.map((e) => Math.round(e));
    } else {
      obj.counts = [];
    }
    message.maxCount !== undefined && (obj.maxCount = Math.round(message.maxCount));
    obj.meta = {};
    if (message.meta) {
      Object.entries(message.meta).forEach(([k, v]) => {
        obj.meta[k] = ScanMetaDataItem.toJSON(v);
      });
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Spectrum>, I>>(base?: I): Spectrum {
    return Spectrum.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<Spectrum>, I>>(object: I): Spectrum {
    const message = createBaseSpectrum();
    message.detector = object.detector ?? "";
    message.type = object.type ?? 0;
    message.counts = object.counts?.map((e) => e) || [];
    message.maxCount = object.maxCount ?? 0;
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

function createBaseSpectrum_MetaEntry(): Spectrum_MetaEntry {
  return { key: 0, value: undefined };
}

export const Spectrum_MetaEntry = {
  encode(message: Spectrum_MetaEntry, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.key !== 0) {
      writer.uint32(8).int32(message.key);
    }
    if (message.value !== undefined) {
      ScanMetaDataItem.encode(message.value, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Spectrum_MetaEntry {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSpectrum_MetaEntry();
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

  fromJSON(object: any): Spectrum_MetaEntry {
    return {
      key: isSet(object.key) ? Number(object.key) : 0,
      value: isSet(object.value) ? ScanMetaDataItem.fromJSON(object.value) : undefined,
    };
  },

  toJSON(message: Spectrum_MetaEntry): unknown {
    const obj: any = {};
    message.key !== undefined && (obj.key = Math.round(message.key));
    message.value !== undefined && (obj.value = message.value ? ScanMetaDataItem.toJSON(message.value) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<Spectrum_MetaEntry>, I>>(base?: I): Spectrum_MetaEntry {
    return Spectrum_MetaEntry.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<Spectrum_MetaEntry>, I>>(object: I): Spectrum_MetaEntry {
    const message = createBaseSpectrum_MetaEntry();
    message.key = object.key ?? 0;
    message.value = (object.value !== undefined && object.value !== null)
      ? ScanMetaDataItem.fromPartial(object.value)
      : undefined;
    return message;
  },
};

function createBaseSpectra(): Spectra {
  return { spectra: [] };
}

export const Spectra = {
  encode(message: Spectra, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.spectra) {
      Spectrum.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Spectra {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSpectra();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.spectra.push(Spectrum.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Spectra {
    return { spectra: Array.isArray(object?.spectra) ? object.spectra.map((e: any) => Spectrum.fromJSON(e)) : [] };
  },

  toJSON(message: Spectra): unknown {
    const obj: any = {};
    if (message.spectra) {
      obj.spectra = message.spectra.map((e) => e ? Spectrum.toJSON(e) : undefined);
    } else {
      obj.spectra = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Spectra>, I>>(base?: I): Spectra {
    return Spectra.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<Spectra>, I>>(object: I): Spectra {
    const message = createBaseSpectra();
    message.spectra = object.spectra?.map((e) => Spectrum.fromPartial(e)) || [];
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

function isObject(value: any): boolean {
  return typeof value === "object" && value !== null;
}

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
