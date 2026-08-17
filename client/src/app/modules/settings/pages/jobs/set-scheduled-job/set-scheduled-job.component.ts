import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { ScheduledJob_ScheduleType, JobType, ScheduledJob, scheduledJob_ScheduleTypeToJSON, scheduledJob_ScheduleTypeFromJSON } from 'src/app/generated-protos/job';
import { ScanInstrument, scanInstrumentFromJSON, scanInstrumentToJSON } from 'src/app/generated-protos/scan';
import { ExpressionPickerData, ExpressionPickerComponent, ExpressionPickerResponse } from 'src/app/modules/expressions/components/expression-picker/expression-picker.component';
import { AnalysisLayoutService, APIDataService, SnackbarService } from 'src/app/modules/pixlisecore/pixlisecore.module';
import { fromPrintableJobType, getPrintableJobType } from '../jobs.component';
import { SetScheduledJobReq } from 'src/app/generated-protos/job-msgs';

export class SetScheduledJobData {
  constructor(public job?: ScheduledJob) {}
}

export class SetScheduledJobResult {
  constructor(public job?: ScheduledJob) {}
}

const jobParamAndHelp = new Map<JobType, Map<string, string>>([
  [JobType.JT_RUN_EXPRESSION,
    new Map<string, string>([
      ["scanId", `"imported" (if using AFTER_IMPORT - this means use the one that just imported) or the scan id`],
      ["quant", `If using an id: "id:quant-123", otherwise "name:AutoQuant PIXL (AB)"`],
      ["expressionId", "The id of the expression to run"]
    ])],
  [JobType.JT_RUN_QUANT,
    new Map<string, string>([
      ["scanId", `"imported" (if using AFTER_IMPORT - this means use the one that just imported) or the scan id`],
      ["elements", `If using an element set: "set:element-set-id-123" otherwise list of elements eg "list:Fe,Ca,Ti"`],
      ["quantName", "What to name the create quantification"],
      ["configName", "The PIQUANT configuration to use, eg PIXL/v7"],
      ["quantMode", "Quant mode string to set - supports: Combined or AB"]
    ])],
  [JobType.JT_RUN_PYTHON_SCRIPT,
    new Map<string, string>([
      ["scanId", `"imported" (if using AFTER_IMPORT - this means use the one that just imported) or the scan id`],
      ["repositoryId", `Which defined repository to use to download python source to run`],
      ["scriptName", `Name of script within repository to run`],
      ["quant", `If using an id: "id:quant-123", otherwise "name:AutoQuant PIXL (AB)"`]
    ])],
]);


@Component({
  selector: 'set-scheduled-job',
  standalone: false,
  templateUrl: './set-scheduled-job.component.html',
  styleUrl: './set-scheduled-job.component.scss'
})
export class SetScheduledJobComponent implements OnInit, OnDestroy {
  private _subs: Subscription = new Subscription();

  job: ScheduledJob;

  expressionDisplayName = "";
  title = "Edit scheduled job";

  instruments: string[] = [];
  jobTypes: string[] = [];
  scheduleTypes: string[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: SetScheduledJobData,
    public dialogRef: MatDialogRef<SetScheduledJobComponent>,
    private _analysisLayoutService: AnalysisLayoutService,
    private _dataService: APIDataService,
    private _snackbarService: SnackbarService,
    public dialog: MatDialog
  ) {
    // Set up our internal job var
    this.job = data && data.job ? ScheduledJob.create(data.job) : ScheduledJob.create({
      id: "",
      name: "",
      description: "",
      instrument: ScanInstrument.UNKNOWN_INSTRUMENT,
      scheduleType: ScheduledJob_ScheduleType.AFTER_IMPORT,
      //scheduledFirstTimeUnixSec: 0,
      intervalSec: 0,
      jobOrder: 0,
      jobType: JobType.JT_RUN_EXPRESSION,
      jobParameters: {
        scanId: "imported",
        quant: "name:AutoQuant-PIXL (AB)",
        expressionId: ""
      }
    });

    if (this.job.id.length <= 0) {
      this.title = "Add scheduled job";
    }

    for (let item of [ScanInstrument.PIXL_FM, ScanInstrument.PIXL_EM, ScanInstrument.JPL_BREADBOARD, ScanInstrument.SBU_BREADBOARD, ScanInstrument.GENERIC_XRF, ScanInstrument.GENERIC_SEM, ScanInstrument.GENERIC_WDS, ScanInstrument.UNKNOWN_INSTRUMENT]) {
      this.instruments.push(getPrintableScheduledJobInstrument(item));
    }

    for (let item of jobParamAndHelp.keys()) {
      this.jobTypes.push(getPrintableJobType(item));
    }

    for (let item of [ScheduledJob_ScheduleType.AFTER_IMPORT, ScheduledJob_ScheduleType.TIME_BASED]) {
      this.scheduleTypes.push(scheduledJob_ScheduleTypeToJSON(item));
    }
  }

  ngOnInit() {}

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  onSelectExpression() {
    const dialogConfig = new MatDialogConfig<ExpressionPickerData>();
    dialogConfig.hasBackdrop = true;
    dialogConfig.disableClose = true;

    dialogConfig.data = {
      // widgetType: "export",
      // widgetId: "exporter",
      //widgetType: "context-image",
      //widgetId: this.getCleanWidgetId(),
      //scanId: this.scanId,
      selectedIds: /*this.mdl.expressionIds ||*/ [],
      draggable: true,
      liveReload: false,
      singleSelectionOption: true,
      maxSelection: 1,
    };

    this._subs.add(
      this._analysisLayoutService.expressionPickerResponse$.subscribe(
        (result: ExpressionPickerResponse | null) => {
          // Set the name and id
          if (result && result.selectedExpressions.length > 0) {
            this.expressionDisplayName = result!.selectedExpressions[0].name;
            this.job.jobParameters["expressionId"] = result!.selectedExpressions[0].id;
          }
        }
      )
    );

    const expressionPickerDialog = this.dialog.open(
      ExpressionPickerComponent,
      dialogConfig
    );

    expressionPickerDialog.afterClosed().subscribe(() => {
      // this._analysisLayoutService.highlightedWidgetIds$.next([]);
      // this._expressionPickerDialog = null;
    });
  }

  onClose(cancel: boolean) {
    if (cancel) {
      this.dialogRef.close();
      return;
    }

    // Try to actually do the edit, if it fails we still have the dialog up to edit it
    // Don't send up parameters that are not relevant to this job
    const validKeys = getScheduledJobParamKeys(this.job.jobType)
    for (let param of Object.keys(this.job.jobParameters)) {
      if (validKeys.indexOf(param) < 0) {
        // It shouldn't be there
        delete this.job.jobParameters[param];
      }
    }

    // If user flicks between schedule types we might have bad fields set
    if (this.job.scheduleType == ScheduledJob_ScheduleType.AFTER_IMPORT) {
      this.job.intervalSec = 0;
    } else {
      this.job.jobOrder = 0;
    }

    // Create it
    this._dataService.sendSetScheduledJobRequest(SetScheduledJobReq.create({job: this.job})).subscribe({
      next: resp => {
        this._snackbarService.openSuccess((this.job.id ? "Edited" : "Added new") + " scheduled job");

        // Return a result
        const result = new SetScheduledJobResult(this.job);
        this.dialogRef.close(result);
      },
      error: err => {
        this._snackbarService.openError(err);
      }
    });
  }

  isJobValid(): boolean {
    return this.job.name.length > 0 && Object.keys(this.job.jobParameters).length > 0 && (
    (this.job.scheduleType == ScheduledJob_ScheduleType.TIME_BASED && /*this.job.scheduledFirstTimeUnixSec > 0 &&*/ this.job.intervalSec >= 900) ||
    (this.job.scheduleType == ScheduledJob_ScheduleType.AFTER_IMPORT /*&& this.job.jobOrder > 0*/) );
  }

  get instrument(): string {
    return getPrintableScheduledJobInstrument(this.job.instrument);
  }

  set instrument(v: string) {
    if (v == AllInstruments) {
      this.job.instrument = ScanInstrument.UNKNOWN_INSTRUMENT;
    } else {
      this.job.instrument = scanInstrumentFromJSON(v);
    }
  }

  get jobType(): string {
    return getPrintableJobType(this.job.jobType);
  }

  set jobType(v: string) {
    this.job.jobType = fromPrintableJobType(v);
  }

  get scheduleType(): string {
    return scheduledJob_ScheduleTypeToJSON(this.job.scheduleType);
  }

  set scheduleType(v: string) {
    this.job.scheduleType = scheduledJob_ScheduleTypeFromJSON(v);
  }

  get paramKeys(): string[] {
    return getScheduledJobParamKeys(this.job.jobType);
  }

  paramHelp(jobType: JobType, k: string): string {
    const help = jobParamAndHelp.get(jobType);
    if (!help) {
      return "";
    }

    const item = help.get(k);
    if (!item) {
      return "";
    }

    return item;
  }

  isAfterImport(): boolean {
    return this.job.scheduleType == ScheduledJob_ScheduleType.AFTER_IMPORT;
  }
}

const AllInstruments = "All Instruments";

export function getPrintableScheduledJobInstrument(i: ScanInstrument) {
  if (i == ScanInstrument.UNKNOWN_INSTRUMENT) {
    return AllInstruments;
  }

  return scanInstrumentToJSON(i);
}

export function getScheduledJobParamKeys(jobType: JobType): string[] {
  const help = jobParamAndHelp.get(jobType);
  if (!help) {
    return [];
  }

  return Array.from(help.keys());
}