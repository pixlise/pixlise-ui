import { Component, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { JobGroupConfig, JobStatus } from 'src/app/generated-protos/job';

@Component({
  selector: 'expression-job-view',
  standalone: false,
  templateUrl: './expression-job.component.html',
  styleUrls: ['./expression-job.component.scss', '../general-job/general-job.component.scss']
})
export class ExpressionJobComponent {
  private _subs = new Subscription();
  @Input() job!: JobStatus;
  @Input() config!: JobGroupConfig;

  constructor() {}

  ngOnInit() {
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  get args(): string[] {
    return this.config.nodeConfig?.args || [];
  }

  getArgName(arg: string): string {
    const p = arg.indexOf("=");
    return arg.substring(0, p);
  }

  getArgValue(arg: string): string {
    const p = arg.indexOf("=");
    return arg.substring(p+1);
  }
}
