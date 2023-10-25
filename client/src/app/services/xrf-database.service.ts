import { Injectable } from "@angular/core";
import { XRFLineDatabase } from "../periodic-table/xrf-line-database";
import { Observable, concatMap, map, shareReplay } from "rxjs";
import { APICachedDataService } from "../modules/pixlisecore/services/apicacheddata.service";
import { ScanListReq, ScanListResp } from "../generated-protos/scan-msgs";
import { DetectorConfigReq, DetectorConfigResp } from "../generated-protos/detector-config-msgs";
import { periodicTableDB } from "../periodic-table/periodic-table-db";

@Injectable({
  providedIn: "root",
})
export class XRFDatabaseService {
  private _xrfDatabaseMap = new Map<string, Observable<XRFLineDatabase>>();
  tubeElementZ = 0;

  constructor(private _cachedDataService: APICachedDataService) {}

  getXRFLines(scanId: string): Observable<XRFLineDatabase> {
    let result = this._xrfDatabaseMap.get(scanId);
    if (result === undefined) {
      // Have to request it!
      result = this._cachedDataService
        .getScanList(
          ScanListReq.create({
            searchFilters: { RTT: scanId },
          })
        )
        .pipe(
          concatMap((scanResp: ScanListResp) => {
            if (scanResp.scans.length != 1) {
              throw new Error(`getXRFLines: Failed to get scan: ${scanId} to determine detector config to use`);
            }

            // Now get the detector config
            const detectorConfig = scanResp.scans[0].instrumentConfig;
            return this._cachedDataService.getDetectorConfig(DetectorConfigReq.create({ id: detectorConfig })).pipe(
              map((detResp: DetectorConfigResp) => {
                if (detResp.config === undefined) {
                  throw new Error(`getXRFLines: No detector config returned for: ${detectorConfig}`);
                }

                // For now, if we don't yet have a tube Z defined, use whatever we get first
                // TODO: THIS IS A HACK FOR GETTING DRAWING WORKING QUICKLY! If there are multiple detectors in
                // play the user should be asked which one they want the views to work off
                if (!this.tubeElementZ) {
                  this.tubeElementZ = detResp.config.tubeElement;
                }

                return new XRFLineDatabase(detResp.config, periodicTableDB);
              })
            );
          }),
          shareReplay(1)
        );

      // Add it to the map too so a subsequent request will get this
      this._xrfDatabaseMap.set(scanId, result);
    }

    return result;
  }
}
