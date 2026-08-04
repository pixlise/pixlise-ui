import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { JobStatus } from 'src/app/generated-protos/job';

@Component({
  selector: 'quant-job-view',
  standalone: false,
  templateUrl: './quant-job.component.html',
  styleUrls: ['./quant-job.component.scss', '../general-job/general-job.component.scss']
})
export class QuantJobComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();
  @Input() job!: JobStatus;

  constructor() {}

  ngOnInit() {
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }
}
