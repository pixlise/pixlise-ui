import { ROIItem } from "src/app/generated-protos/roi";
import { Colours, RGBA } from "src/app/utils/colours";
import { DEFAULT_ROI_SHAPE, ROIShape } from "../components/roi-shape/roi-shape.component";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { ColourOption } from "./roi-colors";

export type ROIDisplaySettings = {
  colour: RGBA;
  shape: ROIShape;
};

export type ROIDisplaySettingOption = {
  colour: ColourOption;
  shape: ROIShape;
};

export const createDefaultROIDisplaySettings = (): ROIDisplaySettings => ({
  colour: Colours.WHITE,
  shape: DEFAULT_ROI_SHAPE,
});

export class RegionSettings {
  constructor(
    public region: ROIItem,
    public displaySettings: ROIDisplaySettings = createDefaultROIDisplaySettings(),
    public pixelIndexSet: Set<number> = new Set<number>() // A fast lookup for what's within the pixel index set. Mainly used by RGBU plot calculation
  ) {}
}

const allPointsPrefix = "All Points";

export const createDefaultAllPointsItem = (scanId: string, scanName: string = ""): ROIItem => {
  return ROIItem.create({
    id: PredefinedROIID.getAllPointsForScan(scanId),
    scanId: scanId,
    name: allPointsPrefix + (scanName ? ` (${scanName})` : ""),
    description: allPointsPrefix,
    scanEntryIndexesEncoded: [],
    imageName: "",
    pixelIndexesEncoded: [],
    tags: [],
    modifiedUnixSec: 0,
    owner: {
      creatorUser: { id: "builtin", name: "Pixlise", iconURL: "assets/PIXLISE.svg" },
    },
  });
};

export const createDefaultAllPointsRegionSettings = (scanId: string, scanShape: ROIShape, scanName: string = ""): RegionSettings => {
  return new RegionSettings(createDefaultAllPointsItem(scanId, scanName), { colour: Colours.GRAY_10, shape: scanShape });
};

export const createDefaultSelectedPointsItem = (scanId: string): ROIItem => {
  return ROIItem.create({
    id: PredefinedROIID.getSelectedPointsForScan(scanId),
    scanId: scanId,
    name: "Selected Points",
    description: "Selected Points",
    scanEntryIndexesEncoded: [],
    imageName: "",
    pixelIndexesEncoded: [],
    tags: [],
    modifiedUnixSec: 0,
    owner: {
      creatorUser: { id: "builtin", name: "Pixlise", iconURL: "assets/PIXLISE.svg" },
    },
  });
};

export const createDefaultSelectedPointsRegionSettings = (scanId: string, scanShape: ROIShape): RegionSettings => {
  return new RegionSettings(createDefaultSelectedPointsItem(scanId), { colour: Colours.CONTEXT_BLUE, shape: scanShape });
};
/*
export const createDefaultRemainingPointsItem = (scanId: string): ROIItem => {
  return ROIItem.create({
    id: PredefinedROIID.getRemainingPointsForScan(scanId),
    scanId: scanId,
    name: "Remaining Points",
    description: "Remaining Points",
    scanEntryIndexesEncoded: [],
    imageName: "",
    pixelIndexesEncoded: [],
    tags: [],
    modifiedUnixSec: 0,
    owner: {
      creatorUser: { id: "builtin", name: "Pixlise", iconURL: "assets/PIXLISE.svg" },
    },
  });
};

export const createDefaultRemainingPointsRegionSettings = (scanId: string, scanShape: ROIShape): RegionSettings => {
  return new RegionSettings(createDefaultRemainingPointsItem(scanId), { colour: Colours.CONTEXT_GREEN, shape: scanShape });
};
*/
