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
import { Coordinate4D, LightMode } from "src/app/generated-protos/widget-data";
import { Colours } from "src/app/utils/colours";
import { Coordinate3D } from "src/app/generated-protos/scan-beam-location";


export class Scan3DViewModel implements CanvasDrawNotifier {
  needsDraw$: Subject<void> = new Subject<void>();

  needsCanvasResize$?: Subject<void> | undefined;
  resolution$?: ReplaySubject<number> | undefined;
  borderWidth$?: ReplaySubject<number> | undefined;

  private _scanId: string = "";

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

  // Initial camera orientation - this can change, but here we store what came in the
  // model. If not set, it's ignored and a default used
  private _initialCameraPosition?: Coordinate3D;
  private _initialCameraRotation?: Coordinate4D;

  setInitialCameraOrientation(pos: Coordinate3D, rot: Coordinate4D) {
    this._initialCameraPosition = pos;
    this._initialCameraRotation = rot;
  }
  get initialCameraPosition(): Coordinate3D | undefined {
    return this._initialCameraPosition;
  }
  get initialCameraRotation(): Coordinate4D | undefined {
    return this._initialCameraRotation;
  }

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

  get showPoints(): boolean {
    return !this.hidePointsForScans.has(this._scanId);
  }

  set showPoints(show: boolean) {
    if (!show) {
      this.hidePointsForScans.add(this._scanId);
    } else {
      this.hidePointsForScans.delete(this._scanId);
    }
    this.drawModel.setShowPoints(show);
  }

  get showFootprint(): boolean {
    return !this.hideFootprintsForScans.has(this._scanId);
  }

  set showFootprint(show: boolean) {
    if (!show) {
      this.hideFootprintsForScans.add(this._scanId);
    } else {
      this.hideFootprintsForScans.delete(this._scanId);
    }
    this.drawModel.setShowFootprint(show);
  }
/*
  private _flatAroundFootprint = false;
  set flatAroundFootprint(flat: boolean) {
    this._flatAroundFootprint = flat;
    this.drawModel.flatAroundFootprint(flat);
  }
*/
  private _heightExaggerationScale = 1;
  get heightExaggerationScale(): number {
    return this._heightExaggerationScale;
  }

  set heightExaggerationScale(s: number) {
    this._heightExaggerationScale = s;
    this.drawModel.setHeightExaggerationScale(s);
  }

  private _drawTexture = true;
  get drawTexture(): boolean {
    return this._drawTexture;
  }

  set drawTexture(draw: boolean) {
    this._drawTexture = draw;
    this.drawModel.setDrawTexture(draw);
  }

  private _lightIntensity = 1;
  get lightIntensity(): number {
    return this._lightIntensity;
  }

  set lightIntensity(i: number) {
    this._lightIntensity = i;
    this.drawModel.setLightIntensity(i);
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
    this._scanId = scanId;

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
