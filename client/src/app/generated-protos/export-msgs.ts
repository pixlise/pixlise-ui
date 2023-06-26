/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { ResponseStatus, responseStatusFromJSON, responseStatusToJSON } from "./response";

export const protobufPackage = "";

export interface ExportFilesReq {
  datasetId: string;
  fileName: string;
  quantId: string;
  fileIds: string[];
  roiIds: string[];
}

export interface ExportFilesResp {
  status: ResponseStatus;
  zipFileName: string;
  zipData: Uint8Array;
}

function createBaseExportFilesReq(): ExportFilesReq {
  return { datasetId: "", fileName: "", quantId: "", fileIds: [], roiIds: [] };
}

export const ExportFilesReq = {
  encode(message: ExportFilesReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.datasetId !== "") {
      writer.uint32(10).string(message.datasetId);
    }
    if (message.fileName !== "") {
      writer.uint32(18).string(message.fileName);
    }
    if (message.quantId !== "") {
      writer.uint32(26).string(message.quantId);
    }
    for (const v of message.fileIds) {
      writer.uint32(34).string(v!);
    }
    for (const v of message.roiIds) {
      writer.uint32(42).string(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExportFilesReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExportFilesReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.datasetId = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.fileName = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.quantId = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.fileIds.push(reader.string());
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.roiIds.push(reader.string());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ExportFilesReq {
    return {
      datasetId: isSet(object.datasetId) ? String(object.datasetId) : "",
      fileName: isSet(object.fileName) ? String(object.fileName) : "",
      quantId: isSet(object.quantId) ? String(object.quantId) : "",
      fileIds: Array.isArray(object?.fileIds) ? object.fileIds.map((e: any) => String(e)) : [],
      roiIds: Array.isArray(object?.roiIds) ? object.roiIds.map((e: any) => String(e)) : [],
    };
  },

  toJSON(message: ExportFilesReq): unknown {
    const obj: any = {};
    message.datasetId !== undefined && (obj.datasetId = message.datasetId);
    message.fileName !== undefined && (obj.fileName = message.fileName);
    message.quantId !== undefined && (obj.quantId = message.quantId);
    if (message.fileIds) {
      obj.fileIds = message.fileIds.map((e) => e);
    } else {
      obj.fileIds = [];
    }
    if (message.roiIds) {
      obj.roiIds = message.roiIds.map((e) => e);
    } else {
      obj.roiIds = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ExportFilesReq>, I>>(base?: I): ExportFilesReq {
    return ExportFilesReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ExportFilesReq>, I>>(object: I): ExportFilesReq {
    const message = createBaseExportFilesReq();
    message.datasetId = object.datasetId ?? "";
    message.fileName = object.fileName ?? "";
    message.quantId = object.quantId ?? "";
    message.fileIds = object.fileIds?.map((e) => e) || [];
    message.roiIds = object.roiIds?.map((e) => e) || [];
    return message;
  },
};

function createBaseExportFilesResp(): ExportFilesResp {
  return { status: 0, zipFileName: "", zipData: new Uint8Array() };
}

export const ExportFilesResp = {
  encode(message: ExportFilesResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    if (message.zipFileName !== "") {
      writer.uint32(18).string(message.zipFileName);
    }
    if (message.zipData.length !== 0) {
      writer.uint32(26).bytes(message.zipData);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExportFilesResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExportFilesResp();
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

          message.zipFileName = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.zipData = reader.bytes();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ExportFilesResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      zipFileName: isSet(object.zipFileName) ? String(object.zipFileName) : "",
      zipData: isSet(object.zipData) ? bytesFromBase64(object.zipData) : new Uint8Array(),
    };
  },

  toJSON(message: ExportFilesResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    message.zipFileName !== undefined && (obj.zipFileName = message.zipFileName);
    message.zipData !== undefined &&
      (obj.zipData = base64FromBytes(message.zipData !== undefined ? message.zipData : new Uint8Array()));
    return obj;
  },

  create<I extends Exact<DeepPartial<ExportFilesResp>, I>>(base?: I): ExportFilesResp {
    return ExportFilesResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ExportFilesResp>, I>>(object: I): ExportFilesResp {
    const message = createBaseExportFilesResp();
    message.status = object.status ?? 0;
    message.zipFileName = object.zipFileName ?? "";
    message.zipData = object.zipData ?? new Uint8Array();
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
