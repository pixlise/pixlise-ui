/* eslint-disable */
import * as _m0 from "protobufjs/minimal";

export const protobufPackage = "";

/** This is a response to a GET so no request body */
export interface BeginWSConnectionResponse {
  connToken: string;
}

/** This is a response to a GET so no request body */
export interface VersionResponse {
  versions: VersionResponse_Version[];
}

export interface VersionResponse_Version {
  component: string;
  version: string;
}

function createBaseBeginWSConnectionResponse(): BeginWSConnectionResponse {
  return { connToken: "" };
}

export const BeginWSConnectionResponse = {
  encode(message: BeginWSConnectionResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.connToken !== "") {
      writer.uint32(10).string(message.connToken);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): BeginWSConnectionResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseBeginWSConnectionResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.connToken = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): BeginWSConnectionResponse {
    return { connToken: isSet(object.connToken) ? String(object.connToken) : "" };
  },

  toJSON(message: BeginWSConnectionResponse): unknown {
    const obj: any = {};
    message.connToken !== undefined && (obj.connToken = message.connToken);
    return obj;
  },

  create<I extends Exact<DeepPartial<BeginWSConnectionResponse>, I>>(base?: I): BeginWSConnectionResponse {
    return BeginWSConnectionResponse.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<BeginWSConnectionResponse>, I>>(object: I): BeginWSConnectionResponse {
    const message = createBaseBeginWSConnectionResponse();
    message.connToken = object.connToken ?? "";
    return message;
  },
};

function createBaseVersionResponse(): VersionResponse {
  return { versions: [] };
}

export const VersionResponse = {
  encode(message: VersionResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.versions) {
      VersionResponse_Version.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): VersionResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseVersionResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.versions.push(VersionResponse_Version.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): VersionResponse {
    return {
      versions: Array.isArray(object?.versions)
        ? object.versions.map((e: any) => VersionResponse_Version.fromJSON(e))
        : [],
    };
  },

  toJSON(message: VersionResponse): unknown {
    const obj: any = {};
    if (message.versions) {
      obj.versions = message.versions.map((e) => e ? VersionResponse_Version.toJSON(e) : undefined);
    } else {
      obj.versions = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<VersionResponse>, I>>(base?: I): VersionResponse {
    return VersionResponse.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<VersionResponse>, I>>(object: I): VersionResponse {
    const message = createBaseVersionResponse();
    message.versions = object.versions?.map((e) => VersionResponse_Version.fromPartial(e)) || [];
    return message;
  },
};

function createBaseVersionResponse_Version(): VersionResponse_Version {
  return { component: "", version: "" };
}

export const VersionResponse_Version = {
  encode(message: VersionResponse_Version, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.component !== "") {
      writer.uint32(10).string(message.component);
    }
    if (message.version !== "") {
      writer.uint32(18).string(message.version);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): VersionResponse_Version {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseVersionResponse_Version();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.component = reader.string();
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

  fromJSON(object: any): VersionResponse_Version {
    return {
      component: isSet(object.component) ? String(object.component) : "",
      version: isSet(object.version) ? String(object.version) : "",
    };
  },

  toJSON(message: VersionResponse_Version): unknown {
    const obj: any = {};
    message.component !== undefined && (obj.component = message.component);
    message.version !== undefined && (obj.version = message.version);
    return obj;
  },

  create<I extends Exact<DeepPartial<VersionResponse_Version>, I>>(base?: I): VersionResponse_Version {
    return VersionResponse_Version.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<VersionResponse_Version>, I>>(object: I): VersionResponse_Version {
    const message = createBaseVersionResponse_Version();
    message.component = object.component ?? "";
    message.version = object.version ?? "";
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
