/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { DetectorConfig } from "./detector-config";
import { ResponseStatus, responseStatusFromJSON, responseStatusToJSON } from "./response";

export const protobufPackage = "";

export interface DetectorConfigReq {
}

export interface DetectorConfigResp {
  status: ResponseStatus;
  config: DetectorConfig | undefined;
  piquantConfigVersions: string[];
}

function createBaseDetectorConfigReq(): DetectorConfigReq {
  return {};
}

export const DetectorConfigReq = {
  encode(_: DetectorConfigReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DetectorConfigReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDetectorConfigReq();
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

  fromJSON(_: any): DetectorConfigReq {
    return {};
  },

  toJSON(_: DetectorConfigReq): unknown {
    const obj: any = {};
    return obj;
  },

  create<I extends Exact<DeepPartial<DetectorConfigReq>, I>>(base?: I): DetectorConfigReq {
    return DetectorConfigReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DetectorConfigReq>, I>>(_: I): DetectorConfigReq {
    const message = createBaseDetectorConfigReq();
    return message;
  },
};

function createBaseDetectorConfigResp(): DetectorConfigResp {
  return { status: 0, config: undefined, piquantConfigVersions: [] };
}

export const DetectorConfigResp = {
  encode(message: DetectorConfigResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    if (message.config !== undefined) {
      DetectorConfig.encode(message.config, writer.uint32(18).fork()).ldelim();
    }
    for (const v of message.piquantConfigVersions) {
      writer.uint32(26).string(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DetectorConfigResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDetectorConfigResp();
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

          message.config = DetectorConfig.decode(reader, reader.uint32());
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.piquantConfigVersions.push(reader.string());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): DetectorConfigResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      config: isSet(object.config) ? DetectorConfig.fromJSON(object.config) : undefined,
      piquantConfigVersions: Array.isArray(object?.piquantConfigVersions)
        ? object.piquantConfigVersions.map((e: any) => String(e))
        : [],
    };
  },

  toJSON(message: DetectorConfigResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    message.config !== undefined && (obj.config = message.config ? DetectorConfig.toJSON(message.config) : undefined);
    if (message.piquantConfigVersions) {
      obj.piquantConfigVersions = message.piquantConfigVersions.map((e) => e);
    } else {
      obj.piquantConfigVersions = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<DetectorConfigResp>, I>>(base?: I): DetectorConfigResp {
    return DetectorConfigResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DetectorConfigResp>, I>>(object: I): DetectorConfigResp {
    const message = createBaseDetectorConfigResp();
    message.status = object.status ?? 0;
    message.config = (object.config !== undefined && object.config !== null)
      ? DetectorConfig.fromPartial(object.config)
      : undefined;
    message.piquantConfigVersions = object.piquantConfigVersions?.map((e) => e) || [];
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
