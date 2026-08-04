import { Component, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { JobStatus } from 'src/app/generated-protos/job';

@Component({
  selector: 'expression-job-view',
  standalone: false,
  templateUrl: './expression-job.component.html',
  styleUrls: ['./expression-job.component.scss', '../general-job/general-job.component.scss']
})
export class ExpressionJobComponent {
  private _subs = new Subscription();
  @Input() job!: JobStatus;

  constructor() {}

  ngOnInit() {
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }
}
