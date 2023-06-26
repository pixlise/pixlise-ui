/* eslint-disable */
import * as Long from "long";
import * as _m0 from "protobufjs/minimal";
import { DataExpression, DataExpressionExecStats, ExpressionResultItem } from "./expressions";
import { ResponseStatus, responseStatusFromJSON, responseStatusToJSON } from "./response";

export const protobufPackage = "";

export interface ExpressionListReq {
}

export interface ExpressionListResp {
  status: ResponseStatus;
  expressions: { [key: string]: DataExpression };
}

export interface ExpressionListResp_ExpressionsEntry {
  key: string;
  value: DataExpression | undefined;
}

export interface ExpressionReq {
  id: string;
}

export interface ExpressionResp {
  status: ResponseStatus;
  id: string;
  expression: DataExpression | undefined;
}

/** If id is blank, assume its new and generate an ID to return, otherwise update & return same one */
export interface ExpressionWriteReq {
  id: string;
  expression: DataExpression | undefined;
}

export interface ExpressionWriteResp {
  status: ResponseStatus;
  id: string;
  expression: DataExpression | undefined;
}

export interface ExpressionDeleteReq {
  id: string;
}

export interface ExpressionDeleteResp {
  status: ResponseStatus;
}

export interface ExpressionWriteExecStatReq {
  id: string;
  stats: DataExpressionExecStats | undefined;
}

export interface ExpressionWriteExecStatResp {
  status: ResponseStatus;
}

/**
 * TODO... memoization of expression results... Not sure if we write something specific here
 * or if this becomes some part of a general caching mechanism
 */
export interface ExpressionWriteResultReq {
  expressionId: string;
  expressionModTimeUnixSec: number;
  scanId: string;
  roiId: string;
  roiModTimeUnixSec: number;
  resultColumns: string[];
  resultItems: ExpressionResultItem[];
}

export interface ExpressionWriteResultResp {
  status: ResponseStatus;
}

function createBaseExpressionListReq(): ExpressionListReq {
  return {};
}

export const ExpressionListReq = {
  encode(_: ExpressionListReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExpressionListReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExpressionListReq();
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

  fromJSON(_: any): ExpressionListReq {
    return {};
  },

  toJSON(_: ExpressionListReq): unknown {
    const obj: any = {};
    return obj;
  },

  create<I extends Exact<DeepPartial<ExpressionListReq>, I>>(base?: I): ExpressionListReq {
    return ExpressionListReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ExpressionListReq>, I>>(_: I): ExpressionListReq {
    const message = createBaseExpressionListReq();
    return message;
  },
};

function createBaseExpressionListResp(): ExpressionListResp {
  return { status: 0, expressions: {} };
}

export const ExpressionListResp = {
  encode(message: ExpressionListResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    Object.entries(message.expressions).forEach(([key, value]) => {
      ExpressionListResp_ExpressionsEntry.encode({ key: key as any, value }, writer.uint32(18).fork()).ldelim();
    });
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExpressionListResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExpressionListResp();
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

          const entry2 = ExpressionListResp_ExpressionsEntry.decode(reader, reader.uint32());
          if (entry2.value !== undefined) {
            message.expressions[entry2.key] = entry2.value;
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

  fromJSON(object: any): ExpressionListResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      expressions: isObject(object.expressions)
        ? Object.entries(object.expressions).reduce<{ [key: string]: DataExpression }>((acc, [key, value]) => {
          acc[key] = DataExpression.fromJSON(value);
          return acc;
        }, {})
        : {},
    };
  },

  toJSON(message: ExpressionListResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    obj.expressions = {};
    if (message.expressions) {
      Object.entries(message.expressions).forEach(([k, v]) => {
        obj.expressions[k] = DataExpression.toJSON(v);
      });
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ExpressionListResp>, I>>(base?: I): ExpressionListResp {
    return ExpressionListResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ExpressionListResp>, I>>(object: I): ExpressionListResp {
    const message = createBaseExpressionListResp();
    message.status = object.status ?? 0;
    message.expressions = Object.entries(object.expressions ?? {}).reduce<{ [key: string]: DataExpression }>(
      (acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = DataExpression.fromPartial(value);
        }
        return acc;
      },
      {},
    );
    return message;
  },
};

function createBaseExpressionListResp_ExpressionsEntry(): ExpressionListResp_ExpressionsEntry {
  return { key: "", value: undefined };
}

export const ExpressionListResp_ExpressionsEntry = {
  encode(message: ExpressionListResp_ExpressionsEntry, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.key !== "") {
      writer.uint32(10).string(message.key);
    }
    if (message.value !== undefined) {
      DataExpression.encode(message.value, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExpressionListResp_ExpressionsEntry {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExpressionListResp_ExpressionsEntry();
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

          message.value = DataExpression.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ExpressionListResp_ExpressionsEntry {
    return {
      key: isSet(object.key) ? String(object.key) : "",
      value: isSet(object.value) ? DataExpression.fromJSON(object.value) : undefined,
    };
  },

  toJSON(message: ExpressionListResp_ExpressionsEntry): unknown {
    const obj: any = {};
    message.key !== undefined && (obj.key = message.key);
    message.value !== undefined && (obj.value = message.value ? DataExpression.toJSON(message.value) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<ExpressionListResp_ExpressionsEntry>, I>>(
    base?: I,
  ): ExpressionListResp_ExpressionsEntry {
    return ExpressionListResp_ExpressionsEntry.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ExpressionListResp_ExpressionsEntry>, I>>(
    object: I,
  ): ExpressionListResp_ExpressionsEntry {
    const message = createBaseExpressionListResp_ExpressionsEntry();
    message.key = object.key ?? "";
    message.value = (object.value !== undefined && object.value !== null)
      ? DataExpression.fromPartial(object.value)
      : undefined;
    return message;
  },
};

function createBaseExpressionReq(): ExpressionReq {
  return { id: "" };
}

export const ExpressionReq = {
  encode(message: ExpressionReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExpressionReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExpressionReq();
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

  fromJSON(object: any): ExpressionReq {
    return { id: isSet(object.id) ? String(object.id) : "" };
  },

  toJSON(message: ExpressionReq): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    return obj;
  },

  create<I extends Exact<DeepPartial<ExpressionReq>, I>>(base?: I): ExpressionReq {
    return ExpressionReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ExpressionReq>, I>>(object: I): ExpressionReq {
    const message = createBaseExpressionReq();
    message.id = object.id ?? "";
    return message;
  },
};

function createBaseExpressionResp(): ExpressionResp {
  return { status: 0, id: "", expression: undefined };
}

export const ExpressionResp = {
  encode(message: ExpressionResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    if (message.id !== "") {
      writer.uint32(18).string(message.id);
    }
    if (message.expression !== undefined) {
      DataExpression.encode(message.expression, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExpressionResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExpressionResp();
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

          message.id = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.expression = DataExpression.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ExpressionResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      id: isSet(object.id) ? String(object.id) : "",
      expression: isSet(object.expression) ? DataExpression.fromJSON(object.expression) : undefined,
    };
  },

  toJSON(message: ExpressionResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    message.id !== undefined && (obj.id = message.id);
    message.expression !== undefined &&
      (obj.expression = message.expression ? DataExpression.toJSON(message.expression) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<ExpressionResp>, I>>(base?: I): ExpressionResp {
    return ExpressionResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ExpressionResp>, I>>(object: I): ExpressionResp {
    const message = createBaseExpressionResp();
    message.status = object.status ?? 0;
    message.id = object.id ?? "";
    message.expression = (object.expression !== undefined && object.expression !== null)
      ? DataExpression.fromPartial(object.expression)
      : undefined;
    return message;
  },
};

function createBaseExpressionWriteReq(): ExpressionWriteReq {
  return { id: "", expression: undefined };
}

export const ExpressionWriteReq = {
  encode(message: ExpressionWriteReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    if (message.expression !== undefined) {
      DataExpression.encode(message.expression, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExpressionWriteReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExpressionWriteReq();
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

          message.expression = DataExpression.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ExpressionWriteReq {
    return {
      id: isSet(object.id) ? String(object.id) : "",
      expression: isSet(object.expression) ? DataExpression.fromJSON(object.expression) : undefined,
    };
  },

  toJSON(message: ExpressionWriteReq): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    message.expression !== undefined &&
      (obj.expression = message.expression ? DataExpression.toJSON(message.expression) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<ExpressionWriteReq>, I>>(base?: I): ExpressionWriteReq {
    return ExpressionWriteReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ExpressionWriteReq>, I>>(object: I): ExpressionWriteReq {
    const message = createBaseExpressionWriteReq();
    message.id = object.id ?? "";
    message.expression = (object.expression !== undefined && object.expression !== null)
      ? DataExpression.fromPartial(object.expression)
      : undefined;
    return message;
  },
};

function createBaseExpressionWriteResp(): ExpressionWriteResp {
  return { status: 0, id: "", expression: undefined };
}

export const ExpressionWriteResp = {
  encode(message: ExpressionWriteResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    if (message.id !== "") {
      writer.uint32(18).string(message.id);
    }
    if (message.expression !== undefined) {
      DataExpression.encode(message.expression, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExpressionWriteResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExpressionWriteResp();
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

          message.id = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.expression = DataExpression.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ExpressionWriteResp {
    return {
      status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0,
      id: isSet(object.id) ? String(object.id) : "",
      expression: isSet(object.expression) ? DataExpression.fromJSON(object.expression) : undefined,
    };
  },

  toJSON(message: ExpressionWriteResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    message.id !== undefined && (obj.id = message.id);
    message.expression !== undefined &&
      (obj.expression = message.expression ? DataExpression.toJSON(message.expression) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<ExpressionWriteResp>, I>>(base?: I): ExpressionWriteResp {
    return ExpressionWriteResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ExpressionWriteResp>, I>>(object: I): ExpressionWriteResp {
    const message = createBaseExpressionWriteResp();
    message.status = object.status ?? 0;
    message.id = object.id ?? "";
    message.expression = (object.expression !== undefined && object.expression !== null)
      ? DataExpression.fromPartial(object.expression)
      : undefined;
    return message;
  },
};

function createBaseExpressionDeleteReq(): ExpressionDeleteReq {
  return { id: "" };
}

export const ExpressionDeleteReq = {
  encode(message: ExpressionDeleteReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExpressionDeleteReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExpressionDeleteReq();
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

  fromJSON(object: any): ExpressionDeleteReq {
    return { id: isSet(object.id) ? String(object.id) : "" };
  },

  toJSON(message: ExpressionDeleteReq): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    return obj;
  },

  create<I extends Exact<DeepPartial<ExpressionDeleteReq>, I>>(base?: I): ExpressionDeleteReq {
    return ExpressionDeleteReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ExpressionDeleteReq>, I>>(object: I): ExpressionDeleteReq {
    const message = createBaseExpressionDeleteReq();
    message.id = object.id ?? "";
    return message;
  },
};

function createBaseExpressionDeleteResp(): ExpressionDeleteResp {
  return { status: 0 };
}

export const ExpressionDeleteResp = {
  encode(message: ExpressionDeleteResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExpressionDeleteResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExpressionDeleteResp();
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

  fromJSON(object: any): ExpressionDeleteResp {
    return { status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0 };
  },

  toJSON(message: ExpressionDeleteResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    return obj;
  },

  create<I extends Exact<DeepPartial<ExpressionDeleteResp>, I>>(base?: I): ExpressionDeleteResp {
    return ExpressionDeleteResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ExpressionDeleteResp>, I>>(object: I): ExpressionDeleteResp {
    const message = createBaseExpressionDeleteResp();
    message.status = object.status ?? 0;
    return message;
  },
};

function createBaseExpressionWriteExecStatReq(): ExpressionWriteExecStatReq {
  return { id: "", stats: undefined };
}

export const ExpressionWriteExecStatReq = {
  encode(message: ExpressionWriteExecStatReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    if (message.stats !== undefined) {
      DataExpressionExecStats.encode(message.stats, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExpressionWriteExecStatReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExpressionWriteExecStatReq();
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

          message.stats = DataExpressionExecStats.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ExpressionWriteExecStatReq {
    return {
      id: isSet(object.id) ? String(object.id) : "",
      stats: isSet(object.stats) ? DataExpressionExecStats.fromJSON(object.stats) : undefined,
    };
  },

  toJSON(message: ExpressionWriteExecStatReq): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    message.stats !== undefined &&
      (obj.stats = message.stats ? DataExpressionExecStats.toJSON(message.stats) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<ExpressionWriteExecStatReq>, I>>(base?: I): ExpressionWriteExecStatReq {
    return ExpressionWriteExecStatReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ExpressionWriteExecStatReq>, I>>(object: I): ExpressionWriteExecStatReq {
    const message = createBaseExpressionWriteExecStatReq();
    message.id = object.id ?? "";
    message.stats = (object.stats !== undefined && object.stats !== null)
      ? DataExpressionExecStats.fromPartial(object.stats)
      : undefined;
    return message;
  },
};

function createBaseExpressionWriteExecStatResp(): ExpressionWriteExecStatResp {
  return { status: 0 };
}

export const ExpressionWriteExecStatResp = {
  encode(message: ExpressionWriteExecStatResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExpressionWriteExecStatResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExpressionWriteExecStatResp();
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

  fromJSON(object: any): ExpressionWriteExecStatResp {
    return { status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0 };
  },

  toJSON(message: ExpressionWriteExecStatResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    return obj;
  },

  create<I extends Exact<DeepPartial<ExpressionWriteExecStatResp>, I>>(base?: I): ExpressionWriteExecStatResp {
    return ExpressionWriteExecStatResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ExpressionWriteExecStatResp>, I>>(object: I): ExpressionWriteExecStatResp {
    const message = createBaseExpressionWriteExecStatResp();
    message.status = object.status ?? 0;
    return message;
  },
};

function createBaseExpressionWriteResultReq(): ExpressionWriteResultReq {
  return {
    expressionId: "",
    expressionModTimeUnixSec: 0,
    scanId: "",
    roiId: "",
    roiModTimeUnixSec: 0,
    resultColumns: [],
    resultItems: [],
  };
}

export const ExpressionWriteResultReq = {
  encode(message: ExpressionWriteResultReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.expressionId !== "") {
      writer.uint32(10).string(message.expressionId);
    }
    if (message.expressionModTimeUnixSec !== 0) {
      writer.uint32(16).uint64(message.expressionModTimeUnixSec);
    }
    if (message.scanId !== "") {
      writer.uint32(26).string(message.scanId);
    }
    if (message.roiId !== "") {
      writer.uint32(34).string(message.roiId);
    }
    if (message.roiModTimeUnixSec !== 0) {
      writer.uint32(40).uint64(message.roiModTimeUnixSec);
    }
    for (const v of message.resultColumns) {
      writer.uint32(50).string(v!);
    }
    for (const v of message.resultItems) {
      ExpressionResultItem.encode(v!, writer.uint32(58).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExpressionWriteResultReq {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExpressionWriteResultReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.expressionId = reader.string();
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.expressionModTimeUnixSec = longToNumber(reader.uint64() as Long);
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.scanId = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.roiId = reader.string();
          continue;
        case 5:
          if (tag !== 40) {
            break;
          }

          message.roiModTimeUnixSec = longToNumber(reader.uint64() as Long);
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.resultColumns.push(reader.string());
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.resultItems.push(ExpressionResultItem.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ExpressionWriteResultReq {
    return {
      expressionId: isSet(object.expressionId) ? String(object.expressionId) : "",
      expressionModTimeUnixSec: isSet(object.expressionModTimeUnixSec) ? Number(object.expressionModTimeUnixSec) : 0,
      scanId: isSet(object.scanId) ? String(object.scanId) : "",
      roiId: isSet(object.roiId) ? String(object.roiId) : "",
      roiModTimeUnixSec: isSet(object.roiModTimeUnixSec) ? Number(object.roiModTimeUnixSec) : 0,
      resultColumns: Array.isArray(object?.resultColumns) ? object.resultColumns.map((e: any) => String(e)) : [],
      resultItems: Array.isArray(object?.resultItems)
        ? object.resultItems.map((e: any) => ExpressionResultItem.fromJSON(e))
        : [],
    };
  },

  toJSON(message: ExpressionWriteResultReq): unknown {
    const obj: any = {};
    message.expressionId !== undefined && (obj.expressionId = message.expressionId);
    message.expressionModTimeUnixSec !== undefined &&
      (obj.expressionModTimeUnixSec = Math.round(message.expressionModTimeUnixSec));
    message.scanId !== undefined && (obj.scanId = message.scanId);
    message.roiId !== undefined && (obj.roiId = message.roiId);
    message.roiModTimeUnixSec !== undefined && (obj.roiModTimeUnixSec = Math.round(message.roiModTimeUnixSec));
    if (message.resultColumns) {
      obj.resultColumns = message.resultColumns.map((e) => e);
    } else {
      obj.resultColumns = [];
    }
    if (message.resultItems) {
      obj.resultItems = message.resultItems.map((e) => e ? ExpressionResultItem.toJSON(e) : undefined);
    } else {
      obj.resultItems = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ExpressionWriteResultReq>, I>>(base?: I): ExpressionWriteResultReq {
    return ExpressionWriteResultReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ExpressionWriteResultReq>, I>>(object: I): ExpressionWriteResultReq {
    const message = createBaseExpressionWriteResultReq();
    message.expressionId = object.expressionId ?? "";
    message.expressionModTimeUnixSec = object.expressionModTimeUnixSec ?? 0;
    message.scanId = object.scanId ?? "";
    message.roiId = object.roiId ?? "";
    message.roiModTimeUnixSec = object.roiModTimeUnixSec ?? 0;
    message.resultColumns = object.resultColumns?.map((e) => e) || [];
    message.resultItems = object.resultItems?.map((e) => ExpressionResultItem.fromPartial(e)) || [];
    return message;
  },
};

function createBaseExpressionWriteResultResp(): ExpressionWriteResultResp {
  return { status: 0 };
}

export const ExpressionWriteResultResp = {
  encode(message: ExpressionWriteResultResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExpressionWriteResultResp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExpressionWriteResultResp();
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

  fromJSON(object: any): ExpressionWriteResultResp {
    return { status: isSet(object.status) ? responseStatusFromJSON(object.status) : 0 };
  },

  toJSON(message: ExpressionWriteResultResp): unknown {
    const obj: any = {};
    message.status !== undefined && (obj.status = responseStatusToJSON(message.status));
    return obj;
  },

  create<I extends Exact<DeepPartial<ExpressionWriteResultResp>, I>>(base?: I): ExpressionWriteResultResp {
    return ExpressionWriteResultResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ExpressionWriteResultResp>, I>>(object: I): ExpressionWriteResultResp {
    const message = createBaseExpressionWriteResultResp();
    message.status = object.status ?? 0;
    return message;
  },
};

declare var self: any | undefined;
declare var window: any | undefined;
declare var global: any | undefined;
var tsProtoGlobalThis: any = (() => {
  if (typeof globalThis !== "undefined") {
    return globalThis;
  }
  if (typeof self !== "undefined") {
    return self;
  }
  if (typeof window !== "undefined") {
    return window;
  }
  if (typeof global !== "undefined") {
    return global;
  }
  throw "Unable to locate global object";
})();

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin ? T
  : T extends Array<infer U> ? Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & { [K in Exclude<keyof I, KeysOfUnion<P>>]: never };

function longToNumber(long: Long): number {
  if (long.gt(Number.MAX_SAFE_INTEGER)) {
    throw new tsProtoGlobalThis.Error("Value is larger than Number.MAX_SAFE_INTEGER");
  }
  return long.toNumber();
}

// If you get a compile-error about 'Constructor<Long> and ... have no overlap',
// add '--ts_proto_opt=esModuleInterop=true' as a flag when calling 'protoc'.
if (_m0.util.Long !== Long) {
  _m0.util.Long = Long as any;
  _m0.configure();
}

function isObject(value: any): boolean {
  return typeof value === "object" && value !== null;
}

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
