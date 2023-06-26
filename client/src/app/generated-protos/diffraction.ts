/* eslint-disable */
import * as _m0 from "protobufjs/minimal";

export const protobufPackage = "";

export interface ManualDiffractionPeak {
  pmc: number;
  energykeV: number;
}

function createBaseManualDiffractionPeak(): ManualDiffractionPeak {
  return { pmc: 0, energykeV: 0 };
}

export const ManualDiffractionPeak = {
  encode(message: ManualDiffractionPeak, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.pmc !== 0) {
      writer.uint32(8).int32(message.pmc);
    }
    if (message.energykeV !== 0) {
      writer.uint32(21).float(message.energykeV);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ManualDiffractionPeak {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseManualDiffractionPeak();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.pmc = reader.int32();
          continue;
        case 2:
          if (tag !== 21) {
            break;
          }

          message.energykeV = reader.float();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ManualDiffractionPeak {
    return {
      pmc: isSet(object.pmc) ? Number(object.pmc) : 0,
      energykeV: isSet(object.energykeV) ? Number(object.energykeV) : 0,
    };
  },

  toJSON(message: ManualDiffractionPeak): unknown {
    const obj: any = {};
    message.pmc !== undefined && (obj.pmc = Math.round(message.pmc));
    message.energykeV !== undefined && (obj.energykeV = message.energykeV);
    return obj;
  },

  create<I extends Exact<DeepPartial<ManualDiffractionPeak>, I>>(base?: I): ManualDiffractionPeak {
    return ManualDiffractionPeak.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ManualDiffractionPeak>, I>>(object: I): ManualDiffractionPeak {
    const message = createBaseManualDiffractionPeak();
    message.pmc = object.pmc ?? 0;
    message.energykeV = object.energykeV ?? 0;
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
