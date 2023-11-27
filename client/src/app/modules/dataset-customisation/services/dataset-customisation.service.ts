import { Injectable } from "@angular/core";
import { ContextImageDataService } from "../../image-viewers/image-viewers.module";
import { WidgetDataService } from "../../pixlisecore/pixlisecore.module";
import { APICachedDataService } from "../../pixlisecore/services/apicacheddata.service";
import { APIEndpointsService } from "../../pixlisecore/services/apiendpoints.service";

@Injectable({
  providedIn: "root",
})
export class DatasetCustomisationService extends ContextImageDataService {
  constructor(cachedDataService: APICachedDataService, widgetDataService: WidgetDataService, endpointsService: APIEndpointsService) {
    super(cachedDataService, widgetDataService, endpointsService);
  }
}
