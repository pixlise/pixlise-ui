/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { PseudoIntensityData } from "./pseudo-intensities";
import { ResponseStatus, responseStatusFromJSON, responseStatusToJSON } from "./response";

export const protobufPackage = "";

export interface PseudoIntensityReq {
  scanId: string;
  /** Effectively allows pagination */
  startingLocation: number;
  locationCount: number;
}

export interface PseudoIntensityResp {
  status: ResponseStatus;
  intensityLabels: string[];
  data: PseudoIntensityData | undefined;
}

function createBasePseudoIntensityReq(): PseudoIntensityReq {
  return { scanId: "", startingLocation: 0, locationCount: 0 };
}

export const PseudoIntensityReq = {
  encode(message: PseudoIntensityReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
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

  decode(input: _m0.Reader | Uint8Array, length?: number): PseudoIntensityReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePseudoIntensityReq();
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

  fromJSON(object: any): PseudoIntensityReq {
    return {
      scanId: isSet(object.scanId) ? String(object.scanId) : "",
      startingLocation: isSet(object.startingLocation) ? Number(object.startingLocation) : 0,
      locationCount: isSet(object.locationCount) ? Number(object.locationCount) : 0,
    };
  },

  toJSON(message: PseudoIntensityReq): unknown {
    const obj: any = {};
    message.scanId !== undefined && (obj.scanId = message.scanId);
    message.startingLocation !== undefined && (obj.startingLocation = Math.round(message.startingLocation));
    message.locationCount !== undefined && (obj.locationCount = Math.round(message.locationCount));
    return obj;
  },

  create<I extends Exact<DeepPartial<PseudoIntensityReq>, I>>(base?: I): PseudoIntensityReq {
    return PseudoIntensityReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<PseudoIntensityReq>, I>>(object: I): PseudoIntensityReq {
    const message = createBasePseudoIntensityReq();
    message.scanId = object.scanId ?? "";
    message.startingLocation = object.startingLocation ?? 0;
    message.locationCount = object.locationCount ?? 0;
    return message;
  },
};

function createBasePseudoIntensityResp(): PseudoIntensityResp {
  return { status: 0, intensityLabels: [], data: undefined };
}

export const PseudoIntensityResp = {
  encode(message: PseudoIntensityResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    for (const v of message.intensityLabels) {
      writer.uint32(18).string(v!);
    }
    if (message.data !== undefined) {
      PseudoIntensityData.encode(message.data, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PseudoIntensityResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePseudoIntensityResp();
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

          message.intensityLabels.push(reader.string());
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.data = PseudoIntensityData.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): PseudoIntensityResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      intensityLabels: Array.isArray(object?.intensityLabels) ? object.intensityLabels.map((e: any) => String(e)) : [],
      data: isSet(object.data) ? PseudoIntensityData.fromJSON(object.data) : undefined,
    };
  },

  toJSON(message: PseudoIntensityResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    if (message.intensityLabels) {
      obj.intensityLabels = message.intensityLabels.map((e) => e);
    } else {
      obj.intensityLabels = [];
    }
    message.data !== undefined && (obj.data = message.data ? PseudoIntensityData.toJSON(message.data) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<PseudoIntensityResp>, I>>(base?: I): PseudoIntensityResp {
    return PseudoIntensityResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<PseudoIntensityResp>, I>>(object: I): PseudoIntensityResp {
    const message = createBasePseudoIntensityResp();
    message.status = object.status ?? 0;
    message.intensityLabels = object.intensityLabels?.map((e) => e) || [];
    message.data = (object.data !== undefined && object.data !== null)
      ? PseudoIntensityData.fromPartial(object.data)
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
