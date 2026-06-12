import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { ExpressionsService } from "../../expressions/services/expressions.service";
import { APICachedDataService } from "./apicacheddata.service";
import { APIEndpointsService } from "./apiendpoints.service";
import { SyncedTransform } from "./context-image-data.service";
import { SnackbarService } from "./snackbar.service";
import { WidgetDataService } from "./widget-data.service";
import { Point } from "src/app/models/Geometry";

@Injectable({
  providedIn: "root",
})
export class ContextImageV2DataService {
  private _syncedTransform$: BehaviorSubject<Record<string, SyncedTransform>> = new BehaviorSubject({});
  private _syncedCursorPos$: BehaviorSubject<Record<string, Point>> = new BehaviorSubject({});

  //constructor() {}

  get syncedTransform$(): BehaviorSubject<Record<string, SyncedTransform>> {
    return this._syncedTransform$;
  }

  syncTransformForId(id: string, transform: SyncedTransform) {
    const current = this._syncedTransform$.value;
    current[id] = transform;
    this._syncedTransform$.next(current);
  }

  unsyncTransformForId(id: string) {
    const current = this._syncedTransform$.value;
    delete current[id];
    this._syncedTransform$.next(current);
  }

  clearSyncedTransforms() {
    this._syncedTransform$.next({});
  }

  get syncedCursorPos$(): BehaviorSubject<Record<string, Point>> {
    return this._syncedCursorPos$;
  }

  syncCursorForId(id: string, pt: Point) {
    const current = this._syncedCursorPos$.value;
    current[id] = pt;
    this._syncedCursorPos$.next(current);
  }
}
