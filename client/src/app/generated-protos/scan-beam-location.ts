/* eslint-disable */
import * as _m0 from "protobufjs/minimal";

export const protobufPackage = "";

/** Defines beam locations of an individual location */
export interface Coordinate2D {
  i: number;
  j: number;
}

export interface ImageLocations {
  imageFileName: string;
  locations: Coordinate2D[];
}

function createBaseCoordinate2D(): Coordinate2D {
  return { i: 0, j: 0 };
}

export const Coordinate2D = {
  encode(message: Coordinate2D, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.i !== 0) {
      writer.uint32(13).float(message.i);
    }
    if (message.j !== 0) {
      writer.uint32(21).float(message.j);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Coordinate2D {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCoordinate2D();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 13) {
            break;
          }

          message.i = reader.float();
          continue;
        case 2:
          if (tag !== 21) {
            break;
          }

          message.j = reader.float();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Coordinate2D {
    return { i: isSet(object.i) ? Number(object.i) : 0, j: isSet(object.j) ? Number(object.j) : 0 };
  },

  toJSON(message: Coordinate2D): unknown {
    const obj: any = {};
    message.i !== undefined && (obj.i = message.i);
    message.j !== undefined && (obj.j = message.j);
    return obj;
  },

  create<I extends Exact<DeepPartial<Coordinate2D>, I>>(base?: I): Coordinate2D {
    return Coordinate2D.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<Coordinate2D>, I>>(object: I): Coordinate2D {
    const message = createBaseCoordinate2D();
    message.i = object.i ?? 0;
    message.j = object.j ?? 0;
    return message;
  },
};

function createBaseImageLocations(): ImageLocations {
  return { imageFileName: "", locations: [] };
}

export const ImageLocations = {
  encode(message: ImageLocations, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.imageFileName !== "") {
      writer.uint32(10).string(message.imageFileName);
    }
    for (const v of message.locations) {
      Coordinate2D.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ImageLocations {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseImageLocations();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.imageFileName = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.locations.push(Coordinate2D.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ImageLocations {
    return {
      imageFileName: isSet(object.imageFileName) ? String(object.imageFileName) : "",
      locations: Array.isArray(object?.locations) ? object.locations.map((e: any) => Coordinate2D.fromJSON(e)) : [],
    };
  },

  toJSON(message: ImageLocations): unknown {
    const obj: any = {};
    message.imageFileName !== undefined && (obj.imageFileName = message.imageFileName);
    if (message.locations) {
      obj.locations = message.locations.map((e) => e ? Coordinate2D.toJSON(e) : undefined);
    } else {
      obj.locations = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ImageLocations>, I>>(base?: I): ImageLocations {
    return ImageLocations.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ImageLocations>, I>>(object: I): ImageLocations {
    const message = createBaseImageLocations();
    message.imageFileName = object.imageFileName ?? "";
    message.locations = object.locations?.map((e) => Coordinate2D.fromPartial(e)) || [];
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
