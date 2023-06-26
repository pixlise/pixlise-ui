/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { DetectorConfig } from "./detector-config";
import { PiquantConfig } from "./piquant-config";
import { ResponseStatus, responseStatusFromJSON, responseStatusToJSON } from "./response";

export const protobufPackage = "";

/** Listing all available PIQUANT configs */
export interface PiquantConfigListReq {
  configId: string;
}

export interface PiquantConfigListResp {
  status: ResponseStatus;
  configNames: string[];
}

/** Listing all available versions of a given PIQUANT config */
export interface PiquantConfigVersionsListReq {
  configId: string;
}

export interface PiquantConfigVersionsListResp {
  status: ResponseStatus;
  versions: string[];
}

/** Getting a specific PIQUANT version */
export interface PiquantConfigVersionReq {
  configId: string;
  version: string;
}

export interface PiquantConfigVersionResp {
  status: ResponseStatus;
  detectorConfig: DetectorConfig | undefined;
  piquantConfig: PiquantConfig | undefined;
}

/** Listing versions of PIQUANT container to run in API when quant is started */
export interface PiquantVersionListReq {
}

export interface PiquantVersionListResp {
  status: ResponseStatus;
  piquantVersions: string[];
}

/** Sets the current version of PIQUANT container to run in API when quant is started */
export interface PiquantSetVersionReq {
  piquantVersion: string;
}

export interface PiquantSetVersionResp {
  status: ResponseStatus;
  piquantVersion: string;
}

function createBasePiquantConfigListReq(): PiquantConfigListReq {
  return { configId: "" };
}

export const PiquantConfigListReq = {
  encode(message: PiquantConfigListReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.configId !== "") {
      writer.uint32(10).string(message.configId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PiquantConfigListReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePiquantConfigListReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.configId = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): PiquantConfigListReq {
    return { configId: isSet(object.configId) ? String(object.configId) : "" };
  },

  toJSON(message: PiquantConfigListReq): unknown {
    const obj: any = {};
    message.configId !== undefined && (obj.configId = message.configId);
    return obj;
  },

  create<I extends Exact<DeepPartial<PiquantConfigListReq>, I>>(base?: I): PiquantConfigListReq {
    return PiquantConfigListReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<PiquantConfigListReq>, I>>(object: I): PiquantConfigListReq {
    const message = createBasePiquantConfigListReq();
    message.configId = object.configId ?? "";
    return message;
  },
};

function createBasePiquantConfigListResp(): PiquantConfigListResp {
  return { status: 0, configNames: [] };
}

export const PiquantConfigListResp = {
  encode(message: PiquantConfigListResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    for (const v of message.configNames) {
      writer.uint32(18).string(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PiquantConfigListResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePiquantConfigListResp();
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

          message.configNames.push(reader.string());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): PiquantConfigListResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      configNames: Array.isArray(object?.configNames) ? object.configNames.map((e: any) => String(e)) : [],
    };
  },

  toJSON(message: PiquantConfigListResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    if (message.configNames) {
      obj.configNames = message.configNames.map((e) => e);
    } else {
      obj.configNames = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<PiquantConfigListResp>, I>>(base?: I): PiquantConfigListResp {
    return PiquantConfigListResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<PiquantConfigListResp>, I>>(object: I): PiquantConfigListResp {
    const message = createBasePiquantConfigListResp();
    message.status = object.status ?? 0;
    message.configNames = object.configNames?.map((e) => e) || [];
    return message;
  },
};

function createBasePiquantConfigVersionsListReq(): PiquantConfigVersionsListReq {
  return { configId: "" };
}

export const PiquantConfigVersionsListReq = {
  encode(message: PiquantConfigVersionsListReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.configId !== "") {
      writer.uint32(10).string(message.configId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PiquantConfigVersionsListReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePiquantConfigVersionsListReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.configId = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): PiquantConfigVersionsListReq {
    return { configId: isSet(object.configId) ? String(object.configId) : "" };
  },

  toJSON(message: PiquantConfigVersionsListReq): unknown {
    const obj: any = {};
    message.configId !== undefined && (obj.configId = message.configId);
    return obj;
  },

  create<I extends Exact<DeepPartial<PiquantConfigVersionsListReq>, I>>(base?: I): PiquantConfigVersionsListReq {
    return PiquantConfigVersionsListReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<PiquantConfigVersionsListReq>, I>>(object: I): PiquantConfigVersionsListReq {
    const message = createBasePiquantConfigVersionsListReq();
    message.configId = object.configId ?? "";
    return message;
  },
};

function createBasePiquantConfigVersionsListResp(): PiquantConfigVersionsListResp {
  return { status: 0, versions: [] };
}

export const PiquantConfigVersionsListResp = {
  encode(message: PiquantConfigVersionsListResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    for (const v of message.versions) {
      writer.uint32(18).string(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PiquantConfigVersionsListResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePiquantConfigVersionsListResp();
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

          message.versions.push(reader.string());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): PiquantConfigVersionsListResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      versions: Array.isArray(object?.versions) ? object.versions.map((e: any) => String(e)) : [],
    };
  },

  toJSON(message: PiquantConfigVersionsListResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    if (message.versions) {
      obj.versions = message.versions.map((e) => e);
    } else {
      obj.versions = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<PiquantConfigVersionsListResp>, I>>(base?: I): PiquantConfigVersionsListResp {
    return PiquantConfigVersionsListResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<PiquantConfigVersionsListResp>, I>>(
    object: I,
  ): PiquantConfigVersionsListResp {
    const message = createBasePiquantConfigVersionsListResp();
    message.status = object.status ?? 0;
    message.versions = object.versions?.map((e) => e) || [];
    return message;
  },
};

function createBasePiquantConfigVersionReq(): PiquantConfigVersionReq {
  return { configId: "", version: "" };
}

export const PiquantConfigVersionReq = {
  encode(message: PiquantConfigVersionReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.configId !== "") {
      writer.uint32(10).string(message.configId);
    }
    if (message.version !== "") {
      writer.uint32(18).string(message.version);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PiquantConfigVersionReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePiquantConfigVersionReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.configId = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.version = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): PiquantConfigVersionReq {
    return {
      configId: isSet(object.configId) ? String(object.configId) : "",
      version: isSet(object.version) ? String(object.version) : "",
    };
  },

  toJSON(message: PiquantConfigVersionReq): unknown {
    const obj: any = {};
    message.configId !== undefined && (obj.configId = message.configId);
    message.version !== undefined && (obj.version = message.version);
    return obj;
  },

  create<I extends Exact<DeepPartial<PiquantConfigVersionReq>, I>>(base?: I): PiquantConfigVersionReq {
    return PiquantConfigVersionReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<PiquantConfigVersionReq>, I>>(object: I): PiquantConfigVersionReq {
    const message = createBasePiquantConfigVersionReq();
    message.configId = object.configId ?? "";
    message.version = object.version ?? "";
    return message;
  },
};

function createBasePiquantConfigVersionResp(): PiquantConfigVersionResp {
  return { status: 0, detectorConfig: undefined, piquantConfig: undefined };
}

export const PiquantConfigVersionResp = {
  encode(message: PiquantConfigVersionResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    if (message.detectorConfig !== undefined) {
      DetectorConfig.encode(message.detectorConfig, writer.uint32(18).fork()).ldelim();
    }
    if (message.piquantConfig !== undefined) {
      PiquantConfig.encode(message.piquantConfig, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PiquantConfigVersionResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePiquantConfigVersionResp();
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

          message.detectorConfig = DetectorConfig.decode(reader, reader.uint32());
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.piquantConfig = PiquantConfig.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): PiquantConfigVersionResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      detectorConfig: isSet(object.detectorConfig) ? DetectorConfig.fromJSON(object.detectorConfig) : undefined,
      piquantConfig: isSet(object.piquantConfig) ? PiquantConfig.fromJSON(object.piquantConfig) : undefined,
    };
  },

  toJSON(message: PiquantConfigVersionResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    message.detectorConfig !== undefined &&
      (obj.detectorConfig = message.detectorConfig ? DetectorConfig.toJSON(message.detectorConfig) : undefined);
    message.piquantConfig !== undefined &&
      (obj.piquantConfig = message.piquantConfig ? PiquantConfig.toJSON(message.piquantConfig) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<PiquantConfigVersionResp>, I>>(base?: I): PiquantConfigVersionResp {
    return PiquantConfigVersionResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<PiquantConfigVersionResp>, I>>(object: I): PiquantConfigVersionResp {
    const message = createBasePiquantConfigVersionResp();
    message.status = object.status ?? 0;
    message.detectorConfig = (object.detectorConfig !== undefined && object.detectorConfig !== null)
      ? DetectorConfig.fromPartial(object.detectorConfig)
      : undefined;
    message.piquantConfig = (object.piquantConfig !== undefined && object.piquantConfig !== null)
      ? PiquantConfig.fromPartial(object.piquantConfig)
      : undefined;
    return message;
  },
};

function createBasePiquantVersionListReq(): PiquantVersionListReq {
  return {};
}

export const PiquantVersionListReq = {
  encode(_: PiquantVersionListReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PiquantVersionListReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePiquantVersionListReq();
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

  fromJSON(_: any): PiquantVersionListReq {
    return {};
  },

  toJSON(_: PiquantVersionListReq): unknown {
    const obj: any = {};
    return obj;
  },

  create<I extends Exact<DeepPartial<PiquantVersionListReq>, I>>(base?: I): PiquantVersionListReq {
    return PiquantVersionListReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<PiquantVersionListReq>, I>>(_: I): PiquantVersionListReq {
    const message = createBasePiquantVersionListReq();
    return message;
  },
};

function createBasePiquantVersionListResp(): PiquantVersionListResp {
  return { status: 0, piquantVersions: [] };
}

export const PiquantVersionListResp = {
  encode(message: PiquantVersionListResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    for (const v of message.piquantVersions) {
      writer.uint32(18).string(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PiquantVersionListResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePiquantVersionListResp();
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

          message.piquantVersions.push(reader.string());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): PiquantVersionListResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      piquantVersions: Array.isArray(object?.piquantVersions) ? object.piquantVersions.map((e: any) => String(e)) : [],
    };
  },

  toJSON(message: PiquantVersionListResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    if (message.piquantVersions) {
      obj.piquantVersions = message.piquantVersions.map((e) => e);
    } else {
      obj.piquantVersions = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<PiquantVersionListResp>, I>>(base?: I): PiquantVersionListResp {
    return PiquantVersionListResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<PiquantVersionListResp>, I>>(object: I): PiquantVersionListResp {
    const message = createBasePiquantVersionListResp();
    message.status = object.status ?? 0;
    message.piquantVersions = object.piquantVersions?.map((e) => e) || [];
    return message;
  },
};

function createBasePiquantSetVersionReq(): PiquantSetVersionReq {
  return { piquantVersion: "" };
}

export const PiquantSetVersionReq = {
  encode(message: PiquantSetVersionReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.piquantVersion !== "") {
      writer.uint32(10).string(message.piquantVersion);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PiquantSetVersionReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePiquantSetVersionReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.piquantVersion = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): PiquantSetVersionReq {
    return { piquantVersion: isSet(object.piquantVersion) ? String(object.piquantVersion) : "" };
  },

  toJSON(message: PiquantSetVersionReq): unknown {
    const obj: any = {};
    message.piquantVersion !== undefined && (obj.piquantVersion = message.piquantVersion);
    return obj;
  },

  create<I extends Exact<DeepPartial<PiquantSetVersionReq>, I>>(base?: I): PiquantSetVersionReq {
    return PiquantSetVersionReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<PiquantSetVersionReq>, I>>(object: I): PiquantSetVersionReq {
    const message = createBasePiquantSetVersionReq();
    message.piquantVersion = object.piquantVersion ?? "";
    return message;
  },
};

function createBasePiquantSetVersionResp(): PiquantSetVersionResp {
  return { status: 0, piquantVersion: "" };
}

export const PiquantSetVersionResp = {
  encode(message: PiquantSetVersionResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    if (message.piquantVersion !== "") {
      writer.uint32(18).string(message.piquantVersion);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PiquantSetVersionResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePiquantSetVersionResp();
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

          message.piquantVersion = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): PiquantSetVersionResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      piquantVersion: isSet(object.piquantVersion) ? String(object.piquantVersion) : "",
    };
  },

  toJSON(message: PiquantSetVersionResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    message.piquantVersion !== undefined && (obj.piquantVersion = message.piquantVersion);
    return obj;
  },

  create<I extends Exact<DeepPartial<PiquantSetVersionResp>, I>>(base?: I): PiquantSetVersionResp {
    return PiquantSetVersionResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<PiquantSetVersionResp>, I>>(object: I): PiquantSetVersionResp {
    const message = createBasePiquantSetVersionResp();
    message.status = object.status ?? 0;
    message.piquantVersion = object.piquantVersion ?? "";
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
