import { ROIItem } from "src/app/generated-protos/roi";
import { Colours, RGBA } from "src/app/utils/colours";
import { ROIShape } from "../components/roi-shape/roi-shape.component";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";

export class RegionSettings {
  constructor(
    public region: ROIItem,
    public colour: RGBA = Colours.WHITE,
    public shape: ROIShape = "circle"
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
  return new RegionSettings(createDefaultAllPointsItem(scanId), Colours.GRAY_10, scanShape);
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
  return new RegionSettings(createDefaultSelectedPointsItem(scanId), Colours.CONTEXT_BLUE, scanShape);
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
  return new RegionSettings(createDefaultRemainingPointsItem(scanId), Colours.CONTEXT_GREEN, scanShape);
};
