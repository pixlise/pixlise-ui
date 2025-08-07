import { Subject, ReplaySubject } from "rxjs";
import { CanvasDrawNotifier } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { MapColourScaleSourceData } from "../context-image/ui-elements/map-colour-scale/map-colour-scale-model";
import { ContextImageModelLoadedData, ContextImageScanModel } from "../context-image/context-image-model-internals";

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
  lighting: boolean = true;

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
  private _raw: ContextImageModelLoadedData | null = null;
  
  getScanModelFor(scanId: string): ContextImageScanModel | null {
    if (this._raw) {
      const mdl = this._raw.scanModels.get(scanId);
      if (mdl) {
        return mdl;
      }
    }

    return null;
  }

  setData(loadedData: ContextImageModelLoadedData) {
    // It's processed externally so we just take it and save it
    this._raw = loadedData;
  }
}
