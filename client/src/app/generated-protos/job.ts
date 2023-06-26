/* eslint-disable */
import * as Long from "long";
import * as _m0 from "protobufjs/minimal";
import { Ownership } from "./ownership-access";

export const protobufPackage = "";

/**
 * TODO: Quants likely need to change to accommodate quantifying spectra from multiple
 * datasets together??
 */
export interface JobStartingParameters {
  name: string;
  dataBucket: string;
  datasetPath: string;
  datasetID: string;
  piquantJobsBucket: string;
  detectorConfig: string;
  elements: string[];
  parameters: string;
  runTimeSec: number;
  coresPerNode: number;
  startUnixTimeSec: number;
  owner: Ownership | undefined;
  roiID: string;
  elementSetID: string;
  PIQUANTVersion: string;
  quantMode: string;
  comments: string;
  roiIDs: string[];
  includeDwells: boolean;
  command: string;
}

export interface JobStartingParametersWithPMCCount {
  params: JobStartingParameters | undefined;
  PMCCount: number;
}

export interface JobStartingParametersWithPMCs {
  params: JobStartingParameters | undefined;
  PMCs: number[];
}

export interface JobStatus {
  jobID: string;
  status: JobStatus_Status;
  message: string;
  endUnixTimeSec: number;
  outputFilePath: string;
  piquantLogs: string[];
}

export enum JobStatus_Status {
  STARTING = 0,
  PREPARING_NODES = 1,
  NODES_RUNNING = 2,
  GATHERING_RESULTS = 3,
  COMPLETE = 5,
  ERROR = 6,
  UNRECOGNIZED = -1,
}

export function jobStatus_StatusFromJSON(object: any): JobStatus_Status {
  switch (object) {
    case 0:
    case "STARTING":
      return JobStatus_Status.STARTING;
    case 1:
    case "PREPARING_NODES":
      return JobStatus_Status.PREPARING_NODES;
    case 2:
    case "NODES_RUNNING":
      return JobStatus_Status.NODES_RUNNING;
    case 3:
    case "GATHERING_RESULTS":
      return JobStatus_Status.GATHERING_RESULTS;
    case 5:
    case "COMPLETE":
      return JobStatus_Status.COMPLETE;
    case 6:
    case "ERROR":
      return JobStatus_Status.ERROR;
    case -1:
    case "UNRECOGNIZED":
    default:
      return JobStatus_Status.UNRECOGNIZED;
  }
}

export function jobStatus_StatusToJSON(object: JobStatus_Status): string {
  switch (object) {
    case JobStatus_Status.STARTING:
      return "STARTING";
    case JobStatus_Status.PREPARING_NODES:
      return "PREPARING_NODES";
    case JobStatus_Status.NODES_RUNNING:
      return "NODES_RUNNING";
    case JobStatus_Status.GATHERING_RESULTS:
      return "GATHERING_RESULTS";
    case JobStatus_Status.COMPLETE:
      return "COMPLETE";
    case JobStatus_Status.ERROR:
      return "ERROR";
    case JobStatus_Status.UNRECOGNIZED:
    default:
      return "UNRECOGNIZED";
  }
}

export interface JobCreateParams {
  name: string;
  datasetPath: string;
  pmcs: string[];
  elements: string[];
  detectorconfig: string;
  parameters: string;
  runtimesec: number;
  /** There is now a list of ROI IDs that can be provided too. More relevant with the QuantMode *Bulk options */
  roiID: string;
  elementSetID: string;
  datasetId: string;
  /** Probably not correct for existing containers... */
  owner: Ownership | undefined;
  quantMode: string;
  /** If QuantMode = *Bulk, this is used, pmcs is ignored. */
  roiIDs: string[];
  includeDwells: boolean;
  command: string;
}

export interface JobSummaryItem {
  shared: boolean;
  params: JobStartingParametersWithPMCCount | undefined;
  elements: string[];
  /** TODO: Make this also contain *APIObjectItem and remove its own Shared field... */
  status: JobStatus | undefined;
}

function createBaseJobStartingParameters(): JobStartingParameters {
  return {
    name: "",
    dataBucket: "",
    datasetPath: "",
    datasetID: "",
    piquantJobsBucket: "",
    detectorConfig: "",
    elements: [],
    parameters: "",
    runTimeSec: 0,
    coresPerNode: 0,
    startUnixTimeSec: 0,
    owner: undefined,
    roiID: "",
    elementSetID: "",
    PIQUANTVersion: "",
    quantMode: "",
    comments: "",
    roiIDs: [],
    includeDwells: false,
    command: "",
  };
}

export const JobStartingParameters = {
  encode(message: JobStartingParameters, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.name !== "") {
      writer.uint32(10).string(message.name);
    }
    if (message.dataBucket !== "") {
      writer.uint32(18).string(message.dataBucket);
    }
    if (message.datasetPath !== "") {
      writer.uint32(26).string(message.datasetPath);
    }
    if (message.datasetID !== "") {
      writer.uint32(34).string(message.datasetID);
    }
    if (message.piquantJobsBucket !== "") {
      writer.uint32(42).string(message.piquantJobsBucket);
    }
    if (message.detectorConfig !== "") {
      writer.uint32(50).string(message.detectorConfig);
    }
    for (const v of message.elements) {
      writer.uint32(58).string(v!);
    }
    if (message.parameters !== "") {
      writer.uint32(66).string(message.parameters);
    }
    if (message.runTimeSec !== 0) {
      writer.uint32(72).uint32(message.runTimeSec);
    }
    if (message.coresPerNode !== 0) {
      writer.uint32(80).uint32(message.coresPerNode);
    }
    if (message.startUnixTimeSec !== 0) {
      writer.uint32(88).uint64(message.startUnixTimeSec);
    }
    if (message.owner !== undefined) {
      Ownership.encode(message.owner, writer.uint32(98).fork()).ldelim();
    }
    if (message.roiID !== "") {
      writer.uint32(106).string(message.roiID);
    }
    if (message.elementSetID !== "") {
      writer.uint32(114).string(message.elementSetID);
    }
    if (message.PIQUANTVersion !== "") {
      writer.uint32(122).string(message.PIQUANTVersion);
    }
    if (message.quantMode !== "") {
      writer.uint32(130).string(message.quantMode);
    }
    if (message.comments !== "") {
      writer.uint32(138).string(message.comments);
    }
    for (const v of message.roiIDs) {
      writer.uint32(146).string(v!);
    }
    if (message.includeDwells === true) {
      writer.uint32(152).bool(message.includeDwells);
    }
    if (message.command !== "") {
      writer.uint32(162).string(message.command);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): JobStartingParameters {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseJobStartingParameters();
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

          message.dataBucket = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.datasetPath = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.datasetID = reader.string();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.piquantJobsBucket = reader.string();
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.detectorConfig = reader.string();
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.elements.push(reader.string());
          continue;
        case 8:
          if (tag !== 66) {
            break;
          }

          message.parameters = reader.string();
          continue;
        case 9:
          if (tag !== 72) {
            break;
          }

          message.runTimeSec = reader.uint32();
          continue;
        case 10:
          if (tag !== 80) {
            break;
          }

          message.coresPerNode = reader.uint32();
          continue;
        case 11:
          if (tag !== 88) {
            break;
          }

          message.startUnixTimeSec = longToNumber(reader.uint64() as Long);
          continue;
        case 12:
          if (tag !== 98) {
            break;
          }

          message.owner = Ownership.decode(reader, reader.uint32());
          continue;
        case 13:
          if (tag !== 106) {
            break;
          }

          message.roiID = reader.string();
          continue;
        case 14:
          if (tag !== 114) {
            break;
          }

          message.elementSetID = reader.string();
          continue;
        case 15:
          if (tag !== 122) {
            break;
          }

          message.PIQUANTVersion = reader.string();
          continue;
        case 16:
          if (tag !== 130) {
            break;
          }

          message.quantMode = reader.string();
          continue;
        case 17:
          if (tag !== 138) {
            break;
          }

          message.comments = reader.string();
          continue;
        case 18:
          if (tag !== 146) {
            break;
          }

          message.roiIDs.push(reader.string());
          continue;
        case 19:
          if (tag !== 152) {
            break;
          }

          message.includeDwells = reader.bool();
          continue;
        case 20:
          if (tag !== 162) {
            break;
          }

          message.command = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): JobStartingParameters {
    return {
      name: isSet(object.name) ? String(object.name) : "",
      dataBucket: isSet(object.dataBucket) ? String(object.dataBucket) : "",
      datasetPath: isSet(object.datasetPath) ? String(object.datasetPath) : "",
      datasetID: isSet(object.datasetID) ? String(object.datasetID) : "",
      piquantJobsBucket: isSet(object.piquantJobsBucket) ? String(object.piquantJobsBucket) : "",
      detectorConfig: isSet(object.detectorConfig) ? String(object.detectorConfig) : "",
      elements: Array.isArray(object?.elements) ? object.elements.map((e: any) => String(e)) : [],
      parameters: isSet(object.parameters) ? String(object.parameters) : "",
      runTimeSec: isSet(object.runTimeSec) ? Number(object.runTimeSec) : 0,
      coresPerNode: isSet(object.coresPerNode) ? Number(object.coresPerNode) : 0,
      startUnixTimeSec: isSet(object.startUnixTimeSec) ? Number(object.startUnixTimeSec) : 0,
      owner: isSet(object.owner) ? Ownership.fromJSON(object.owner) : undefined,
      roiID: isSet(object.roiID) ? String(object.roiID) : "",
      elementSetID: isSet(object.elementSetID) ? String(object.elementSetID) : "",
      PIQUANTVersion: isSet(object.PIQUANTVersion) ? String(object.PIQUANTVersion) : "",
      quantMode: isSet(object.quantMode) ? String(object.quantMode) : "",
      comments: isSet(object.comments) ? String(object.comments) : "",
      roiIDs: Array.isArray(object?.roiIDs) ? object.roiIDs.map((e: any) => String(e)) : [],
      includeDwells: isSet(object.includeDwells) ? Boolean(object.includeDwells) : false,
      command: isSet(object.command) ? String(object.command) : "",
    };
  },

  toJSON(message: JobStartingParameters): unknown {
    const obj: any = {};
    message.name !== undefined && (obj.name = message.name);
    message.dataBucket !== undefined && (obj.dataBucket = message.dataBucket);
    message.datasetPath !== undefined && (obj.datasetPath = message.datasetPath);
    message.datasetID !== undefined && (obj.datasetID = message.datasetID);
    message.piquantJobsBucket !== undefined && (obj.piquantJobsBucket = message.piquantJobsBucket);
    message.detectorConfig !== undefined && (obj.detectorConfig = message.detectorConfig);
    if (message.elements) {
      obj.elements = message.elements.map((e) => e);
    } else {
      obj.elements = [];
    }
    message.parameters !== undefined && (obj.parameters = message.parameters);
    message.runTimeSec !== undefined && (obj.runTimeSec = Math.round(message.runTimeSec));
    message.coresPerNode !== undefined && (obj.coresPerNode = Math.round(message.coresPerNode));
    message.startUnixTimeSec !== undefined && (obj.startUnixTimeSec = Math.round(message.startUnixTimeSec));
    message.owner !== undefined && (obj.owner = message.owner ? Ownership.toJSON(message.owner) : undefined);
    message.roiID !== undefined && (obj.roiID = message.roiID);
    message.elementSetID !== undefined && (obj.elementSetID = message.elementSetID);
    message.PIQUANTVersion !== undefined && (obj.PIQUANTVersion = message.PIQUANTVersion);
    message.quantMode !== undefined && (obj.quantMode = message.quantMode);
    message.comments !== undefined && (obj.comments = message.comments);
    if (message.roiIDs) {
      obj.roiIDs = message.roiIDs.map((e) => e);
    } else {
      obj.roiIDs = [];
    }
    message.includeDwells !== undefined && (obj.includeDwells = message.includeDwells);
    message.command !== undefined && (obj.command = message.command);
    return obj;
  },

  create<I extends Exact<DeepPartial<JobStartingParameters>, I>>(base?: I): JobStartingParameters {
    return JobStartingParameters.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<JobStartingParameters>, I>>(object: I): JobStartingParameters {
    const message = createBaseJobStartingParameters();
    message.name = object.name ?? "";
    message.dataBucket = object.dataBucket ?? "";
    message.datasetPath = object.datasetPath ?? "";
    message.datasetID = object.datasetID ?? "";
    message.piquantJobsBucket = object.piquantJobsBucket ?? "";
    message.detectorConfig = object.detectorConfig ?? "";
    message.elements = object.elements?.map((e) => e) || [];
    message.parameters = object.parameters ?? "";
    message.runTimeSec = object.runTimeSec ?? 0;
    message.coresPerNode = object.coresPerNode ?? 0;
    message.startUnixTimeSec = object.startUnixTimeSec ?? 0;
    message.owner = (object.owner !== undefined && object.owner !== null)
      ? Ownership.fromPartial(object.owner)
      : undefined;
    message.roiID = object.roiID ?? "";
    message.elementSetID = object.elementSetID ?? "";
    message.PIQUANTVersion = object.PIQUANTVersion ?? "";
    message.quantMode = object.quantMode ?? "";
    message.comments = object.comments ?? "";
    message.roiIDs = object.roiIDs?.map((e) => e) || [];
    message.includeDwells = object.includeDwells ?? false;
    message.command = object.command ?? "";
    return message;
  },
};

function createBaseJobStartingParametersWithPMCCount(): JobStartingParametersWithPMCCount {
  return { params: undefined, PMCCount: 0 };
}

export const JobStartingParametersWithPMCCount = {
  encode(message: JobStartingParametersWithPMCCount, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.params !== undefined) {
      JobStartingParameters.encode(message.params, writer.uint32(10).fork()).ldelim();
    }
    if (message.PMCCount !== 0) {
      writer.uint32(16).uint32(message.PMCCount);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): JobStartingParametersWithPMCCount {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseJobStartingParametersWithPMCCount();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.params = JobStartingParameters.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.PMCCount = reader.uint32();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): JobStartingParametersWithPMCCount {
    return {
      params: isSet(object.params) ? JobStartingParameters.fromJSON(object.params) : undefined,
      PMCCount: isSet(object.PMCCount) ? Number(object.PMCCount) : 0,
    };
  },

  toJSON(message: JobStartingParametersWithPMCCount): unknown {
    const obj: any = {};
    message.params !== undefined &&
      (obj.params = message.params ? JobStartingParameters.toJSON(message.params) : undefined);
    message.PMCCount !== undefined && (obj.PMCCount = Math.round(message.PMCCount));
    return obj;
  },

  create<I extends Exact<DeepPartial<JobStartingParametersWithPMCCount>, I>>(
    base?: I,
  ): JobStartingParametersWithPMCCount {
    return JobStartingParametersWithPMCCount.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<JobStartingParametersWithPMCCount>, I>>(
    object: I,
  ): JobStartingParametersWithPMCCount {
    const message = createBaseJobStartingParametersWithPMCCount();
    message.params = (object.params !== undefined && object.params !== null)
      ? JobStartingParameters.fromPartial(object.params)
      : undefined;
    message.PMCCount = object.PMCCount ?? 0;
    return message;
  },
};

function createBaseJobStartingParametersWithPMCs(): JobStartingParametersWithPMCs {
  return { params: undefined, PMCs: [] };
}

export const JobStartingParametersWithPMCs = {
  encode(message: JobStartingParametersWithPMCs, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.params !== undefined) {
      JobStartingParameters.encode(message.params, writer.uint32(10).fork()).ldelim();
    }
    writer.uint32(18).fork();
    for (const v of message.PMCs) {
      writer.uint32(v);
    }
    writer.ldelim();
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): JobStartingParametersWithPMCs {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseJobStartingParametersWithPMCs();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.params = JobStartingParameters.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag === 16) {
            message.PMCs.push(reader.uint32());

            continue;
          }

          if (tag === 18) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.PMCs.push(reader.uint32());
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

  fromJSON(object: any): JobStartingParametersWithPMCs {
    return {
      params: isSet(object.params) ? JobStartingParameters.fromJSON(object.params) : undefined,
      PMCs: Array.isArray(object?.PMCs) ? object.PMCs.map((e: any) => Number(e)) : [],
    };
  },

  toJSON(message: JobStartingParametersWithPMCs): unknown {
    const obj: any = {};
    message.params !== undefined &&
      (obj.params = message.params ? JobStartingParameters.toJSON(message.params) : undefined);
    if (message.PMCs) {
      obj.PMCs = message.PMCs.map((e) => Math.round(e));
    } else {
      obj.PMCs = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<JobStartingParametersWithPMCs>, I>>(base?: I): JobStartingParametersWithPMCs {
    return JobStartingParametersWithPMCs.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<JobStartingParametersWithPMCs>, I>>(
    object: I,
  ): JobStartingParametersWithPMCs {
    const message = createBaseJobStartingParametersWithPMCs();
    message.params = (object.params !== undefined && object.params !== null)
      ? JobStartingParameters.fromPartial(object.params)
      : undefined;
    message.PMCs = object.PMCs?.map((e) => e) || [];
    return message;
  },
};

function createBaseJobStatus(): JobStatus {
  return { jobID: "", status: 0, message: "", endUnixTimeSec: 0, outputFilePath: "", piquantLogs: [] };
}

export const JobStatus = {
  encode(message: JobStatus, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.jobID !== "") {
      writer.uint32(10).string(message.jobID);
    }
    if (message.status !== 0) {
      writer.uint32(16).int32(message.status);
    }
    if (message.message !== "") {
      writer.uint32(26).string(message.message);
    }
    if (message.endUnixTimeSec !== 0) {
      writer.uint32(32).uint64(message.endUnixTimeSec);
    }
    if (message.outputFilePath !== "") {
      writer.uint32(42).string(message.outputFilePath);
    }
    for (const v of message.piquantLogs) {
      writer.uint32(50).string(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): JobStatus {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseJobStatus();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.jobID = reader.string();
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.status = reader.int32() as any;
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.message = reader.string();
          continue;
        case 4:
          if (tag !== 32) {
            break;
          }

          message.endUnixTimeSec = longToNumber(reader.uint64() as Long);
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.outputFilePath = reader.string();
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.piquantLogs.push(reader.string());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): JobStatus {
    return {
      jobID: isSet(object.jobID) ? String(object.jobID) : "",
      status: isSet(object.status) ? jobStatus_StatusFromJSON(object.status) : 0,
      message: isSet(object.message) ? String(object.message) : "",
      endUnixTimeSec: isSet(object.endUnixTimeSec) ? Number(object.endUnixTimeSec) : 0,
      outputFilePath: isSet(object.outputFilePath) ? String(object.outputFilePath) : "",
      piquantLogs: Array.isArray(object?.piquantLogs) ? object.piquantLogs.map((e: any) => String(e)) : [],
    };
  },

  toJSON(message: JobStatus): unknown {
    const obj: any = {};
    message.jobID !== undefined && (obj.jobID = message.jobID);
    message.status !== undefined && (obj.status = jobStatus_StatusToJSON(message.status));
    message.message !== undefined && (obj.message = message.message);
    message.endUnixTimeSec !== undefined && (obj.endUnixTimeSec = Math.round(message.endUnixTimeSec));
    message.outputFilePath !== undefined && (obj.outputFilePath = message.outputFilePath);
    if (message.piquantLogs) {
      obj.piquantLogs = message.piquantLogs.map((e) => e);
    } else {
      obj.piquantLogs = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<JobStatus>, I>>(base?: I): JobStatus {
    return JobStatus.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<JobStatus>, I>>(object: I): JobStatus {
    const message = createBaseJobStatus();
    message.jobID = object.jobID ?? "";
    message.status = object.status ?? 0;
    message.message = object.message ?? "";
    message.endUnixTimeSec = object.endUnixTimeSec ?? 0;
    message.outputFilePath = object.outputFilePath ?? "";
    message.piquantLogs = object.piquantLogs?.map((e) => e) || [];
    return message;
  },
};

function createBaseJobCreateParams(): JobCreateParams {
  return {
    name: "",
    datasetPath: "",
    pmcs: [],
    elements: [],
    detectorconfig: "",
    parameters: "",
    runtimesec: 0,
    roiID: "",
    elementSetID: "",
    datasetId: "",
    owner: undefined,
    quantMode: "",
    roiIDs: [],
    includeDwells: false,
    command: "",
  };
}

export const JobCreateParams = {
  encode(message: JobCreateParams, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.name !== "") {
      writer.uint32(10).string(message.name);
    }
    if (message.datasetPath !== "") {
      writer.uint32(18).string(message.datasetPath);
    }
    for (const v of message.pmcs) {
      writer.uint32(26).string(v!);
    }
    for (const v of message.elements) {
      writer.uint32(34).string(v!);
    }
    if (message.detectorconfig !== "") {
      writer.uint32(42).string(message.detectorconfig);
    }
    if (message.parameters !== "") {
      writer.uint32(50).string(message.parameters);
    }
    if (message.runtimesec !== 0) {
      writer.uint32(56).uint32(message.runtimesec);
    }
    if (message.roiID !== "") {
      writer.uint32(66).string(message.roiID);
    }
    if (message.elementSetID !== "") {
      writer.uint32(74).string(message.elementSetID);
    }
    if (message.datasetId !== "") {
      writer.uint32(82).string(message.datasetId);
    }
    if (message.owner !== undefined) {
      Ownership.encode(message.owner, writer.uint32(90).fork()).ldelim();
    }
    if (message.quantMode !== "") {
      writer.uint32(98).string(message.quantMode);
    }
    for (const v of message.roiIDs) {
      writer.uint32(106).string(v!);
    }
    if (message.includeDwells === true) {
      writer.uint32(112).bool(message.includeDwells);
    }
    if (message.command !== "") {
      writer.uint32(122).string(message.command);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): JobCreateParams {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseJobCreateParams();
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

          message.datasetPath = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.pmcs.push(reader.string());
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.elements.push(reader.string());
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.detectorconfig = reader.string();
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.parameters = reader.string();
          continue;
        case 7:
          if (tag !== 56) {
            break;
          }

          message.runtimesec = reader.uint32();
          continue;
        case 8:
          if (tag !== 66) {
            break;
          }

          message.roiID = reader.string();
          continue;
        case 9:
          if (tag !== 74) {
            break;
          }

          message.elementSetID = reader.string();
          continue;
        case 10:
          if (tag !== 82) {
            break;
          }

          message.datasetId = reader.string();
          continue;
        case 11:
          if (tag !== 90) {
            break;
          }

          message.owner = Ownership.decode(reader, reader.uint32());
          continue;
        case 12:
          if (tag !== 98) {
            break;
          }

          message.quantMode = reader.string();
          continue;
        case 13:
          if (tag !== 106) {
            break;
          }

          message.roiIDs.push(reader.string());
          continue;
        case 14:
          if (tag !== 112) {
            break;
          }

          message.includeDwells = reader.bool();
          continue;
        case 15:
          if (tag !== 122) {
            break;
          }

          message.command = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): JobCreateParams {
    return {
      name: isSet(object.name) ? String(object.name) : "",
      datasetPath: isSet(object.datasetPath) ? String(object.datasetPath) : "",
      pmcs: Array.isArray(object?.pmcs) ? object.pmcs.map((e: any) => String(e)) : [],
      elements: Array.isArray(object?.elements) ? object.elements.map((e: any) => String(e)) : [],
      detectorconfig: isSet(object.detectorconfig) ? String(object.detectorconfig) : "",
      parameters: isSet(object.parameters) ? String(object.parameters) : "",
      runtimesec: isSet(object.runtimesec) ? Number(object.runtimesec) : 0,
      roiID: isSet(object.roiID) ? String(object.roiID) : "",
      elementSetID: isSet(object.elementSetID) ? String(object.elementSetID) : "",
      datasetId: isSet(object.datasetId) ? String(object.datasetId) : "",
      owner: isSet(object.owner) ? Ownership.fromJSON(object.owner) : undefined,
      quantMode: isSet(object.quantMode) ? String(object.quantMode) : "",
      roiIDs: Array.isArray(object?.roiIDs) ? object.roiIDs.map((e: any) => String(e)) : [],
      includeDwells: isSet(object.includeDwells) ? Boolean(object.includeDwells) : false,
      command: isSet(object.command) ? String(object.command) : "",
    };
  },

  toJSON(message: JobCreateParams): unknown {
    const obj: any = {};
    message.name !== undefined && (obj.name = message.name);
    message.datasetPath !== undefined && (obj.datasetPath = message.datasetPath);
    if (message.pmcs) {
      obj.pmcs = message.pmcs.map((e) => e);
    } else {
      obj.pmcs = [];
    }
    if (message.elements) {
      obj.elements = message.elements.map((e) => e);
    } else {
      obj.elements = [];
    }
    message.detectorconfig !== undefined && (obj.detectorconfig = message.detectorconfig);
    message.parameters !== undefined && (obj.parameters = message.parameters);
    message.runtimesec !== undefined && (obj.runtimesec = Math.round(message.runtimesec));
    message.roiID !== undefined && (obj.roiID = message.roiID);
    message.elementSetID !== undefined && (obj.elementSetID = message.elementSetID);
    message.datasetId !== undefined && (obj.datasetId = message.datasetId);
    message.owner !== undefined && (obj.owner = message.owner ? Ownership.toJSON(message.owner) : undefined);
    message.quantMode !== undefined && (obj.quantMode = message.quantMode);
    if (message.roiIDs) {
      obj.roiIDs = message.roiIDs.map((e) => e);
    } else {
      obj.roiIDs = [];
    }
    message.includeDwells !== undefined && (obj.includeDwells = message.includeDwells);
    message.command !== undefined && (obj.command = message.command);
    return obj;
  },

  create<I extends Exact<DeepPartial<JobCreateParams>, I>>(base?: I): JobCreateParams {
    return JobCreateParams.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<JobCreateParams>, I>>(object: I): JobCreateParams {
    const message = createBaseJobCreateParams();
    message.name = object.name ?? "";
    message.datasetPath = object.datasetPath ?? "";
    message.pmcs = object.pmcs?.map((e) => e) || [];
    message.elements = object.elements?.map((e) => e) || [];
    message.detectorconfig = object.detectorconfig ?? "";
    message.parameters = object.parameters ?? "";
    message.runtimesec = object.runtimesec ?? 0;
    message.roiID = object.roiID ?? "";
    message.elementSetID = object.elementSetID ?? "";
    message.datasetId = object.datasetId ?? "";
    message.owner = (object.owner !== undefined && object.owner !== null)
      ? Ownership.fromPartial(object.owner)
      : undefined;
    message.quantMode = object.quantMode ?? "";
    message.roiIDs = object.roiIDs?.map((e) => e) || [];
    message.includeDwells = object.includeDwells ?? false;
    message.command = object.command ?? "";
    return message;
  },
};

function createBaseJobSummaryItem(): JobSummaryItem {
  return { shared: false, params: undefined, elements: [], status: undefined };
}

export const JobSummaryItem = {
  encode(message: JobSummaryItem, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.shared === true) {
      writer.uint32(8).bool(message.shared);
    }
    if (message.params !== undefined) {
      JobStartingParametersWithPMCCount.encode(message.params, writer.uint32(18).fork()).ldelim();
    }
    for (const v of message.elements) {
      writer.uint32(26).string(v!);
    }
    if (message.status !== undefined) {
      JobStatus.encode(message.status, writer.uint32(34).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): JobSummaryItem {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseJobSummaryItem();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.shared = reader.bool();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.params = JobStartingParametersWithPMCCount.decode(reader, reader.uint32());
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.elements.push(reader.string());
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.status = JobStatus.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): JobSummaryItem {
    return {
      shared: isSet(object.shared) ? Boolean(object.shared) : false,
      params: isSet(object.params) ? JobStartingParametersWithPMCCount.fromJSON(object.params) : undefined,
      elements: Array.isArray(object?.elements) ? object.elements.map((e: any) => String(e)) : [],
      status: isSet(object.status) ? JobStatus.fromJSON(object.status) : undefined,
    };
  },

  toJSON(message: JobSummaryItem): unknown {
    const obj: any = {};
    message.shared !== undefined && (obj.shared = message.shared);
    message.params !== undefined &&
      (obj.params = message.params ? JobStartingParametersWithPMCCount.toJSON(message.params) : undefined);
    if (message.elements) {
      obj.elements = message.elements.map((e) => e);
    } else {
      obj.elements = [];
    }
    message.status !== undefined && (obj.status = message.status ? JobStatus.toJSON(message.status) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<JobSummaryItem>, I>>(base?: I): JobSummaryItem {
    return JobSummaryItem.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<JobSummaryItem>, I>>(object: I): JobSummaryItem {
    const message = createBaseJobSummaryItem();
    message.shared = object.shared ?? false;
    message.params = (object.params !== undefined && object.params !== null)
      ? JobStartingParametersWithPMCCount.fromPartial(object.params)
      : undefined;
    message.elements = object.elements?.map((e) => e) || [];
    message.status = (object.status !== undefined && object.status !== null)
      ? JobStatus.fromPartial(object.status)
      : undefined;
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

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
