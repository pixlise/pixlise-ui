import { Component, Input } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { map } from 'rxjs';

import { JobGroupConfig, JobConfig, JobFilePath, JobStatus } from 'src/app/generated-protos/job';
import { JobOutputGetReq, JobOutputGetResp } from 'src/app/generated-protos/job-msgs';

import { APICachedDataService } from 'src/app/modules/pixlisecore/pixlisecore.module';
import { flattenJobConfig } from '../../../models/jobs.model';
import { TextFileViewingDialogData, TextFileViewingDialogComponent } from 'src/app/modules/pixlisecore/components/atoms/text-file-viewing-dialog/text-file-viewing-dialog.component';


@Component({
  selector: 'job-outputs',
  standalone: false,
  templateUrl: './job-outputs.component.html',
  styleUrl: './job-outputs.component.scss'
})
export class JobOutputsComponent {
  @Input() job!: JobStatus;
  @Input() config?: JobGroupConfig;

  nodeConfigs: JobConfig[] = [];

  constructor(
    private _cachedDataService: APICachedDataService,
    private _dialog: MatDialog
  ) {}

  ngOnInit() {
    this.showLogFiles();
  }

  ngOnChanges(changes: any) {
    this.showLogFiles();
  }

  onViewFile(nodeIndex: number, file: JobFilePath) {
    // View the file...
    const content$ = this._cachedDataService.getJobOutputFile(
      JobOutputGetReq.create({ jobId: this.job.jobId, nodeIndex: nodeIndex, filePath: file.remotePath })
    ).pipe(
      map((resp: JobOutputGetResp) => {
        return new TextDecoder().decode(resp.content);
      })
    );

    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = new TextFileViewingDialogData(
      `Node: ${nodeIndex}, File: ${this.printableFileName(file.remotePath)}`,
      content$,
      file.remotePath.toLocaleLowerCase().endsWith("csv"),
      0
    );

    const dialogRef = this._dialog.open(TextFileViewingDialogComponent, dialogConfig);

    dialogRef.afterClosed().subscribe({
      next: () => {},
      error: err => {
        console.error(err);
      }
    });
  }

  printableFileName(name: string): string {
    const pos = name.indexOf(this.job.jobId);
    if (pos > -1) {
      return name.substring(pos+this.job.jobId.length+1);
    }
    return name;
  }

  private showLogFiles() {
    this.nodeConfigs = [];

    // If the job config has uploaded files that we could display, put them in the list
    if(this.config?.nodeConfig) {
      for (let c = 0; c < this.config.nodeCount; c++) {
        const nodeCfg = flattenJobConfig(this.config.nodeConfig, c);
        this.nodeConfigs.push(nodeCfg);
      }
    }
  }
}
