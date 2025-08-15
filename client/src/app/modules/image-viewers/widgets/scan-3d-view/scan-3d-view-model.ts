import { Subject, ReplaySubject, Observable } from "rxjs";
import { CanvasDrawNotifier } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { MapColourScaleSourceData } from "../context-image/ui-elements/map-colour-scale/map-colour-scale-model";
import { ContextImageModelLoadedData, ContextImageScanModel } from "../context-image/context-image-model-internals";
import { RGBUImage } from "src/app/models/RGBUImage";
import { ScanBeamLocationsResp } from "src/app/generated-protos/scan-beam-location-msgs";
import { ScanEntryResp } from "src/app/generated-protos/scan-entry-msgs";
import { ScanEntry } from "src/app/generated-protos/scan-entry";
import { AxisAlignedBBox } from "src/app/models/Geometry3D";

import * as THREE from 'three';
import { Scan3DDrawModel } from "./scan-3d-draw-model";
import { LightMode } from "src/app/generated-protos/widget-data";


export class Scan3DViewModel implements CanvasDrawNotifier {
  needsDraw$: Subject<void> = new Subject<void>();

  needsCanvasResize$?: Subject<void> | undefined;
  resolution$?: ReplaySubject<number> | undefined;
  borderWidth$?: ReplaySubject<number> | undefined;

  // Settings/Layers
  imageName: string = "";
  beamLocationVersionsRequested = new Map<string, number>();

  drawImage: boolean = true;
  imageSmoothing: boolean = true;
  imageBrightness: number = 1;
  selectionModeAdd: boolean = true; // Add or Subtract, nothing else!
  elementRelativeShading: boolean = false; // A toggle available in Element Maps tab version of context image only!

  removeTopSpecularArtifacts: boolean = true;
  removeBottomSpecularArtifacts: boolean = true;
  colourRatioMin: number | null = null;
  colourRatioMax: number | null = null;
  rgbuChannels: string = "";
  unselectedOpacity: number = 0.3;
  unselectedGrayscale: boolean = false;

  hidePointsForScans = new Set<string>();
  hideFootprintsForScans = new Set<string>();

  protected _lightMode: LightMode = LightMode.LM_UNKNOWN;
  get lightMode(): LightMode {
    return this._lightMode;
  }
  set lightMode(mode: LightMode) {
    this._lightMode = mode;

    // Here we can update the draw model if needed
    this.drawModel.setLightMode(mode);
  }

  toggleShowPoints(scanId: string) {
    let show = false;
    if (this.hidePointsForScans.has(scanId)) {
      // We're un-hiding
      this.hidePointsForScans.delete(scanId);
      show = true;
    } else {
      // We're hiding
      this.hidePointsForScans.add(scanId);
    }

    this.drawModel.setShowPoints(show);
  }

  private _planeHeight?: number;
  set planeHeight(height: number | undefined) {
    this._planeHeight = height;
    this.drawModel.setPlaneHeight(height);
  }

  get planeHeight(): number | undefined {
    return this._planeHeight;
  }

  get rgbuImageScaleData(): MapColourScaleSourceData | null {
    return null;
  }

  get scanIds(): string[] {
    if (!this._raw) {
      return [];
    }
    return Array.from(this._raw.scanModels.keys());
  }

  // Loaded data, based on the above, we load these. Draw models are generated from these
  // on the fly
  private _raw?: ContextImageModelLoadedData;
  private _scanEntries?: ScanEntryResp;
  private _beams?: ScanBeamLocationsResp;

  drawModel = new Scan3DDrawModel();
  
  getScanModelFor(scanId: string): ContextImageScanModel | null {
    if (this._raw) {
      const mdl = this._raw.scanModels.get(scanId);
      if (mdl) {
        return mdl;
      }
    }

    return null;
  }

  get rgbuSourceImage(): RGBUImage | null {
    if (this._raw) {
      return this._raw.rgbuSourceImage;
    }
    return null;
  }

  setData(scanId: string, loadedData: ContextImageModelLoadedData, scanEntries: ScanEntryResp, beams: ScanBeamLocationsResp): Observable<void> {
    // It's processed externally so we just take it and save it
    this._raw = loadedData;
    this._scanEntries = scanEntries;
    this._beams = beams;

    let bbox = new AxisAlignedBBox();
    let pmcLocs = this.getBeamXYZs(beams, scanEntries.entries, bbox);
    const scanMdl = loadedData.scanModels.get(scanId);

    return this.drawModel.create(scanId, pmcLocs, bbox, scanMdl?.scanPoints || [], this._lightMode, !this.hidePointsForScans.has(scanId), loadedData.image || undefined);
  }

  protected getBeamXYZs(beams: ScanBeamLocationsResp, scanEntries: ScanEntry[], bbox: AxisAlignedBBox): Map<number, THREE.Vector3> {
    let result = new Map<number, THREE.Vector3>();

    const scale = 1000;
    for (let c = 0; c < scanEntries.length; c++) {
      const scanEntry = scanEntries[c];
      if(scanEntry.location && scanEntry.normalSpectra) {
        const loc = beams.beamLocations[c];
        const pt = new THREE.Vector3(loc.x * scale, loc.z * scale, loc.y * scale);
        result.set(scanEntry.id, pt);
        bbox.expandToFit(pt);
      }
    }

    return result;
  }
}
