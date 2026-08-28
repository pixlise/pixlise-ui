import { JobType, jobTypeToJSON, jobTypeFromJSON, ScheduledJob_ScheduleType, scheduledJob_ScheduleTypeToJSON } from "src/app/generated-protos/job";

export function getPrintableJobType(jt: JobType|string): string {
  let str = "";
  if (typeof jt == "string") {
    str = jt;
  } else {
    str = jobTypeToJSON(jt);
  }

  if (str.startsWith("JT_")) {
    str = str.slice(3);
  }

  return str;
}

export function fromPrintableJobType(jt: string): JobType {
  return jobTypeFromJSON("JT_"+jt);
}

export function getPrintableJobScheduleType(scheduleType: ScheduledJob_ScheduleType): string {
  return scheduledJob_ScheduleTypeToJSON(scheduleType);
}