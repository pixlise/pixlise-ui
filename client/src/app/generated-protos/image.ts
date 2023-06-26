/* eslint-disable */
import * as _m0 from "protobufjs/minimal";

export const protobufPackage = "";

/** Where it came from - the instrument or some other source */
export enum ScanImageSource {
  /** SI_UNKNOWN - https://protobuf.dev/programming-guides/dos-donts/ says specify an unknown as 0 */
  SI_UNKNOWN = 0,
  SI_INSTRUMENT = 1,
  SI_UPLOAD = 2,
  UNRECOGNIZED = -1,
}

export function scanImageSourceFromJSON(object: any): ScanImageSource {
  switch (object) {
    case 0:
    case "SI_UNKNOWN":
      return ScanImageSource.SI_UNKNOWN;
    case 1:
    case "SI_INSTRUMENT":
      return ScanImageSource.SI_INSTRUMENT;
    case 2:
    case "SI_UPLOAD":
      return ScanImageSource.SI_UPLOAD;
    case -1:
    case "UNRECOGNIZED":
    default:
      return ScanImageSource.UNRECOGNIZED;
  }
}

export function scanImageSourceToJSON(object: ScanImageSource): string {
  switch (object) {
    case ScanImageSource.SI_UNKNOWN:
      return "SI_UNKNOWN";
    case ScanImageSource.SI_INSTRUMENT:
      return "SI_INSTRUMENT";
    case ScanImageSource.SI_UPLOAD:
      return "SI_UPLOAD";
    case ScanImageSource.UNRECOGNIZED:
    default:
      return "UNRECOGNIZED";
  }
}

/** Image purpose - is it just for viewing, or perhaps it provides channel data to some algorithm */
export enum ScanImagePurpose {
  /** SIP_UNKNOWN - https://protobuf.dev/programming-guides/dos-donts/ says specify an unknown as 0 */
  SIP_UNKNOWN = 0,
  SIP_VIEWING = 1,
  SIP_MULTICHANNEL = 2,
  UNRECOGNIZED = -1,
}

export function scanImagePurposeFromJSON(object: any): ScanImagePurpose {
  switch (object) {
    case 0:
    case "SIP_UNKNOWN":
      return ScanImagePurpose.SIP_UNKNOWN;
    case 1:
    case "SIP_VIEWING":
      return ScanImagePurpose.SIP_VIEWING;
    case 2:
    case "SIP_MULTICHANNEL":
      return ScanImagePurpose.SIP_MULTICHANNEL;
    case -1:
    case "UNRECOGNIZED":
    default:
      return ScanImagePurpose.UNRECOGNIZED;
  }
}

export function scanImagePurposeToJSON(object: ScanImagePurpose): string {
  switch (object) {
    case ScanImagePurpose.SIP_UNKNOWN:
      return "SIP_UNKNOWN";
    case ScanImagePurpose.SIP_VIEWING:
      return "SIP_VIEWING";
    case ScanImagePurpose.SIP_MULTICHANNEL:
      return "SIP_MULTICHANNEL";
    case ScanImagePurpose.UNRECOGNIZED:
    default:
      return "UNRECOGNIZED";
  }
}

/** Describes a single image that is associated with a scan */
export interface ScanImage {
  fileName: string;
  source: ScanImageSource;
  width: number;
  height: number;
  channels: number;
  purpose: ScanImagePurpose;
  /** So client can send a HTTP GET and image gets cached by browser, etc */
  url: string;
  matchInfo: ScanImage_ImageMatchTransform | undefined;
}

/** If its "matched" to another image, this should be filled out */
export interface ScanImage_ImageMatchTransform {
  matchedImageFileName: string;
  /**
   * The location point the matched image was recorded for
   * This allows PIXLISE to determine which beam location
   * set to use for displaying this image
   */
  matchedImageLocation: number;
  xOffset: number;
  yOffset: number;
  xScale: number;
  yScale: number;
}

function createBaseScanImage(): ScanImage {
  return { fileName: "", source: 0, width: 0, height: 0, channels: 0, purpose: 0, url: "", matchInfo: undefined };
}

export const ScanImage = {
  encode(message: ScanImage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.fileName !== "") {
      writer.uint32(10).string(message.fileName);
    }
    if (message.source !== 0) {
      writer.uint32(16).int32(message.source);
    }
    if (message.width !== 0) {
      writer.uint32(24).uint32(message.width);
    }
    if (message.height !== 0) {
      writer.uint32(32).uint32(message.height);
    }
    if (message.channels !== 0) {
      writer.uint32(40).uint32(message.channels);
    }
    if (message.purpose !== 0) {
      writer.uint32(48).int32(message.purpose);
    }
    if (message.url !== "") {
      writer.uint32(58).string(message.url);
    }
    if (message.matchInfo !== undefined) {
      ScanImage_ImageMatchTransform.encode(message.matchInfo, writer.uint32(66).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ScanImage {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseScanImage();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.fileName = reader.string();
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.source = reader.int32() as any;
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.width = reader.uint32();
          continue;
        case 4:
          if (tag !== 32) {
            break;
          }

          message.height = reader.uint32();
          continue;
        case 5:
          if (tag !== 40) {
            break;
          }

          message.channels = reader.uint32();
          continue;
        case 6:
          if (tag !== 48) {
            break;
          }

          message.purpose = reader.int32() as any;
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.url = reader.string();
          continue;
        case 8:
          if (tag !== 66) {
            break;
          }

          message.matchInfo = ScanImage_ImageMatchTransform.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ScanImage {
    return {
      fileName: isSet(object.fileName) ? String(object.fileName) : "",
      source: isSet(object.source) ? scanImageSourceFromJSON(object.source) : 0,
      width: isSet(object.width) ? Number(object.width) : 0,
      height: isSet(object.height) ? Number(object.height) : 0,
      channels: isSet(object.channels) ? Number(object.channels) : 0,
      purpose: isSet(object.purpose) ? scanImagePurposeFromJSON(object.purpose) : 0,
      url: isSet(object.url) ? String(object.url) : "",
      matchInfo: isSet(object.matchInfo) ? ScanImage_ImageMatchTransform.fromJSON(object.matchInfo) : undefined,
    };
  },

  toJSON(message: ScanImage): unknown {
    const obj: any = {};
    message.fileName !== undefined && (obj.fileName = message.fileName);
    message.source !== undefined && (obj.source = scanImageSourceToJSON(message.source));
    message.width !== undefined && (obj.width = Math.round(message.width));
    message.height !== undefined && (obj.height = Math.round(message.height));
    message.channels !== undefined && (obj.channels = Math.round(message.channels));
    message.purpose !== undefined && (obj.purpose = scanImagePurposeToJSON(message.purpose));
    message.url !== undefined && (obj.url = message.url);
    message.matchInfo !== undefined &&
      (obj.matchInfo = message.matchInfo ? ScanImage_ImageMatchTransform.toJSON(message.matchInfo) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<ScanImage>, I>>(base?: I): ScanImage {
    return ScanImage.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ScanImage>, I>>(object: I): ScanImage {
    const message = createBaseScanImage();
    message.fileName = object.fileName ?? "";
    message.source = object.source ?? 0;
    message.width = object.width ?? 0;
    message.height = object.height ?? 0;
    message.channels = object.channels ?? 0;
    message.purpose = object.purpose ?? 0;
    message.url = object.url ?? "";
    message.matchInfo = (object.matchInfo !== undefined && object.matchInfo !== null)
      ? ScanImage_ImageMatchTransform.fromPartial(object.matchInfo)
      : undefined;
    return message;
  },
};

function createBaseScanImage_ImageMatchTransform(): ScanImage_ImageMatchTransform {
  return { matchedImageFileName: "", matchedImageLocation: 0, xOffset: 0, yOffset: 0, xScale: 0, yScale: 0 };
}

export const ScanImage_ImageMatchTransform = {
  encode(message: ScanImage_ImageMatchTransform, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.matchedImageFileName !== "") {
      writer.uint32(10).string(message.matchedImageFileName);
    }
    if (message.matchedImageLocation !== 0) {
      writer.uint32(16).int32(message.matchedImageLocation);
    }
    if (message.xOffset !== 0) {
      writer.uint32(29).float(message.xOffset);
    }
    if (message.yOffset !== 0) {
      writer.uint32(37).float(message.yOffset);
    }
    if (message.xScale !== 0) {
      writer.uint32(45).float(message.xScale);
    }
    if (message.yScale !== 0) {
      writer.uint32(53).float(message.yScale);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ScanImage_ImageMatchTransform {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseScanImage_ImageMatchTransform();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.matchedImageFileName = reader.string();
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.matchedImageLocation = reader.int32();
          continue;
        case 3:
          if (tag !== 29) {
            break;
          }

          message.xOffset = reader.float();
          continue;
        case 4:
          if (tag !== 37) {
            break;
          }

          message.yOffset = reader.float();
          continue;
        case 5:
          if (tag !== 45) {
            break;
          }

          message.xScale = reader.float();
          continue;
        case 6:
          if (tag !== 53) {
            break;
          }

          message.yScale = reader.float();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ScanImage_ImageMatchTransform {
    return {
      matchedImageFileName: isSet(object.matchedImageFileName) ? String(object.matchedImageFileName) : "",
      matchedImageLocation: isSet(object.matchedImageLocation) ? Number(object.matchedImageLocation) : 0,
      xOffset: isSet(object.xOffset) ? Number(object.xOffset) : 0,
      yOffset: isSet(object.yOffset) ? Number(object.yOffset) : 0,
      xScale: isSet(object.xScale) ? Number(object.xScale) : 0,
      yScale: isSet(object.yScale) ? Number(object.yScale) : 0,
    };
  },

  toJSON(message: ScanImage_ImageMatchTransform): unknown {
    const obj: any = {};
    message.matchedImageFileName !== undefined && (obj.matchedImageFileName = message.matchedImageFileName);
    message.matchedImageLocation !== undefined && (obj.matchedImageLocation = Math.round(message.matchedImageLocation));
    message.xOffset !== undefined && (obj.xOffset = message.xOffset);
    message.yOffset !== undefined && (obj.yOffset = message.yOffset);
    message.xScale !== undefined && (obj.xScale = message.xScale);
    message.yScale !== undefined && (obj.yScale = message.yScale);
    return obj;
  },

  create<I extends Exact<DeepPartial<ScanImage_ImageMatchTransform>, I>>(base?: I): ScanImage_ImageMatchTransform {
    return ScanImage_ImageMatchTransform.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ScanImage_ImageMatchTransform>, I>>(
    object: I,
  ): ScanImage_ImageMatchTransform {
    const message = createBaseScanImage_ImageMatchTransform();
    message.matchedImageFileName = object.matchedImageFileName ?? "";
    message.matchedImageLocation = object.matchedImageLocation ?? 0;
    message.xOffset = object.xOffset ?? 0;
    message.yOffset = object.yOffset ?? 0;
    message.xScale = object.xScale ?? 0;
    message.yScale = object.yScale ?? 0;
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
