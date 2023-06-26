/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { ResponseStatus, responseStatusFromJSON, responseStatusToJSON } from "./response";
import { Tag } from "./tags";

export const protobufPackage = "";

export interface TagListReq {
  /** Is this required? */
  scanId: string;
}

export interface TagListResp {
  status: ResponseStatus;
  tags: Tag[];
}

export interface TagCreateReq {
  /** Seems to be optional? */
  scanId: string;
}

export interface TagCreateResp {
  status: ResponseStatus;
  tag: Tag | undefined;
}

export interface TagDeleteReq {
  /** Is this required? */
  scanId: string;
  tagId: string;
}

export interface TagDeleteResp {
  status: ResponseStatus;
}

function createBaseTagListReq(): TagListReq {
  return { scanId: "" };
}

export const TagListReq = {
  encode(message: TagListReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.scanId !== "") {
      writer.uint32(10).string(message.scanId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): TagListReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTagListReq();
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

  fromJSON(object: any): TagListReq {
    return { scanId: isSet(object.scanId) ? String(object.scanId) : "" };
  },

  toJSON(message: TagListReq): unknown {
    const obj: any = {};
    message.scanId !== undefined && (obj.scanId = message.scanId);
    return obj;
  },

  create<I extends Exact<DeepPartial<TagListReq>, I>>(base?: I): TagListReq {
    return TagListReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<TagListReq>, I>>(object: I): TagListReq {
    const message = createBaseTagListReq();
    message.scanId = object.scanId ?? "";
    return message;
  },
};

function createBaseTagListResp(): TagListResp {
  return { status: 0, tags: [] };
}

export const TagListResp = {
  encode(message: TagListResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    for (const v of message.tags) {
      Tag.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): TagListResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTagListResp();
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

          message.tags.push(Tag.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): TagListResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      tags: Array.isArray(object?.tags) ? object.tags.map((e: any) => Tag.fromJSON(e)) : [],
    };
  },

  toJSON(message: TagListResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    if (message.tags) {
      obj.tags = message.tags.map((e) => e ? Tag.toJSON(e) : undefined);
    } else {
      obj.tags = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<TagListResp>, I>>(base?: I): TagListResp {
    return TagListResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<TagListResp>, I>>(object: I): TagListResp {
    const message = createBaseTagListResp();
    message.status = object.status ?? 0;
    message.tags = object.tags?.map((e) => Tag.fromPartial(e)) || [];
    return message;
  },
};

function createBaseTagCreateReq(): TagCreateReq {
  return { scanId: "" };
}

export const TagCreateReq = {
  encode(message: TagCreateReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.scanId !== "") {
      writer.uint32(10).string(message.scanId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): TagCreateReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTagCreateReq();
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

  fromJSON(object: any): TagCreateReq {
    return { scanId: isSet(object.scanId) ? String(object.scanId) : "" };
  },

  toJSON(message: TagCreateReq): unknown {
    const obj: any = {};
    message.scanId !== undefined && (obj.scanId = message.scanId);
    return obj;
  },

  create<I extends Exact<DeepPartial<TagCreateReq>, I>>(base?: I): TagCreateReq {
    return TagCreateReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<TagCreateReq>, I>>(object: I): TagCreateReq {
    const message = createBaseTagCreateReq();
    message.scanId = object.scanId ?? "";
    return message;
  },
};

function createBaseTagCreateResp(): TagCreateResp {
  return { status: 0, tag: undefined };
}

export const TagCreateResp = {
  encode(message: TagCreateResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    if (message.tag !== undefined) {
      Tag.encode(message.tag, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): TagCreateResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTagCreateResp();
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

          message.tag = Tag.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): TagCreateResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      tag: isSet(object.tag) ? Tag.fromJSON(object.tag) : undefined,
    };
  },

  toJSON(message: TagCreateResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    message.tag !== undefined && (obj.tag = message.tag ? Tag.toJSON(message.tag) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<TagCreateResp>, I>>(base?: I): TagCreateResp {
    return TagCreateResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<TagCreateResp>, I>>(object: I): TagCreateResp {
    const message = createBaseTagCreateResp();
    message.status = object.status ?? 0;
    message.tag = (object.tag !== undefined && object.tag !== null) ? Tag.fromPartial(object.tag) : undefined;
    return message;
  },
};

function createBaseTagDeleteReq(): TagDeleteReq {
  return { scanId: "", tagId: "" };
}

export const TagDeleteReq = {
  encode(message: TagDeleteReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.scanId !== "") {
      writer.uint32(10).string(message.scanId);
    }
    if (message.tagId !== "") {
      writer.uint32(18).string(message.tagId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): TagDeleteReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTagDeleteReq();
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

          message.tagId = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): TagDeleteReq {
    return {
      scanId: isSet(object.scanId) ? String(object.scanId) : "",
      tagId: isSet(object.tagId) ? String(object.tagId) : "",
    };
  },

  toJSON(message: TagDeleteReq): unknown {
    const obj: any = {};
    message.scanId !== undefined && (obj.scanId = message.scanId);
    message.tagId !== undefined && (obj.tagId = message.tagId);
    return obj;
  },

  create<I extends Exact<DeepPartial<TagDeleteReq>, I>>(base?: I): TagDeleteReq {
    return TagDeleteReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<TagDeleteReq>, I>>(object: I): TagDeleteReq {
    const message = createBaseTagDeleteReq();
    message.scanId = object.scanId ?? "";
    message.tagId = object.tagId ?? "";
    return message;
  },
};

function createBaseTagDeleteResp(): TagDeleteResp {
  return { status: 0 };
}

export const TagDeleteResp = {
  encode(message: TagDeleteResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): TagDeleteResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTagDeleteResp();
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

  fromJSON(object: any): TagDeleteResp {
    return { status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0 };
  },

  toJSON(message: TagDeleteResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    return obj;
  },

  create<I extends Exact<DeepPartial<TagDeleteResp>, I>>(base?: I): TagDeleteResp {
    return TagDeleteResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<TagDeleteResp>, I>>(object: I): TagDeleteResp {
    const message = createBaseTagDeleteResp();
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

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
