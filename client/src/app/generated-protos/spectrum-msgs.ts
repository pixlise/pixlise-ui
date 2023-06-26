/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { ResponseStatus, responseStatusFromJSON, responseStatusToJSON } from "./response";
import { Spectra } from "./spectrum";

export const protobufPackage = "";

export interface SpectrumReq {
  scanId: string;
  /** Effectively allows pagination */
  startingLocation: number;
  locationCount: number;
}

export interface SpectrumResp {
  status: ResponseStatus;
  /** Note a location may have 0 or more spectra */
  spectraPerLocation: Spectra[];
}

function createBaseSpectrumReq(): SpectrumReq {
  return { scanId: "", startingLocation: 0, locationCount: 0 };
}

export const SpectrumReq = {
  encode(message: SpectrumReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.scanId !== "") {
      writer.uint32(10).string(message.scanId);
    }
    if (message.startingLocation !== 0) {
      writer.uint32(16).uint32(message.startingLocation);
    }
    if (message.locationCount !== 0) {
      writer.uint32(24).uint32(message.locationCount);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SpectrumReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSpectrumReq();
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
          if (tag !== 16) {
            break;
          }

          message.startingLocation = reader.uint32();
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.locationCount = reader.uint32();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): SpectrumReq {
    return {
      scanId: isSet(object.scanId) ? String(object.scanId) : "",
      startingLocation: isSet(object.startingLocation) ? Number(object.startingLocation) : 0,
      locationCount: isSet(object.locationCount) ? Number(object.locationCount) : 0,
    };
  },

  toJSON(message: SpectrumReq): unknown {
    const obj: any = {};
    message.scanId !== undefined && (obj.scanId = message.scanId);
    message.startingLocation !== undefined && (obj.startingLocation = Math.round(message.startingLocation));
    message.locationCount !== undefined && (obj.locationCount = Math.round(message.locationCount));
    return obj;
  },

  create<I extends Exact<DeepPartial<SpectrumReq>, I>>(base?: I): SpectrumReq {
    return SpectrumReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SpectrumReq>, I>>(object: I): SpectrumReq {
    const message = createBaseSpectrumReq();
    message.scanId = object.scanId ?? "";
    message.startingLocation = object.startingLocation ?? 0;
    message.locationCount = object.locationCount ?? 0;
    return message;
  },
};

function createBaseSpectrumResp(): SpectrumResp {
  return { status: 0, spectraPerLocation: [] };
}

export const SpectrumResp = {
  encode(message: SpectrumResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    for (const v of message.spectraPerLocation) {
      Spectra.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SpectrumResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSpectrumResp();
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

          message.spectraPerLocation.push(Spectra.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): SpectrumResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      spectraPerLocation: Array.isArray(object?.spectraPerLocation)
        ? object.spectraPerLocation.map((e: any) => Spectra.fromJSON(e))
        : [],
    };
  },

  toJSON(message: SpectrumResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    if (message.spectraPerLocation) {
      obj.spectraPerLocation = message.spectraPerLocation.map((e) => e ? Spectra.toJSON(e) : undefined);
    } else {
      obj.spectraPerLocation = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<SpectrumResp>, I>>(base?: I): SpectrumResp {
    return SpectrumResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SpectrumResp>, I>>(object: I): SpectrumResp {
    const message = createBaseSpectrumResp();
    message.status = object.status ?? 0;
    message.spectraPerLocation = object.spectraPerLocation?.map((e) => Spectra.fromPartial(e)) || [];
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
