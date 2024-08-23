import { Injectable } from "@angular/core";
import { ContextImageDataService, SnackbarService, WidgetDataService } from "../../pixlisecore/pixlisecore.module";
import { APICachedDataService } from "../../pixlisecore/services/apicacheddata.service";
import { APIEndpointsService } from "../../pixlisecore/services/apiendpoints.service";
import { ExpressionsService } from "src/app/modules/expressions/services/expressions.service";

@Injectable({
  providedIn: "root",
})
export class DatasetCustomisationService extends ContextImageDataService {
  constructor(
    expressionsService: ExpressionsService,
    cachedDataService: APICachedDataService,
    widgetDataService: WidgetDataService,
    endpointsService: APIEndpointsService,
    snackService: SnackbarService
  ) {
    super(expressionsService, cachedDataService, widgetDataService, endpointsService, snackService);
  }
}
