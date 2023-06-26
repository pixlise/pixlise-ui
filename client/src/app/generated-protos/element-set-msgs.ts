/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { ElementSet, ElementSetSummary } from "./element-set";
import { ResponseStatus, responseStatusFromJSON, responseStatusToJSON } from "./response";

export const protobufPackage = "";

export interface ElementSetListReq {
}

export interface ElementSetListResp {
  status: ResponseStatus;
  elementSets: { [key: string]: ElementSetSummary };
}

export interface ElementSetListResp_ElementSetsEntry {
  key: string;
  value: ElementSetSummary | undefined;
}

export interface ElementSetGetReq {
  id: string;
}

export interface ElementSetGetResp {
  status: ResponseStatus;
  elementSet: ElementSet | undefined;
}

export interface ElementSetWriteReq {
  id: string;
  elementSet: ElementSet | undefined;
}

export interface ElementSetWriteResp {
  status: ResponseStatus;
}

export interface ElementSetDeleteReq {
  id: string;
}

export interface ElementSetDeleteResp {
  status: ResponseStatus;
}

function createBaseElementSetListReq(): ElementSetListReq {
  return {};
}

export const ElementSetListReq = {
  encode(_: ElementSetListReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ElementSetListReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseElementSetListReq();
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

  fromJSON(_: any): ElementSetListReq {
    return {};
  },

  toJSON(_: ElementSetListReq): unknown {
    const obj: any = {};
    return obj;
  },

  create<I extends Exact<DeepPartial<ElementSetListReq>, I>>(base?: I): ElementSetListReq {
    return ElementSetListReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ElementSetListReq>, I>>(_: I): ElementSetListReq {
    const message = createBaseElementSetListReq();
    return message;
  },
};

function createBaseElementSetListResp(): ElementSetListResp {
  return { status: 0, elementSets: {} };
}

export const ElementSetListResp = {
  encode(message: ElementSetListResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    Object.entries(message.elementSets).forEach(([key, value]) => {
      ElementSetListResp_ElementSetsEntry.encode({ key: key as any, value }, writer.uint32(18).fork()).ldelim();
    });
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ElementSetListResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseElementSetListResp();
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

          const entry2 = ElementSetListResp_ElementSetsEntry.decode(reader, reader.uint32());
          if (entry2.value !== undefined) {
            message.elementSets[entry2.key] = entry2.value;
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

  fromJSON(object: any): ElementSetListResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      elementSets: isObject(object.elementSets)
        ? Object.entries(object.elementSets).reduce<{ [key: string]: ElementSetSummary }>((acc, [key, value]) => {
          acc[key] = ElementSetSummary.fromJSON(value);
          return acc;
        }, {})
        : {},
    };
  },

  toJSON(message: ElementSetListResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    obj.elementSets = {};
    if (message.elementSets) {
      Object.entries(message.elementSets).forEach(([k, v]) => {
        obj.elementSets[k] = ElementSetSummary.toJSON(v);
      });
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ElementSetListResp>, I>>(base?: I): ElementSetListResp {
    return ElementSetListResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ElementSetListResp>, I>>(object: I): ElementSetListResp {
    const message = createBaseElementSetListResp();
    message.status = object.status ?? 0;
    message.elementSets = Object.entries(object.elementSets ?? {}).reduce<{ [key: string]: ElementSetSummary }>(
      (acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = ElementSetSummary.fromPartial(value);
        }
        return acc;
      },
      {},
    );
    return message;
  },
};

function createBaseElementSetListResp_ElementSetsEntry(): ElementSetListResp_ElementSetsEntry {
  return { key: "", value: undefined };
}

export const ElementSetListResp_ElementSetsEntry = {
  encode(message: ElementSetListResp_ElementSetsEntry, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.key !== "") {
      writer.uint32(10).string(message.key);
    }
    if (message.value !== undefined) {
      ElementSetSummary.encode(message.value, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ElementSetListResp_ElementSetsEntry {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseElementSetListResp_ElementSetsEntry();
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

          message.value = ElementSetSummary.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ElementSetListResp_ElementSetsEntry {
    return {
      key: isSet(object.key) ? String(object.key) : "",
      value: isSet(object.value) ? ElementSetSummary.fromJSON(object.value) : undefined,
    };
  },

  toJSON(message: ElementSetListResp_ElementSetsEntry): unknown {
    const obj: any = {};
    message.key !== undefined && (obj.key = message.key);
    message.value !== undefined && (obj.value = message.value ? ElementSetSummary.toJSON(message.value) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<ElementSetListResp_ElementSetsEntry>, I>>(
    base?: I,
  ): ElementSetListResp_ElementSetsEntry {
    return ElementSetListResp_ElementSetsEntry.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ElementSetListResp_ElementSetsEntry>, I>>(
    object: I,
  ): ElementSetListResp_ElementSetsEntry {
    const message = createBaseElementSetListResp_ElementSetsEntry();
    message.key = object.key ?? "";
    message.value = (object.value !== undefined && object.value !== null)
      ? ElementSetSummary.fromPartial(object.value)
      : undefined;
    return message;
  },
};

function createBaseElementSetGetReq(): ElementSetGetReq {
  return { id: "" };
}

export const ElementSetGetReq = {
  encode(message: ElementSetGetReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ElementSetGetReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseElementSetGetReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.id = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ElementSetGetReq {
    return { id: isSet(object.id) ? String(object.id) : "" };
  },

  toJSON(message: ElementSetGetReq): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    return obj;
  },

  create<I extends Exact<DeepPartial<ElementSetGetReq>, I>>(base?: I): ElementSetGetReq {
    return ElementSetGetReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ElementSetGetReq>, I>>(object: I): ElementSetGetReq {
    const message = createBaseElementSetGetReq();
    message.id = object.id ?? "";
    return message;
  },
};

function createBaseElementSetGetResp(): ElementSetGetResp {
  return { status: 0, elementSet: undefined };
}

export const ElementSetGetResp = {
  encode(message: ElementSetGetResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    if (message.elementSet !== undefined) {
      ElementSet.encode(message.elementSet, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ElementSetGetResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseElementSetGetResp();
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

          message.elementSet = ElementSet.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ElementSetGetResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      elementSet: isSet(object.elementSet) ? ElementSet.fromJSON(object.elementSet) : undefined,
    };
  },

  toJSON(message: ElementSetGetResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    message.elementSet !== undefined &&
      (obj.elementSet = message.elementSet ? ElementSet.toJSON(message.elementSet) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<ElementSetGetResp>, I>>(base?: I): ElementSetGetResp {
    return ElementSetGetResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ElementSetGetResp>, I>>(object: I): ElementSetGetResp {
    const message = createBaseElementSetGetResp();
    message.status = object.status ?? 0;
    message.elementSet = (object.elementSet !== undefined && object.elementSet !== null)
      ? ElementSet.fromPartial(object.elementSet)
      : undefined;
    return message;
  },
};

function createBaseElementSetWriteReq(): ElementSetWriteReq {
  return { id: "", elementSet: undefined };
}

export const ElementSetWriteReq = {
  encode(message: ElementSetWriteReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    if (message.elementSet !== undefined) {
      ElementSet.encode(message.elementSet, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ElementSetWriteReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseElementSetWriteReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.id = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.elementSet = ElementSet.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ElementSetWriteReq {
    return {
      id: isSet(object.id) ? String(object.id) : "",
      elementSet: isSet(object.elementSet) ? ElementSet.fromJSON(object.elementSet) : undefined,
    };
  },

  toJSON(message: ElementSetWriteReq): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    message.elementSet !== undefined &&
      (obj.elementSet = message.elementSet ? ElementSet.toJSON(message.elementSet) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<ElementSetWriteReq>, I>>(base?: I): ElementSetWriteReq {
    return ElementSetWriteReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ElementSetWriteReq>, I>>(object: I): ElementSetWriteReq {
    const message = createBaseElementSetWriteReq();
    message.id = object.id ?? "";
    message.elementSet = (object.elementSet !== undefined && object.elementSet !== null)
      ? ElementSet.fromPartial(object.elementSet)
      : undefined;
    return message;
  },
};

function createBaseElementSetWriteResp(): ElementSetWriteResp {
  return { status: 0 };
}

export const ElementSetWriteResp = {
  encode(message: ElementSetWriteResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ElementSetWriteResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseElementSetWriteResp();
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

  fromJSON(object: any): ElementSetWriteResp {
    return { status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0 };
  },

  toJSON(message: ElementSetWriteResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    return obj;
  },

  create<I extends Exact<DeepPartial<ElementSetWriteResp>, I>>(base?: I): ElementSetWriteResp {
    return ElementSetWriteResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ElementSetWriteResp>, I>>(object: I): ElementSetWriteResp {
    const message = createBaseElementSetWriteResp();
    message.status = object.status ?? 0;
    return message;
  },
};

function createBaseElementSetDeleteReq(): ElementSetDeleteReq {
  return { id: "" };
}

export const ElementSetDeleteReq = {
  encode(message: ElementSetDeleteReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ElementSetDeleteReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseElementSetDeleteReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.id = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ElementSetDeleteReq {
    return { id: isSet(object.id) ? String(object.id) : "" };
  },

  toJSON(message: ElementSetDeleteReq): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    return obj;
  },

  create<I extends Exact<DeepPartial<ElementSetDeleteReq>, I>>(base?: I): ElementSetDeleteReq {
    return ElementSetDeleteReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ElementSetDeleteReq>, I>>(object: I): ElementSetDeleteReq {
    const message = createBaseElementSetDeleteReq();
    message.id = object.id ?? "";
    return message;
  },
};

function createBaseElementSetDeleteResp(): ElementSetDeleteResp {
  return { status: 0 };
}

export const ElementSetDeleteResp = {
  encode(message: ElementSetDeleteResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ElementSetDeleteResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseElementSetDeleteResp();
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

  fromJSON(object: any): ElementSetDeleteResp {
    return { status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0 };
  },

  toJSON(message: ElementSetDeleteResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    return obj;
  },

  create<I extends Exact<DeepPartial<ElementSetDeleteResp>, I>>(base?: I): ElementSetDeleteResp {
    return ElementSetDeleteResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ElementSetDeleteResp>, I>>(object: I): ElementSetDeleteResp {
    const message = createBaseElementSetDeleteResp();
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
