/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { ResponseStatus, responseStatusFromJSON, responseStatusToJSON } from "./response";

export const protobufPackage = "";

export interface DiffractionPeakStatusListReq {
  scanId: string;
}

export interface DiffractionPeakStatusListResp {
  status: ResponseStatus;
  /** id->peak status */
  peakStatuses: { [key: string]: string };
}

export interface DiffractionPeakStatusListResp_PeakStatusesEntry {
  key: string;
  value: string;
}

export interface DiffractionPeakStatusWriteReq {
  scanId: string;
  diffractionPeakId: string;
  /** We let the UI define these */
  status: string;
}

export interface DiffractionPeakStatusWriteResp {
  status: ResponseStatus;
}

export interface DiffractionPeakStatusDeleteReq {
  scanId: string;
  diffractionPeakId: string;
}

export interface DiffractionPeakStatusDeleteResp {
  status: ResponseStatus;
}

function createBaseDiffractionPeakStatusListReq(): DiffractionPeakStatusListReq {
  return { scanId: "" };
}

export const DiffractionPeakStatusListReq = {
  encode(message: DiffractionPeakStatusListReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.scanId !== "") {
      writer.uint32(10).string(message.scanId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DiffractionPeakStatusListReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDiffractionPeakStatusListReq();
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

  fromJSON(object: any): DiffractionPeakStatusListReq {
    return { scanId: isSet(object.scanId) ? String(object.scanId) : "" };
  },

  toJSON(message: DiffractionPeakStatusListReq): unknown {
    const obj: any = {};
    message.scanId !== undefined && (obj.scanId = message.scanId);
    return obj;
  },

  create<I extends Exact<DeepPartial<DiffractionPeakStatusListReq>, I>>(base?: I): DiffractionPeakStatusListReq {
    return DiffractionPeakStatusListReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DiffractionPeakStatusListReq>, I>>(object: I): DiffractionPeakStatusListReq {
    const message = createBaseDiffractionPeakStatusListReq();
    message.scanId = object.scanId ?? "";
    return message;
  },
};

function createBaseDiffractionPeakStatusListResp(): DiffractionPeakStatusListResp {
  return { status: 0, peakStatuses: {} };
}

export const DiffractionPeakStatusListResp = {
  encode(message: DiffractionPeakStatusListResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    Object.entries(message.peakStatuses).forEach(([key, value]) => {
      DiffractionPeakStatusListResp_PeakStatusesEntry.encode({ key: key as any, value }, writer.uint32(18).fork())
        .ldelim();
    });
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DiffractionPeakStatusListResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDiffractionPeakStatusListResp();
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

          const entry2 = DiffractionPeakStatusListResp_PeakStatusesEntry.decode(reader, reader.uint32());
          if (entry2.value !== undefined) {
            message.peakStatuses[entry2.key] = entry2.value;
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

  fromJSON(object: any): DiffractionPeakStatusListResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      peakStatuses: isObject(object.peakStatuses)
        ? Object.entries(object.peakStatuses).reduce<{ [key: string]: string }>((acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        }, {})
        : {},
    };
  },

  toJSON(message: DiffractionPeakStatusListResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    obj.peakStatuses = {};
    if (message.peakStatuses) {
      Object.entries(message.peakStatuses).forEach(([k, v]) => {
        obj.peakStatuses[k] = v;
      });
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<DiffractionPeakStatusListResp>, I>>(base?: I): DiffractionPeakStatusListResp {
    return DiffractionPeakStatusListResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DiffractionPeakStatusListResp>, I>>(
    object: I,
  ): DiffractionPeakStatusListResp {
    const message = createBaseDiffractionPeakStatusListResp();
    message.status = object.status ?? 0;
    message.peakStatuses = Object.entries(object.peakStatuses ?? {}).reduce<{ [key: string]: string }>(
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

function createBaseDiffractionPeakStatusListResp_PeakStatusesEntry(): DiffractionPeakStatusListResp_PeakStatusesEntry {
  return { key: "", value: "" };
}

export const DiffractionPeakStatusListResp_PeakStatusesEntry = {
  encode(
    message: DiffractionPeakStatusListResp_PeakStatusesEntry,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    if (message.key !== "") {
      writer.uint32(10).string(message.key);
    }
    if (message.value !== "") {
      writer.uint32(18).string(message.value);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DiffractionPeakStatusListResp_PeakStatusesEntry {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDiffractionPeakStatusListResp_PeakStatusesEntry();
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

  fromJSON(object: any): DiffractionPeakStatusListResp_PeakStatusesEntry {
    return { key: isSet(object.key) ? String(object.key) : "", value: isSet(object.value) ? String(object.value) : "" };
  },

  toJSON(message: DiffractionPeakStatusListResp_PeakStatusesEntry): unknown {
    const obj: any = {};
    message.key !== undefined && (obj.key = message.key);
    message.value !== undefined && (obj.value = message.value);
    return obj;
  },

  create<I extends Exact<DeepPartial<DiffractionPeakStatusListResp_PeakStatusesEntry>, I>>(
    base?: I,
  ): DiffractionPeakStatusListResp_PeakStatusesEntry {
    return DiffractionPeakStatusListResp_PeakStatusesEntry.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DiffractionPeakStatusListResp_PeakStatusesEntry>, I>>(
    object: I,
  ): DiffractionPeakStatusListResp_PeakStatusesEntry {
    const message = createBaseDiffractionPeakStatusListResp_PeakStatusesEntry();
    message.key = object.key ?? "";
    message.value = object.value ?? "";
    return message;
  },
};

function createBaseDiffractionPeakStatusWriteReq(): DiffractionPeakStatusWriteReq {
  return { scanId: "", diffractionPeakId: "", status: "" };
}

export const DiffractionPeakStatusWriteReq = {
  encode(message: DiffractionPeakStatusWriteReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.scanId !== "") {
      writer.uint32(10).string(message.scanId);
    }
    if (message.diffractionPeakId !== "") {
      writer.uint32(18).string(message.diffractionPeakId);
    }
    if (message.status !== "") {
      writer.uint32(26).string(message.status);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DiffractionPeakStatusWriteReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDiffractionPeakStatusWriteReq();
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

          message.status = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): DiffractionPeakStatusWriteReq {
    return {
      scanId: isSet(object.scanId) ? String(object.scanId) : "",
      diffractionPeakId: isSet(object.diffractionPeakId) ? String(object.diffractionPeakId) : "",
      status: isSet(object.status) ? String(object.status) : "",
    };
  },

  toJSON(message: DiffractionPeakStatusWriteReq): unknown {
    const obj: any = {};
    message.scanId !== undefined && (obj.scanId = message.scanId);
    message.diffractionPeakId !== undefined && (obj.diffractionPeakId = message.diffractionPeakId);
    message.status !== undefined && (obj.status = message.status);
    return obj;
  },

  create<I extends Exact<DeepPartial<DiffractionPeakStatusWriteReq>, I>>(base?: I): DiffractionPeakStatusWriteReq {
    return DiffractionPeakStatusWriteReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DiffractionPeakStatusWriteReq>, I>>(
    object: I,
  ): DiffractionPeakStatusWriteReq {
    const message = createBaseDiffractionPeakStatusWriteReq();
    message.scanId = object.scanId ?? "";
    message.diffractionPeakId = object.diffractionPeakId ?? "";
    message.status = object.status ?? "";
    return message;
  },
};

function createBaseDiffractionPeakStatusWriteResp(): DiffractionPeakStatusWriteResp {
  return { status: 0 };
}

export const DiffractionPeakStatusWriteResp = {
  encode(message: DiffractionPeakStatusWriteResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DiffractionPeakStatusWriteResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDiffractionPeakStatusWriteResp();
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

  fromJSON(object: any): DiffractionPeakStatusWriteResp {
    return { status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0 };
  },

  toJSON(message: DiffractionPeakStatusWriteResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    return obj;
  },

  create<I extends Exact<DeepPartial<DiffractionPeakStatusWriteResp>, I>>(base?: I): DiffractionPeakStatusWriteResp {
    return DiffractionPeakStatusWriteResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DiffractionPeakStatusWriteResp>, I>>(
    object: I,
  ): DiffractionPeakStatusWriteResp {
    const message = createBaseDiffractionPeakStatusWriteResp();
    message.status = object.status ?? 0;
    return message;
  },
};

function createBaseDiffractionPeakStatusDeleteReq(): DiffractionPeakStatusDeleteReq {
  return { scanId: "", diffractionPeakId: "" };
}

export const DiffractionPeakStatusDeleteReq = {
  encode(message: DiffractionPeakStatusDeleteReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.scanId !== "") {
      writer.uint32(10).string(message.scanId);
    }
    if (message.diffractionPeakId !== "") {
      writer.uint32(18).string(message.diffractionPeakId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DiffractionPeakStatusDeleteReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDiffractionPeakStatusDeleteReq();
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

  fromJSON(object: any): DiffractionPeakStatusDeleteReq {
    return {
      scanId: isSet(object.scanId) ? String(object.scanId) : "",
      diffractionPeakId: isSet(object.diffractionPeakId) ? String(object.diffractionPeakId) : "",
    };
  },

  toJSON(message: DiffractionPeakStatusDeleteReq): unknown {
    const obj: any = {};
    message.scanId !== undefined && (obj.scanId = message.scanId);
    message.diffractionPeakId !== undefined && (obj.diffractionPeakId = message.diffractionPeakId);
    return obj;
  },

  create<I extends Exact<DeepPartial<DiffractionPeakStatusDeleteReq>, I>>(base?: I): DiffractionPeakStatusDeleteReq {
    return DiffractionPeakStatusDeleteReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DiffractionPeakStatusDeleteReq>, I>>(
    object: I,
  ): DiffractionPeakStatusDeleteReq {
    const message = createBaseDiffractionPeakStatusDeleteReq();
    message.scanId = object.scanId ?? "";
    message.diffractionPeakId = object.diffractionPeakId ?? "";
    return message;
  },
};

function createBaseDiffractionPeakStatusDeleteResp(): DiffractionPeakStatusDeleteResp {
  return { status: 0 };
}

export const DiffractionPeakStatusDeleteResp = {
  encode(message: DiffractionPeakStatusDeleteResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DiffractionPeakStatusDeleteResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDiffractionPeakStatusDeleteResp();
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

  fromJSON(object: any): DiffractionPeakStatusDeleteResp {
    return { status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0 };
  },

  toJSON(message: DiffractionPeakStatusDeleteResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    return obj;
  },

  create<I extends Exact<DeepPartial<DiffractionPeakStatusDeleteResp>, I>>(base?: I): DiffractionPeakStatusDeleteResp {
    return DiffractionPeakStatusDeleteResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DiffractionPeakStatusDeleteResp>, I>>(
    object: I,
  ): DiffractionPeakStatusDeleteResp {
    const message = createBaseDiffractionPeakStatusDeleteResp();
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
