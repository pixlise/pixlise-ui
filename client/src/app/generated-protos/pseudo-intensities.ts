/* eslint-disable */
import * as _m0 from "protobufjs/minimal";

export const protobufPackage = "";

export interface PseudoIntensityData {
  intensities: number[];
}

function createBasePseudoIntensityData(): PseudoIntensityData {
  return { intensities: [] };
}

export const PseudoIntensityData = {
  encode(message: PseudoIntensityData, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    writer.uint32(18).fork();
    for (const v of message.intensities) {
      writer.float(v);
    }
    writer.ldelim();
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PseudoIntensityData {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePseudoIntensityData();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 2:
          if (tag === 21) {
            message.intensities.push(reader.float());

            continue;
          }

          if (tag === 18) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.intensities.push(reader.float());
            }

            continue;
          }

          break;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): PseudoIntensityData {
    return { intensities: Array.isArray(object?.intensities) ? object.intensities.map((e: any) => Number(e)) : [] };
  },

  toJSON(message: PseudoIntensityData): unknown {
    const obj: any = {};
    if (message.intensities) {
      obj.intensities = message.intensities.map((e) => e);
    } else {
      obj.intensities = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<PseudoIntensityData>, I>>(base?: I): PseudoIntensityData {
    return PseudoIntensityData.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<PseudoIntensityData>, I>>(object: I): PseudoIntensityData {
    const message = createBasePseudoIntensityData();
    message.intensities = object.intensities?.map((e) => e) || [];
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
