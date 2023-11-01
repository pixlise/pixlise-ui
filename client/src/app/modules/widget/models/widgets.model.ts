import { WidgetData } from "src/app/generated-protos/widget-data";
import { ContextImageComponent } from "src/app/modules/image-viewers/image-viewers.module";
import {
  BinaryChartWidgetComponent,
  TernaryChartWidgetComponent,
  HistogramWidgetComponent,
  ChordDiagramWidgetComponent,
} from "src/app/modules/scatterplots/scatterplots.module";
import { SpectrumChartWidgetComponent } from "src/app/modules/spectrum/spectrum.module";

export type WidgetToolbarButtonTypes = "selectable-button" | "button" | "toggle-button" | "multi-state-button" | "selection-changer";

export type WidgetToolbarButtonConfiguration = {
  id: string;
  type: WidgetToolbarButtonTypes;
  title?: string;
  icon?: string;
  tooltip?: string;
  value?: any;
  disabled?: boolean;
  onClick: (value: any, trigger?: Element) => void;

  // Controls whether the value is copied over in a template
  templateable?: boolean;

  // If there isn't enough room to display the button, move it into the settings menu
  _overflowed?: boolean;
  maxWidth?: number;
};

export type WidgetControlConfiguration = {
  // Projected component- this must be an ng-template
  settingsMenu?: any;

  // Toolbar buttons
  topToolbar?: WidgetToolbarButtonConfiguration[];
  bottomToolbar?: WidgetToolbarButtonConfiguration[];

  // Buttons inset into the widget
  topLeftInsetButton?: WidgetToolbarButtonConfiguration;
  topCenterInsetButton?: WidgetToolbarButtonConfiguration;
  topRightInsetButton?: WidgetToolbarButtonConfiguration;

  bottomLeftInsetButton?: WidgetToolbarButtonConfiguration;
  bottomRightInsetButton?: WidgetToolbarButtonConfiguration;
};

export type WidgetConfiguration = {
  // Selector information
  name: string;
  description: string;

  // Projected component
  component: any;

  // Toolbar and settings options - define this in the component
  controlConfiguration: WidgetControlConfiguration;

  dataKey: keyof WidgetData;
};

export const WIDGETS = {
  "spectrum-chart": {
    name: "Spectrum",
    description: "Spectrum chart",
    component: SpectrumChartWidgetComponent,
    dataKey: "spectrum",
    controlConfiguration: {},
  },
  "binary-plot": {
    name: "Binary Plot",
    description: "Binary plot",
    component: BinaryChartWidgetComponent,
    dataKey: "binary",
    controlConfiguration: {},
  },
  "ternary-plot": {
    name: "Ternary Plot",
    description: "Ternary plot",
    component: TernaryChartWidgetComponent,
    dataKey: "ternary",
    controlConfiguration: {},
  },
  histogram: {
    name: "Histogram",
    description: "Histogram",
    component: HistogramWidgetComponent,
    dataKey: "histogram",
    controlConfiguration: {},
  },
  "chord-diagram": {
    name: "Chord Diagram",
    description: "Chord Diagram",
    component: ChordDiagramWidgetComponent,
    dataKey: "chord",
    controlConfiguration: {},
  },
  "context-image": {
    name: "Context Image",
    description: "Context Image",
    component: ContextImageComponent,
    dataKey: "contextImage",
    controlConfiguration: {},
  },
} satisfies Record<string, WidgetConfiguration>;

export type WidgetType = keyof typeof WIDGETS;
