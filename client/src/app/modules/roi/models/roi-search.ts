import { ROIItemSummary } from "src/app/generated-protos/roi";

export type ROISearchFilter = {
  filteredSummaries: ROIItemSummary[];

  scanId: string;
  searchString: string;
  tagIDs: string[];
  authors: string[];
  types?: ROIType[];
};

export const checkROITypeIsMIST = (types: ROIType[]): boolean => {
  return types.includes("mist-species") || types.includes("mist-group");
};

export const checkMistFullyIdentified = (roi: ROIItemSummary): boolean => {
  return (roi.mistROIItem?.idDepth || 0) >= 5;
};

export type ROIType = "user-created" | "shared" | "mist-species" | "mist-group" | "builtin";
export type ROITypeInfo = {
  name: string;
  description: string;
  type: ROIType;
};

export const ROI_TYPES: ROITypeInfo[] = [
  { name: "Built-in ROIs", description: "ROIs that are built-in to the system and not editable", type: "builtin" },
  { name: "User Created ROIs", description: "ROIs created by you", type: "user-created" },
  { name: "Shared ROIs", description: "ROIs shared with you", type: "shared" },
  { name: "MIST Mineral Species Identifications", description: "ROIs identified as a specific mineral species", type: "mist-species" },
  { name: "MIST Mineral Group Identifications", description: "ROIs identified as a mineral group", type: "mist-group" },
];
