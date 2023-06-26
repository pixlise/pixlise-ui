/* eslint-disable */
import * as _m0 from "protobufjs/minimal";

export const protobufPackage = "";

export interface DetectorConfig {
  minElement: number;
  maxElement: number;
  xrfeVLowerBound: number;
  xrfeVUpperBound: number;
  xrfeVResolution: number;
  windowElement: number;
  tubeElement: number;
  defaultParams: string;
  mmBeamRadius: number;
}

function createBaseDetectorConfig(): DetectorConfig {
  return {
    minElement: 0,
    maxElement: 0,
    xrfeVLowerBound: 0,
    xrfeVUpperBound: 0,
    xrfeVResolution: 0,
    windowElement: 0,
    tubeElement: 0,
    defaultParams: "",
    mmBeamRadius: 0,
  };
}

export const DetectorConfig = {
  encode(message: DetectorConfig, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.minElement !== 0) {
      writer.uint32(8).int32(message.minElement);
    }
    if (message.maxElement !== 0) {
      writer.uint32(16).int32(message.maxElement);
    }
    if (message.xrfeVLowerBound !== 0) {
      writer.uint32(24).int32(message.xrfeVLowerBound);
    }
    if (message.xrfeVUpperBound !== 0) {
      writer.uint32(32).int32(message.xrfeVUpperBound);
    }
    if (message.xrfeVResolution !== 0) {
      writer.uint32(40).int32(message.xrfeVResolution);
    }
    if (message.windowElement !== 0) {
      writer.uint32(48).int32(message.windowElement);
    }
    if (message.tubeElement !== 0) {
      writer.uint32(56).int32(message.tubeElement);
    }
    if (message.defaultParams !== "") {
      writer.uint32(66).string(message.defaultParams);
    }
    if (message.mmBeamRadius !== 0) {
      writer.uint32(77).float(message.mmBeamRadius);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DetectorConfig {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDetectorConfig();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.minElement = reader.int32();
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.maxElement = reader.int32();
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.xrfeVLowerBound = reader.int32();
          continue;
        case 4:
          if (tag !== 32) {
            break;
          }

          message.xrfeVUpperBound = reader.int32();
          continue;
        case 5:
          if (tag !== 40) {
            break;
          }

          message.xrfeVResolution = reader.int32();
          continue;
        case 6:
          if (tag !== 48) {
            break;
          }

          message.windowElement = reader.int32();
          continue;
        case 7:
          if (tag !== 56) {
            break;
          }

          message.tubeElement = reader.int32();
          continue;
        case 8:
          if (tag !== 66) {
            break;
          }

          message.defaultParams = reader.string();
          continue;
        case 9:
          if (tag !== 77) {
            break;
          }

          message.mmBeamRadius = reader.float();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): DetectorConfig {
    return {
      minElement: isSet(object.minElement) ? Number(object.minElement) : 0,
      maxElement: isSet(object.maxElement) ? Number(object.maxElement) : 0,
      xrfeVLowerBound: isSet(object.xrfeVLowerBound) ? Number(object.xrfeVLowerBound) : 0,
      xrfeVUpperBound: isSet(object.xrfeVUpperBound) ? Number(object.xrfeVUpperBound) : 0,
      xrfeVResolution: isSet(object.xrfeVResolution) ? Number(object.xrfeVResolution) : 0,
      windowElement: isSet(object.windowElement) ? Number(object.windowElement) : 0,
      tubeElement: isSet(object.tubeElement) ? Number(object.tubeElement) : 0,
      defaultParams: isSet(object.defaultParams) ? String(object.defaultParams) : "",
      mmBeamRadius: isSet(object.mmBeamRadius) ? Number(object.mmBeamRadius) : 0,
    };
  },

  toJSON(message: DetectorConfig): unknown {
    const obj: any = {};
    message.minElement !== undefined && (obj.minElement = Math.round(message.minElement));
    message.maxElement !== undefined && (obj.maxElement = Math.round(message.maxElement));
    message.xrfeVLowerBound !== undefined && (obj.xrfeVLowerBound = Math.round(message.xrfeVLowerBound));
    message.xrfeVUpperBound !== undefined && (obj.xrfeVUpperBound = Math.round(message.xrfeVUpperBound));
    message.xrfeVResolution !== undefined && (obj.xrfeVResolution = Math.round(message.xrfeVResolution));
    message.windowElement !== undefined && (obj.windowElement = Math.round(message.windowElement));
    message.tubeElement !== undefined && (obj.tubeElement = Math.round(message.tubeElement));
    message.defaultParams !== undefined && (obj.defaultParams = message.defaultParams);
    message.mmBeamRadius !== undefined && (obj.mmBeamRadius = message.mmBeamRadius);
    return obj;
  },

  create<I extends Exact<DeepPartial<DetectorConfig>, I>>(base?: I): DetectorConfig {
    return DetectorConfig.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DetectorConfig>, I>>(object: I): DetectorConfig {
    const message = createBaseDetectorConfig();
    message.minElement = object.minElement ?? 0;
    message.maxElement = object.maxElement ?? 0;
    message.xrfeVLowerBound = object.xrfeVLowerBound ?? 0;
    message.xrfeVUpperBound = object.xrfeVUpperBound ?? 0;
    message.xrfeVResolution = object.xrfeVResolution ?? 0;
    message.windowElement = object.windowElement ?? 0;
    message.tubeElement = object.tubeElement ?? 0;
    message.defaultParams = object.defaultParams ?? "";
    message.mmBeamRadius = object.mmBeamRadius ?? 0;
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
