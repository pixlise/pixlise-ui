import { Injectable } from '@angular/core';

import { APIDataService, SnackbarService } from '../../pixlisecore/pixlisecore.module';
import { ReplaySubject, Subscription } from 'rxjs';
import { ViewStateReq } from 'src/app/generated-protos/viewstate-msgs';


@Injectable({
    providedIn: 'root'
})
export class ViewStateService {

    showPeakIdentification = false;
    showAnnotations = false;

    constructor(
        private _dataService: APIDataService,
        private _snackbarService: SnackbarService,
    ) {
        this.fetchViewState();
    }

    fetchViewState() {
        let id = "test";
        this._dataService.sendViewStateRequest(ViewStateReq.create({ id })).subscribe({
            next: (response) => {
                console.log("VIEWSTATE RESP", response)
            },
            error: (err) => {
                this._snackbarService.openError(err);
                console.error(err);
            }
        });
    }
}