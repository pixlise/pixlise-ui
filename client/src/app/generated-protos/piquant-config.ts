/* eslint-disable */
import * as _m0 from "protobufjs/minimal";

export const protobufPackage = "";

export interface PiquantConfig {
  description: string;
  configFile: string;
  opticEfficiencyFile: string;
  calibrationFile: string;
  standardsFile: string;
}

function createBasePiquantConfig(): PiquantConfig {
  return { description: "", configFile: "", opticEfficiencyFile: "", calibrationFile: "", standardsFile: "" };
}

export const PiquantConfig = {
  encode(message: PiquantConfig, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.description !== "") {
      writer.uint32(10).string(message.description);
    }
    if (message.configFile !== "") {
      writer.uint32(18).string(message.configFile);
    }
    if (message.opticEfficiencyFile !== "") {
      writer.uint32(26).string(message.opticEfficiencyFile);
    }
    if (message.calibrationFile !== "") {
      writer.uint32(34).string(message.calibrationFile);
    }
    if (message.standardsFile !== "") {
      writer.uint32(42).string(message.standardsFile);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PiquantConfig {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePiquantConfig();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.description = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.configFile = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.opticEfficiencyFile = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.calibrationFile = reader.string();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.standardsFile = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): PiquantConfig {
    return {
      description: isSet(object.description) ? String(object.description) : "",
      configFile: isSet(object.configFile) ? String(object.configFile) : "",
      opticEfficiencyFile: isSet(object.opticEfficiencyFile) ? String(object.opticEfficiencyFile) : "",
      calibrationFile: isSet(object.calibrationFile) ? String(object.calibrationFile) : "",
      standardsFile: isSet(object.standardsFile) ? String(object.standardsFile) : "",
    };
  },

  toJSON(message: PiquantConfig): unknown {
    const obj: any = {};
    message.description !== undefined && (obj.description = message.description);
    message.configFile !== undefined && (obj.configFile = message.configFile);
    message.opticEfficiencyFile !== undefined && (obj.opticEfficiencyFile = message.opticEfficiencyFile);
    message.calibrationFile !== undefined && (obj.calibrationFile = message.calibrationFile);
    message.standardsFile !== undefined && (obj.standardsFile = message.standardsFile);
    return obj;
  },

  create<I extends Exact<DeepPartial<PiquantConfig>, I>>(base?: I): PiquantConfig {
    return PiquantConfig.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<PiquantConfig>, I>>(object: I): PiquantConfig {
    const message = createBasePiquantConfig();
    message.description = object.description ?? "";
    message.configFile = object.configFile ?? "";
    message.opticEfficiencyFile = object.opticEfficiencyFile ?? "";
    message.calibrationFile = object.calibrationFile ?? "";
    message.standardsFile = object.standardsFile ?? "";
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
