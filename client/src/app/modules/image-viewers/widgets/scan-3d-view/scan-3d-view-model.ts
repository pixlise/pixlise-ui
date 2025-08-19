import { Subject, ReplaySubject, Observable, map, of, tap } from "rxjs";
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
import { Colours } from "src/app/utils/colours";


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

  protected _planeYScale: number = 0.5;

  get planeYScale(): number {
    return this._planeYScale;
  }

  // Only valid values for display are between 0 and 1, others are treated as "not enabled"
  set planeYScale(s: number) {
    if (s <= 0 || s > 1) {
      this._planeYScale = -1;
    } else {
      this._planeYScale = s;
    }
    this.drawModel.setPlaneYScale(this._planeYScale);
  }

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

  private _selectionColour = new THREE.Color(Colours.CONTEXT_BLUE.r/255, Colours.CONTEXT_BLUE.g/255, Colours.CONTEXT_BLUE.b/255);
  // private _hoverColour = new THREE.Color(Colours.CONTEXT_PURPLE.r/255, Colours.CONTEXT_PURPLE.g/255, Colours.CONTEXT_PURPLE.b/255);
  // private _marsDirtColour = new THREE.Color(.37, .17, .08);
  private _pointSize: number = 0.02;

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
    const scanMdl = loadedData.scanModels.get(scanId);

    const img = this._raw.image ? this._raw.image : undefined;
    return this.drawModel.create(this._scanEntries.entries, this._beams.beamLocations, scanMdl, img).pipe(
      tap(() => {
        // Add optional items depending on visibility flags
        this.drawModel.setLightMode(this.lightMode);
        this.drawModel.setShowPoints(!this.hidePointsForScans.has(scanId));
        this.drawModel.setPlaneYScale(this._planeYScale);
      })
    );
  }
}
