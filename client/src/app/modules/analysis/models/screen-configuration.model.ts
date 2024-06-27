import { FullScreenLayout, ScreenConfiguration, WidgetLayoutConfiguration } from "src/app/generated-protos/screen-configuration";

export type WidgetReference = {
  widget: WidgetLayoutConfiguration;
  name: string;
  type: string;
  page: number;
};

export const DEFAULT_SCREEN_CONFIGURATION: ScreenConfiguration = {
  id: "",
  name: "",
  description: "",
  tags: [],
  modifiedUnixSec: 0,
  owner: undefined,
  scanConfigurations: {},
  layouts: [
    {
      rows: [{ height: 3 }, { height: 2 }],
      columns: [{ width: 3 }, { width: 2 }, { width: 2 }, { width: 2 }],
      widgets: [
        {
          id: "",
          type: "context-image",
          startRow: 1,
          startColumn: 1,
          endRow: 2,
          endColumn: 2,
          data: undefined,
        },
        {
          id: "",
          type: "spectrum-chart",
          startRow: 1,
          startColumn: 2,
          endRow: 2,
          endColumn: 5,
          data: undefined,
        },
        {
          id: "",
          type: "histogram",
          startRow: 2,
          startColumn: 1,
          endRow: 3,
          endColumn: 2,
          data: undefined,
        },
        {
          id: "",
          type: "chord-diagram",
          startRow: 2,
          startColumn: 2,
          endRow: 3,
          endColumn: 3,
          data: undefined,
        },
        {
          id: "",
          type: "ternary-plot",
          startRow: 2,
          startColumn: 3,
          endRow: 3,
          endColumn: 4,
          data: undefined,
        },
        {
          id: "",
          type: "binary-plot",
          startRow: 2,
          startColumn: 4,
          endRow: 3,
          endColumn: 5,
          data: undefined,
        },
      ],
    },
  ],
};

export const createDefaultScreenConfiguration = (): ScreenConfiguration => {
  return JSON.parse(JSON.stringify(DEFAULT_SCREEN_CONFIGURATION));
};

const ANALYSIS_STANDARD_LAYOUT = createDefaultScreenConfiguration().layouts[0];
const ANALYSIS_LAYOUT_2 = {
  rows: [{ height: 3 }, { height: 2 }],
  columns: [{ width: 3 }, { width: 2 }, { width: 2 }, { width: 2 }],
  widgets: [
    {
      id: "",
      type: "context-image",
      startRow: 1,
      startColumn: 1,
      endRow: 3,
      endColumn: 3,
      data: undefined,
    },
    {
      id: "",
      type: "spectrum-chart",
      startRow: 1,
      startColumn: 3,
      endRow: 2,
      endColumn: 5,
      data: undefined,
    },
    {
      id: "",
      type: "histogram",
      startRow: 3,
      startColumn: 3,
      endRow: 3,
      endColumn: 3,
      data: undefined,
    },
    {
      id: "",
      type: "chord-diagram",
      startRow: 2,
      startColumn: 2,
      endRow: 3,
      endColumn: 3,
      data: undefined,
    },
    {
      id: "",
      type: "ternary-plot",
      startRow: 2,
      startColumn: 3,
      endRow: 3,
      endColumn: 4,
      data: undefined,
    },
    {
      id: "",
      type: "binary-plot",
      startRow: 2,
      startColumn: 4,
      endRow: 3,
      endColumn: 5,
      data: undefined,
    },
  ],
};

export const ANALYSIS_TEMPLATES = [ANALYSIS_STANDARD_LAYOUT, ANALYSIS_LAYOUT_2];

export const createDefaultAnalysisTemplates = (): FullScreenLayout[] => {
  return JSON.parse(JSON.stringify(ANALYSIS_TEMPLATES));
};

export const CODE_EDITOR_TEMPLATE = {
  rows: [{ height: 3 }],
  columns: [{ width: 1 }, { width: 3 }],
  widgets: [
    {
      id: "",
      type: "",
      startRow: 1,
      startColumn: 1,
      endRow: 1,
      endColumn: 2,
      data: undefined,
    },
    {
      id: "",
      type: "",
      startRow: 1,
      startColumn: 3,
      endRow: 1,
      endColumn: 4,
      data: undefined,
    },
  ],
};

export const ELEMENT_MAPS_TEMPLATE = {
  rows: [{ height: 2 }, { height: 2 }],
  columns: [{ width: 2 }, { width: 2 }, { width: 2 }, { width: 2 }],
  widgets: [
    {
      id: "",
      type: "",
      startRow: 1,
      startColumn: 1,
      endRow: 1,
      endColumn: 2,
      data: undefined,
    },
    {
      id: "",
      type: "",
      startRow: 1,
      startColumn: 3,
      endRow: 1,
      endColumn: 4,
      data: undefined,
    },
  ],
};

export const OTHER_TAB_TEMPLATES = [CODE_EDITOR_TEMPLATE, ELEMENT_MAPS_TEMPLATE];

export const createDefaultOtherTabTemplates = (): FullScreenLayout[] => {
  return JSON.parse(JSON.stringify(OTHER_TAB_TEMPLATES));
};
