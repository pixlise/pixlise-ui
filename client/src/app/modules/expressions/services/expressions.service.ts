import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { APICachedDataService } from "../../pixlisecore/services/apicacheddata.service";
import { APIDataService } from "../../pixlisecore/pixlisecore.module";
import { ExpressionGetReq, ExpressionListReq } from "src/app/generated-protos/expression-msgs";
import { DataExpression } from "src/app/generated-protos/expressions";

@Injectable({
  providedIn: "root",
})
export class ExpressionsService {
  expressions$ = new BehaviorSubject<Record<string, DataExpression>>({});

  constructor(
    private _cacheService: APICachedDataService,
    private _dataService: APIDataService
  ) {
    this.fetchExpressions();
  }

  fetchExpressions() {
    this._dataService.sendExpressionListRequest(ExpressionListReq.create({})).subscribe(res => {
      this.expressions$.next(res.expressions);
    });
  }

  fetchExpression(id: string) {
    this._cacheService.getExpression(ExpressionGetReq.create({ id })).subscribe(res => {
      if (res.expression) {
        this.expressions$.next({ ...this.expressions$.value, [id]: res.expression });
      }
    });
  }
}
