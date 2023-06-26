/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { ScanImage } from "./image";
import { ResponseStatus, responseStatusFromJSON, responseStatusToJSON } from "./response";

export const protobufPackage = "";

/** Listing all images for a given scan */
export interface ImageListReq {
  scanId: string;
}

export interface ImageListResp {
  status: ResponseStatus;
  images: ScanImage[];
  defaultImageIdx: number;
}

export interface ImageListUpd {
  images: ScanImage[];
  defaultImageIdx: number;
}

/** Should publish a ImageListUpd */
export interface ImageSetDefaultReq {
  scanId: string;
  defaultImageFileName: string;
}

export interface ImageSetDefaultResp {
  status: ResponseStatus;
}

/** Allows upload of a user-created image to a given scan, should publish a ImageListUpd to go out */
export interface ImageUploadReq {
  scanId: string;
  imageName: string;
  imageData: Uint8Array;
}

export interface ImageUploadResp {
  status: ResponseStatus;
}

/** Deletes ONLY user-created image, should publish a ImageListUpd to go out */
export interface ImageDeleteReq {
  scanId: string;
  imageName: string;
}

export interface ImageDeleteResp {
  status: ResponseStatus;
}

function createBaseImageListReq(): ImageListReq {
  return { scanId: "" };
}

export const ImageListReq = {
  encode(message: ImageListReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.scanId !== "") {
      writer.uint32(10).string(message.scanId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ImageListReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseImageListReq();
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

  fromJSON(object: any): ImageListReq {
    return { scanId: isSet(object.scanId) ? String(object.scanId) : "" };
  },

  toJSON(message: ImageListReq): unknown {
    const obj: any = {};
    message.scanId !== undefined && (obj.scanId = message.scanId);
    return obj;
  },

  create<I extends Exact<DeepPartial<ImageListReq>, I>>(base?: I): ImageListReq {
    return ImageListReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ImageListReq>, I>>(object: I): ImageListReq {
    const message = createBaseImageListReq();
    message.scanId = object.scanId ?? "";
    return message;
  },
};

function createBaseImageListResp(): ImageListResp {
  return { status: 0, images: [], defaultImageIdx: 0 };
}

export const ImageListResp = {
  encode(message: ImageListResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    for (const v of message.images) {
      ScanImage.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    if (message.defaultImageIdx !== 0) {
      writer.uint32(24).uint32(message.defaultImageIdx);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ImageListResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseImageListResp();
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

          message.images.push(ScanImage.decode(reader, reader.uint32()));
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.defaultImageIdx = reader.uint32();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ImageListResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      images: Array.isArray(object?.images) ? object.images.map((e: any) => ScanImage.fromJSON(e)) : [],
      defaultImageIdx: isSet(object.defaultImageIdx) ? Number(object.defaultImageIdx) : 0,
    };
  },

  toJSON(message: ImageListResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    if (message.images) {
      obj.images = message.images.map((e) => e ? ScanImage.toJSON(e) : undefined);
    } else {
      obj.images = [];
    }
    message.defaultImageIdx !== undefined && (obj.defaultImageIdx = Math.round(message.defaultImageIdx));
    return obj;
  },

  create<I extends Exact<DeepPartial<ImageListResp>, I>>(base?: I): ImageListResp {
    return ImageListResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ImageListResp>, I>>(object: I): ImageListResp {
    const message = createBaseImageListResp();
    message.status = object.status ?? 0;
    message.images = object.images?.map((e) => ScanImage.fromPartial(e)) || [];
    message.defaultImageIdx = object.defaultImageIdx ?? 0;
    return message;
  },
};

function createBaseImageListUpd(): ImageListUpd {
  return { images: [], defaultImageIdx: 0 };
}

export const ImageListUpd = {
  encode(message: ImageListUpd, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.images) {
      ScanImage.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.defaultImageIdx !== 0) {
      writer.uint32(16).uint32(message.defaultImageIdx);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ImageListUpd {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseImageListUpd();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.images.push(ScanImage.decode(reader, reader.uint32()));
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.defaultImageIdx = reader.uint32();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ImageListUpd {
    return {
      images: Array.isArray(object?.images) ? object.images.map((e: any) => ScanImage.fromJSON(e)) : [],
      defaultImageIdx: isSet(object.defaultImageIdx) ? Number(object.defaultImageIdx) : 0,
    };
  },

  toJSON(message: ImageListUpd): unknown {
    const obj: any = {};
    if (message.images) {
      obj.images = message.images.map((e) => e ? ScanImage.toJSON(e) : undefined);
    } else {
      obj.images = [];
    }
    message.defaultImageIdx !== undefined && (obj.defaultImageIdx = Math.round(message.defaultImageIdx));
    return obj;
  },

  create<I extends Exact<DeepPartial<ImageListUpd>, I>>(base?: I): ImageListUpd {
    return ImageListUpd.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ImageListUpd>, I>>(object: I): ImageListUpd {
    const message = createBaseImageListUpd();
    message.images = object.images?.map((e) => ScanImage.fromPartial(e)) || [];
    message.defaultImageIdx = object.defaultImageIdx ?? 0;
    return message;
  },
};

function createBaseImageSetDefaultReq(): ImageSetDefaultReq {
  return { scanId: "", defaultImageFileName: "" };
}

export const ImageSetDefaultReq = {
  encode(message: ImageSetDefaultReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.scanId !== "") {
      writer.uint32(10).string(message.scanId);
    }
    if (message.defaultImageFileName !== "") {
      writer.uint32(18).string(message.defaultImageFileName);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ImageSetDefaultReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseImageSetDefaultReq();
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

          message.defaultImageFileName = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ImageSetDefaultReq {
    return {
      scanId: isSet(object.scanId) ? String(object.scanId) : "",
      defaultImageFileName: isSet(object.defaultImageFileName) ? String(object.defaultImageFileName) : "",
    };
  },

  toJSON(message: ImageSetDefaultReq): unknown {
    const obj: any = {};
    message.scanId !== undefined && (obj.scanId = message.scanId);
    message.defaultImageFileName !== undefined && (obj.defaultImageFileName = message.defaultImageFileName);
    return obj;
  },

  create<I extends Exact<DeepPartial<ImageSetDefaultReq>, I>>(base?: I): ImageSetDefaultReq {
    return ImageSetDefaultReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ImageSetDefaultReq>, I>>(object: I): ImageSetDefaultReq {
    const message = createBaseImageSetDefaultReq();
    message.scanId = object.scanId ?? "";
    message.defaultImageFileName = object.defaultImageFileName ?? "";
    return message;
  },
};

function createBaseImageSetDefaultResp(): ImageSetDefaultResp {
  return { status: 0 };
}

export const ImageSetDefaultResp = {
  encode(message: ImageSetDefaultResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ImageSetDefaultResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseImageSetDefaultResp();
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

  fromJSON(object: any): ImageSetDefaultResp {
    return { status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0 };
  },

  toJSON(message: ImageSetDefaultResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    return obj;
  },

  create<I extends Exact<DeepPartial<ImageSetDefaultResp>, I>>(base?: I): ImageSetDefaultResp {
    return ImageSetDefaultResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ImageSetDefaultResp>, I>>(object: I): ImageSetDefaultResp {
    const message = createBaseImageSetDefaultResp();
    message.status = object.status ?? 0;
    return message;
  },
};

function createBaseImageUploadReq(): ImageUploadReq {
  return { scanId: "", imageName: "", imageData: new Uint8Array() };
}

export const ImageUploadReq = {
  encode(message: ImageUploadReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.scanId !== "") {
      writer.uint32(10).string(message.scanId);
    }
    if (message.imageName !== "") {
      writer.uint32(18).string(message.imageName);
    }
    if (message.imageData.length !== 0) {
      writer.uint32(26).bytes(message.imageData);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ImageUploadReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseImageUploadReq();
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

          message.imageName = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.imageData = reader.bytes();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ImageUploadReq {
    return {
      scanId: isSet(object.scanId) ? String(object.scanId) : "",
      imageName: isSet(object.imageName) ? String(object.imageName) : "",
      imageData: isSet(object.imageData) ? bytesFromBase64(object.imageData) : new Uint8Array(),
    };
  },

  toJSON(message: ImageUploadReq): unknown {
    const obj: any = {};
    message.scanId !== undefined && (obj.scanId = message.scanId);
    message.imageName !== undefined && (obj.imageName = message.imageName);
    message.imageData !== undefined &&
      (obj.imageData = base64FromBytes(message.imageData !== undefined ? message.imageData : new Uint8Array()));
    return obj;
  },

  create<I extends Exact<DeepPartial<ImageUploadReq>, I>>(base?: I): ImageUploadReq {
    return ImageUploadReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ImageUploadReq>, I>>(object: I): ImageUploadReq {
    const message = createBaseImageUploadReq();
    message.scanId = object.scanId ?? "";
    message.imageName = object.imageName ?? "";
    message.imageData = object.imageData ?? new Uint8Array();
    return message;
  },
};

function createBaseImageUploadResp(): ImageUploadResp {
  return { status: 0 };
}

export const ImageUploadResp = {
  encode(message: ImageUploadResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ImageUploadResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseImageUploadResp();
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

  fromJSON(object: any): ImageUploadResp {
    return { status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0 };
  },

  toJSON(message: ImageUploadResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    return obj;
  },

  create<I extends Exact<DeepPartial<ImageUploadResp>, I>>(base?: I): ImageUploadResp {
    return ImageUploadResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ImageUploadResp>, I>>(object: I): ImageUploadResp {
    const message = createBaseImageUploadResp();
    message.status = object.status ?? 0;
    return message;
  },
};

function createBaseImageDeleteReq(): ImageDeleteReq {
  return { scanId: "", imageName: "" };
}

export const ImageDeleteReq = {
  encode(message: ImageDeleteReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.scanId !== "") {
      writer.uint32(10).string(message.scanId);
    }
    if (message.imageName !== "") {
      writer.uint32(18).string(message.imageName);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ImageDeleteReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseImageDeleteReq();
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

          message.imageName = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ImageDeleteReq {
    return {
      scanId: isSet(object.scanId) ? String(object.scanId) : "",
      imageName: isSet(object.imageName) ? String(object.imageName) : "",
    };
  },

  toJSON(message: ImageDeleteReq): unknown {
    const obj: any = {};
    message.scanId !== undefined && (obj.scanId = message.scanId);
    message.imageName !== undefined && (obj.imageName = message.imageName);
    return obj;
  },

  create<I extends Exact<DeepPartial<ImageDeleteReq>, I>>(base?: I): ImageDeleteReq {
    return ImageDeleteReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ImageDeleteReq>, I>>(object: I): ImageDeleteReq {
    const message = createBaseImageDeleteReq();
    message.scanId = object.scanId ?? "";
    message.imageName = object.imageName ?? "";
    return message;
  },
};

function createBaseImageDeleteResp(): ImageDeleteResp {
  return { status: 0 };
}

export const ImageDeleteResp = {
  encode(message: ImageDeleteResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ImageDeleteResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseImageDeleteResp();
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

  fromJSON(object: any): ImageDeleteResp {
    return { status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0 };
  },

  toJSON(message: ImageDeleteResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    return obj;
  },

  create<I extends Exact<DeepPartial<ImageDeleteResp>, I>>(base?: I): ImageDeleteResp {
    return ImageDeleteResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ImageDeleteResp>, I>>(object: I): ImageDeleteResp {
    const message = createBaseImageDeleteResp();
    message.status = object.status ?? 0;
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

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
