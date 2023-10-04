import { ROIItem } from "src/app/generated-protos/roi";
import { Colours, RGBA } from "src/app/utils/colours";
import { DEFAULT_ROI_SHAPE, ROIShape } from "../components/roi-shape/roi-shape.component";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";

export type ROIDisplaySettings = {
  colour: RGBA;
  shape: ROIShape;
};

export const createDefaultROIDisplaySettings = (): ROIDisplaySettings => ({
  colour: Colours.WHITE,
  shape: DEFAULT_ROI_SHAPE,
});

export class RegionSettings {
  constructor(
    public region: ROIItem,
    public displaySettings: ROIDisplaySettings = createDefaultROIDisplaySettings()
  ) {}
}

export const createDefaultAllPointsItem = (scanId: string): ROIItem => {
  return ROIItem.create({
    id: PredefinedROIID.AllPoints,
    scanId: scanId,
    name: "All Points",
    description: "All Points",
    scanEntryIndexesEncoded: [],
    imageName: "",
    pixelIndexesEncoded: [],
    tags: [],
    modifiedUnixSec: 0,
  });
};

export const createDefaultAllPointsRegionSettings = (scanId: string, scanShape: ROIShape): RegionSettings => {
  return new RegionSettings(createDefaultAllPointsItem(scanId), { colour: Colours.GRAY_10, shape: scanShape });
};

export const createDefaultSelectedPointsItem = (scanId: string): ROIItem => {
  return ROIItem.create({
    id: PredefinedROIID.SelectedPoints,
    scanId: scanId,
    name: "Selected Points",
    description: "Selected Points",
    scanEntryIndexesEncoded: [],
    imageName: "",
    pixelIndexesEncoded: [],
    tags: [],
    modifiedUnixSec: 0,
  });
};

export const createDefaultSelectedPointsRegionSettings = (scanId: string, scanShape: ROIShape): RegionSettings => {
  return new RegionSettings(createDefaultSelectedPointsItem(scanId), { colour: Colours.CONTEXT_BLUE, shape: scanShape });
};

export const createDefaultRemainingPointsItem = (scanId: string): ROIItem => {
  return ROIItem.create({
    id: PredefinedROIID.RemainingPoints,
    scanId: scanId,
    name: "Remaining Points",
    description: "Remaining Points",
    scanEntryIndexesEncoded: [],
    imageName: "",
    pixelIndexesEncoded: [],
    tags: [],
    modifiedUnixSec: 0,
  });
};

export const createDefaultRemainingPointsRegionSettings = (scanId: string, scanShape: ROIShape): RegionSettings => {
  return new RegionSettings(createDefaultRemainingPointsItem(scanId), { colour: Colours.CONTEXT_GREEN, shape: scanShape });
};
