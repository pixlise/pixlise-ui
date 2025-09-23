import { Subject, ReplaySubject, Observable, map, of, tap } from "rxjs";
import { CanvasDrawNotifier } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { MapColourScaleSourceData } from "../context-image/ui-elements/map-colour-scale/map-colour-scale-model";
import { ContextImageModelLoadedData, ContextImageScanModel } from "../context-image/context-image-model-internals";
import { RGBUImage } from "src/app/models/RGBUImage";
import { ScanBeamLocationsResp } from "src/app/generated-protos/scan-beam-location-msgs";
import { ScanEntryResp } from "src/app/generated-protos/scan-entry-msgs";
import { coordinate3DToThreeVector3, coordinate4DToThreeQuaternion } from "src/app/models/Geometry3D";

import * as THREE from 'three';
import { Scan3DDrawModel } from "./scan-3d-draw-model";
import { Coordinate4D, LightMode, ROILayerVisibility } from "src/app/generated-protos/widget-data";
import { Colours } from "src/app/utils/colours";
import { Coordinate3D } from "src/app/generated-protos/scan-beam-location";
import { ContextImageMapLayer } from "../../models/map-layer";
import { ROIItem } from "src/app/generated-protos/roi";
import { Image3DModelPointsResp } from "src/app/generated-protos/image-3d-model-point-msgs";


class ContextImageRawRegion {
  constructor(
    public roi: ROIItem,
    public locIdxs: number[]
  ) {}
}

export class Scan3DViewModel implements CanvasDrawNotifier {
  needsDraw$: Subject<void> = new Subject<void>();

  needsCanvasResize$?: Subject<void> | undefined;
  resolution$?: ReplaySubject<number> | undefined;
  borderWidth$?: ReplaySubject<number> | undefined;

  private _scanId: string = "";

  // Settings/Layers
  imageName: string = "";
  beamLocationVersionsRequested = new Map<string, number>();

  expressionIds: string[] = [];
  layerOpacity: Map<string, number> = new Map<string, number>();
  roiIds: ROILayerVisibility[] = [];

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

  private _rois = new Map<string, ContextImageRawRegion>();

  // Initial camera orientation - this can change, but here we store what came in the
  // model. If not set, it's ignored and a default used
  private _initialCameraPosition?: Coordinate3D;
  private _initialCameraRotation?: Coordinate4D;
  private _initialCameraTarget?: Coordinate3D;
  private _initialCameraZoom?: number;

  private _initialPointLightPosition?: THREE.Vector3;

  setInitialCameraOrientation(pos: Coordinate3D, rot: Coordinate4D, target: Coordinate3D, zoom: number) {
    this._initialCameraPosition = pos;
    this._initialCameraRotation = rot;
    this._initialCameraTarget = target;
    this._initialCameraZoom = zoom;
  }
  get initialCameraPosition(): THREE.Vector3 | undefined {
    if (!this._initialCameraPosition) {
      return undefined;
    }
    return coordinate3DToThreeVector3(this._initialCameraPosition);
  }
  get initialCameraRotation(): THREE.Quaternion | undefined {
    if (!this._initialCameraRotation) {
      return undefined;
    }
    return coordinate4DToThreeQuaternion(this._initialCameraRotation);
  }
  get initialCameraTarget(): THREE.Vector3 | undefined {
    if (!this._initialCameraTarget) {
      return undefined;
    }
    return coordinate3DToThreeVector3(this._initialCameraTarget);
  }
  get initialCameraZoom(): number | undefined {
    return this._initialCameraZoom;
  }
  hasInitialCameraOrientation(): boolean {
    return this._initialCameraPosition !== undefined &&
      this._initialCameraRotation !== undefined &&
      this._initialCameraTarget !== undefined &&
      this._initialCameraZoom !== undefined;
  }

  set initialPointLightPosition(pos: THREE.Vector3) {
    this._initialPointLightPosition = pos;
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

  private _layerDrawMode = "";
  get layerDrawMode(): string {
    return this._layerDrawMode;
  }

  set layerDrawMode(mode: string) {
    this._layerDrawMode = mode;
    this.drawModel.setLayerDrawMode(mode);
  }

  get currentLayerOpacity(): number {
    return this.layerOpacity?.get(this._scanId) || 1;
  }

  set currentLayerOpacity(opacity: number) {
    this.layerOpacity.set(this._scanId, opacity);
    this.drawModel.setLayerOpacity(opacity);
  }

  private _drawWireframe = false;
  get drawWireframe(): boolean {
    return this._drawWireframe;
  }

  set drawWireframe(draw: boolean) {
    this._drawWireframe = draw;
    this.drawModel.setWireframe(draw);
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
  private _imageModel?: Image3DModelPointsResp;

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

  setData(
    scanId: string,
    loadedData: ContextImageModelLoadedData,
    scanEntries: ScanEntryResp,
    beams: ScanBeamLocationsResp,
    imageModel: Image3DModelPointsResp | undefined,
    usePMCModel: boolean
  ): Observable<void> {
    this._scanId = scanId;

    // It's processed externally so we just take it and save it
    this._raw = loadedData;
    this._scanEntries = scanEntries;
    this._beams = beams;
    this._imageModel = imageModel;
    const scanMdl = loadedData.scanModels.get(scanId);

    const img = this._raw.image ? this._raw.image : undefined;
    return this.drawModel.create(
      this._scanEntries.entries,
      this._beams.beamLocations,
      this._imageModel?.points?.points || [],
      usePMCModel,
      scanMdl,
      img
    ).pipe(
      tap(() => {
        // Set light position if we had one saved
        if (this._initialPointLightPosition && this.drawModel.pointLight) {
          this.drawModel.pointLight.position.set(this._initialPointLightPosition.x, this._initialPointLightPosition.y, this._initialPointLightPosition.z);
        }
        this.needsDraw$.next();
      })
    );
  }

  setInitialState() {
    // Add optional items depending on visibility flags
    this.drawModel.setLightMode(this.lightMode);
    this.drawModel.setShowPoints(!this.hidePointsForScans.has(this._scanId));
    this.drawModel.setPlaneYScale(this._planeYScale);
  }

  setMapLayer(layer: ContextImageMapLayer) {
    // Add it to the loaded raw data. This is done separately from setData() because they can be loaded/made visible
    // dynamically and we don't want to regenerate everything in this case, so here we update what models we have
    // NOTE: we make sure that this is a layer we should be showing by checking the list of expressions...
    if (this.expressionIds.indexOf(layer.expressionId) < 0) {
      throw new Error(`Adding map layer ${layer.expressionId} to context image where this expression is not a part of the context image already`);
    }

    if (!this._raw) {
      throw new Error(`Adding map layer ${layer.expressionId} to context image before it has model data available`);
    }

    const scanMdl = this._raw.scanModels.get(layer.scanId);
    if (!scanMdl) {
      throw new Error(`Adding map layer ${layer.expressionId} to context image before where scan id ${layer.scanId} doesn't exist`);
    }

    // Set opacity on it if we have it
    const opacity = this.layerOpacity.get(layer.expressionId);
    if (opacity !== undefined) {
      layer.opacity = opacity;
    }

    // And set the colour for each PMC too
    layer.mapPoints.forEach(pt => {
      pt.drawParams.colour.a = 255 * layer.opacity;
    });

    // If already added, remove it
    let found = false;
    for (let c = 0; c < scanMdl.maps.length; c++) {
      if (scanMdl.maps[c].expressionId === layer.expressionId) {
        scanMdl.maps[c] = layer;
        found = true;
      }
    }

    if (!found) {
      scanMdl.maps.push(layer);
    }

    this.drawModel.updateMaps(scanMdl.maps);
    this.needsDraw$.next();
/*
    // If we're the "top" expression (first one in the list), we have to update the colour scale
    if (this.expressionIds[0] === layer.expressionId) {
      this._colourScales = [];
      for (let c = 0; c < layer.valueRanges.length; c++) {
        this.rebuildColourScale(this.expressionIds[0], c, layer.valueRanges.length);
      }
    }

    this._recalcNeeded = true;
    console.log(` *** ContextImageModel ${this._id} setMapLayer - scales: ${this.colourScales.length}`);
*/
  }

  setRegion(roiId: string, roi: ROIItem, pmcToIndexLookup: Map<number, number>) {
    const locIdxs: number[] = [];
    for (const pmc of roi.scanEntryIndexesEncoded) {
      const locIdx = pmcToIndexLookup.get(pmc);
      if (locIdx !== undefined) {
        locIdxs.push(locIdx);
      }
    }

    this._rois.set(roiId, new ContextImageRawRegion(roi, locIdxs));
  }

  alignFootprint(alignment: string) {
    if (["x+", "x-", "y+", "y-", "default"].indexOf(alignment) != -1) {
      this.drawModel.alignFootprint(alignment);
      this.needsDraw$.next();
    } else {
      console.error("Unknown alignment option: " + alignment);
    }
  }
}
