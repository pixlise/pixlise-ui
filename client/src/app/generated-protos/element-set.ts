/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { Ownership } from "./ownership-access";

export const protobufPackage = "";

export interface ElementLines {
  Z: number;
  K: boolean;
  L: boolean;
  M: boolean;
  Esc: boolean;
}

export interface ElementSet {
  name: string;
  lines: ElementLines[];
  owner: Ownership | undefined;
}

export interface ElementSetSummary {
  name: string;
  atomicNumbers: number[];
  owner: Ownership | undefined;
}

function createBaseElementLines(): ElementLines {
  return { Z: 0, K: false, L: false, M: false, Esc: false };
}

export const ElementLines = {
  encode(message: ElementLines, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.Z !== 0) {
      writer.uint32(8).int32(message.Z);
    }
    if (message.K === true) {
      writer.uint32(16).bool(message.K);
    }
    if (message.L === true) {
      writer.uint32(24).bool(message.L);
    }
    if (message.M === true) {
      writer.uint32(32).bool(message.M);
    }
    if (message.Esc === true) {
      writer.uint32(40).bool(message.Esc);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ElementLines {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseElementLines();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.Z = reader.int32();
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.K = reader.bool();
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.L = reader.bool();
          continue;
        case 4:
          if (tag !== 32) {
            break;
          }

          message.M = reader.bool();
          continue;
        case 5:
          if (tag !== 40) {
            break;
          }

          message.Esc = reader.bool();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ElementLines {
    return {
      Z: isSet(object.Z) ? Number(object.Z) : 0,
      K: isSet(object.K) ? Boolean(object.K) : false,
      L: isSet(object.L) ? Boolean(object.L) : false,
      M: isSet(object.M) ? Boolean(object.M) : false,
      Esc: isSet(object.Esc) ? Boolean(object.Esc) : false,
    };
  },

  toJSON(message: ElementLines): unknown {
    const obj: any = {};
    message.Z !== undefined && (obj.Z = Math.round(message.Z));
    message.K !== undefined && (obj.K = message.K);
    message.L !== undefined && (obj.L = message.L);
    message.M !== undefined && (obj.M = message.M);
    message.Esc !== undefined && (obj.Esc = message.Esc);
    return obj;
  },

  create<I extends Exact<DeepPartial<ElementLines>, I>>(base?: I): ElementLines {
    return ElementLines.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ElementLines>, I>>(object: I): ElementLines {
    const message = createBaseElementLines();
    message.Z = object.Z ?? 0;
    message.K = object.K ?? false;
    message.L = object.L ?? false;
    message.M = object.M ?? false;
    message.Esc = object.Esc ?? false;
    return message;
  },
};

function createBaseElementSet(): ElementSet {
  return { name: "", lines: [], owner: undefined };
}

export const ElementSet = {
  encode(message: ElementSet, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.name !== "") {
      writer.uint32(10).string(message.name);
    }
    for (const v of message.lines) {
      ElementLines.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    if (message.owner !== undefined) {
      Ownership.encode(message.owner, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ElementSet {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseElementSet();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.name = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.lines.push(ElementLines.decode(reader, reader.uint32()));
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.owner = Ownership.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ElementSet {
    return {
      name: isSet(object.name) ? String(object.name) : "",
      lines: Array.isArray(object?.lines) ? object.lines.map((e: any) => ElementLines.fromJSON(e)) : [],
      owner: isSet(object.owner) ? Ownership.fromJSON(object.owner) : undefined,
    };
  },

  toJSON(message: ElementSet): unknown {
    const obj: any = {};
    message.name !== undefined && (obj.name = message.name);
    if (message.lines) {
      obj.lines = message.lines.map((e) => e ? ElementLines.toJSON(e) : undefined);
    } else {
      obj.lines = [];
    }
    message.owner !== undefined && (obj.owner = message.owner ? Ownership.toJSON(message.owner) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<ElementSet>, I>>(base?: I): ElementSet {
    return ElementSet.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ElementSet>, I>>(object: I): ElementSet {
    const message = createBaseElementSet();
    message.name = object.name ?? "";
    message.lines = object.lines?.map((e) => ElementLines.fromPartial(e)) || [];
    message.owner = (object.owner !== undefined && object.owner !== null)
      ? Ownership.fromPartial(object.owner)
      : undefined;
    return message;
  },
};

function createBaseElementSetSummary(): ElementSetSummary {
  return { name: "", atomicNumbers: [], owner: undefined };
}

export const ElementSetSummary = {
  encode(message: ElementSetSummary, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.name !== "") {
      writer.uint32(10).string(message.name);
    }
    writer.uint32(18).fork();
    for (const v of message.atomicNumbers) {
      writer.int32(v);
    }
    writer.ldelim();
    if (message.owner !== undefined) {
      Ownership.encode(message.owner, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ElementSetSummary {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseElementSetSummary();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.name = reader.string();
          continue;
        case 2:
          if (tag === 16) {
            message.atomicNumbers.push(reader.int32());

            continue;
          }

          if (tag === 18) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.atomicNumbers.push(reader.int32());
            }

            continue;
          }

          break;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.owner = Ownership.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ElementSetSummary {
    return {
      name: isSet(object.name) ? String(object.name) : "",
      atomicNumbers: Array.isArray(object?.atomicNumbers) ? object.atomicNumbers.map((e: any) => Number(e)) : [],
      owner: isSet(object.owner) ? Ownership.fromJSON(object.owner) : undefined,
    };
  },

  toJSON(message: ElementSetSummary): unknown {
    const obj: any = {};
    message.name !== undefined && (obj.name = message.name);
    if (message.atomicNumbers) {
      obj.atomicNumbers = message.atomicNumbers.map((e) => Math.round(e));
    } else {
      obj.atomicNumbers = [];
    }
    message.owner !== undefined && (obj.owner = message.owner ? Ownership.toJSON(message.owner) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<ElementSetSummary>, I>>(base?: I): ElementSetSummary {
    return ElementSetSummary.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ElementSetSummary>, I>>(object: I): ElementSetSummary {
    const message = createBaseElementSetSummary();
    message.name = object.name ?? "";
    message.atomicNumbers = object.atomicNumbers?.map((e) => e) || [];
    message.owner = (object.owner !== undefined && object.owner !== null)
      ? Ownership.fromPartial(object.owner)
      : undefined;
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
