import {
  JobType,
  jobTypeToJSON,
  jobTypeFromJSON,
  ScheduledJob_ScheduleType,
  scheduledJob_ScheduleTypeToJSON,
  JobConfig, 
  JobFilePath,
  NodeIndexMethod} from "src/app/generated-protos/job";

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

// Converted over from the Go equivalent on back-end in api/job/config/config.go
export function flattenJobConfig(c: JobConfig, nodeIndex: number): JobConfig {
  let newCfg = JobConfig.create({
    jobId: `${c.jobId}-${nodeIndex}`,
		requiredFiles: [],
		command:       c.command,
		args:          [],
		outputFiles:   []
  });

	for (let i = 0; i < c.args.length; i++) {
    const arg = c.args[i];

		// If we have any arguments marked as needing the node index applied, apply it here
    if (c.argIndexToApplyNodeIndexes.indexOf(i) > -1) {
      newCfg.args.push(applyIndexToFileName(arg, nodeIndex, true));
    } else {
      newCfg.args.push(arg);
    }
	}

	for (let f of c.requiredFiles) {
    newCfg.requiredFiles.push(
      JobFilePath.create({
        applyNodeIndex: f.applyNodeIndex,
        remoteBucket: f.remoteBucket,
        remotePath: applyIndexToFileName(f.remotePath, nodeIndex, f.applyNodeIndex == NodeIndexMethod.BOTH || f.applyNodeIndex == NodeIndexMethod.REMOTE),
        localPath: applyIndexToFileName(f.localPath, nodeIndex, f.applyNodeIndex == NodeIndexMethod.BOTH || f.applyNodeIndex == NodeIndexMethod.LOCAL),
      })
    );
  }

	for (let f of c.outputFiles) {
		newCfg.outputFiles.push(
      JobFilePath.create({
        applyNodeIndex: f.applyNodeIndex,
        remoteBucket: f.remoteBucket,
        remotePath: applyIndexToFileName(f.remotePath, nodeIndex, f.applyNodeIndex == NodeIndexMethod.BOTH || f.applyNodeIndex == NodeIndexMethod.REMOTE),
        localPath: applyIndexToFileName(f.localPath, nodeIndex, f.applyNodeIndex == NodeIndexMethod.BOTH || f.applyNodeIndex == NodeIndexMethod.LOCAL),
      })
    );
  }

  return newCfg;
}

export function applyIndexToFileName(name: string, index: number, applyIndex: boolean): string {
  if (!applyIndex) {
    return name;
  }

  if (name.length <= 0) {
    return "";
  }

  // Ideally we could use:
	//ext := filepath.Ext(name)
	// But this is not the same behaviour as in PIQUANT when it outputs
	// a file name, and instead of modifying PIQUANT we can just change
	// how we generate file names here
	let ext = "";
	const pos = name.indexOf(".");
	if (pos >= 0) {
		ext = name.substring(pos)
	}

  const start = name.substring(0, name.length-ext.length);

  return start + (index+1).toString().padStart(5, '0') + ext;
}
