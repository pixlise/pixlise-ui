import { ScreenConfiguration } from "src/app/generated-protos/screen-configuration";

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
