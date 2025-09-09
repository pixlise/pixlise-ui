import { from, map, Observable } from "rxjs";

import { WidgetData } from "src/app/generated-protos/widget-data";

import { WidgetKeyItem } from "src/app/modules/pixlisecore/models/widget-key-item";
import { SelectionChangerImageInfo } from "src/app/modules/pixlisecore/components/atoms/selection-changer/selection-changer.component";


export function getWidgetComponent(widgetType: WidgetType): Observable<any> {
  return from(readWidgets()).pipe(
    map(widgetMap => {
      const w = widgetMap.get(widgetType);
      if (!w) {
        throw new Error(`Widget type ${widgetType} not found`);
      }
      return w;
    })
  );
}

export type WidgetToolbarButtonTypes =
  | "selectable-button"
  | "button"
  | "toggle-button"
  | "multi-state-button"
  | "selection-changer"
  | "widget-key"
  | "plus-minus-switch"
  | "divider";

export type WidgetToolbarButtonConfiguration = {
  id: string;
  type: WidgetToolbarButtonTypes;
  title?: string;
  settingTitle?: string;
  settingGroupTitle?: string;
  settingIcon?: string;
  icon?: string;
  inactiveIcon?: string;
  activeIcon?: string;
  tooltip?: string;
  value?: any;
  style?: any;
  margin?: string;
  disabled?: boolean;
  onClick: (value: any, trigger?: Element) => void;

  // Used by the multi-state-button type to define the states
  options?: string[];

  // Used by the widget-key type to communicate updates to the key items
  onUpdateKeyItems?: (keyItems: WidgetKeyItem[]) => void;

  // Quite specific unfortunately, but if parent widget operates on an image, this can be used to retrieve
  // parameters around that for selection-changer and potentially others
  getImageInfo?: () => SelectionChangerImageInfo;

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
  id?: WidgetType;
  name: string;
  description: string;

  hasExpressions?: boolean;
  maxExpressions?: number;

  showRGBMixExpressionPickerMode?: boolean;

  // Projected component
  widgetComponent: any;

  // Toolbar and settings options - define this in the component
  controlConfiguration: WidgetControlConfiguration;

  dataKey: keyof WidgetData;
};

export const WIDGETS = {
  "spectrum-chart": {
    name: "Spectrum",
    description: "Spectrum chart",
    widgetComponent: null,
    //component: SpectrumChartWidgetComponent,
    dataKey: "spectrum",
    controlConfiguration: {},
  },
  "binary-plot": {
    name: "Binary Plot",
    description: "Binary plot",
    hasExpressions: true,
    maxExpressions: 2,
    widgetComponent: null,
    //component: BinaryChartWidgetComponent,
    dataKey: "binary",
    controlConfiguration: {},
  },
  "ternary-plot": {
    name: "Ternary Plot",
    description: "Ternary plot",
    hasExpressions: true,
    maxExpressions: 3,
    widgetComponent: null,
    //component: TernaryChartWidgetComponent,
    dataKey: "ternary",
    controlConfiguration: {},
  },
  histogram: {
    name: "Histogram",
    description: "Histogram",
    hasExpressions: true,
    widgetComponent: null,
    //component: HistogramWidgetComponent,
    dataKey: "histogram",
    controlConfiguration: {},
  },
  "chord-diagram": {
    name: "Chord Diagram",
    description: "Chord Diagram",
    hasExpressions: true,
    widgetComponent: null,
    //component: ChordDiagramWidgetComponent,
    dataKey: "chord",
    controlConfiguration: {},
  },
  "context-image": {
    name: "Context Image",
    description: "Context Image",
    hasExpressions: true,
    widgetComponent: null,
    //component: ContextImageComponent,
    dataKey: "contextImage",
    showRGBMixExpressionPickerMode: true,
    controlConfiguration: {},
  },
  "scan-3d-view": {
    name: "3D View (EXPERIMENTAL)",
    description: "3D View",
    hasExpressions: true,
    widgetComponent: null,
    //component: Scan3DViewComponent,
    dataKey: "scan3DView",
    showRGBMixExpressionPickerMode: true,
    controlConfiguration: {},
  },
  "multi-channel-image": {
    name: "RGBU Viewer",
    description: "RGBU Viewer",
    widgetComponent: null,
    //component: MultiChannelViewerComponent,
    dataKey: "rgbuImage",
    controlConfiguration: {},
  },
  "rgbu-plot": {
    name: "RGBU Plot",
    description: "RGBU Plot",
    widgetComponent: null,
    //component: RGBUPlotWidgetComponent,
    dataKey: "rgbuPlot",
    controlConfiguration: {},
  },
  "single-axis-rgbu-plot": {
    name: "Single Axis RGBU",
    description: "Single Axis RGBU Plot",
    widgetComponent: null,
    //component: SingleAxisRGBUComponent,
    dataKey: "singleAxisRGBU",
    controlConfiguration: {},
  },
  "parallel-coordinates-plot": {
    name: "Parallel Coordinates Plot",
    description: "Parallel Coordinates Plot",
    widgetComponent: null,
    //component: ParallelCoordinatesPlotWidgetComponent,
    dataKey: "parallelogram",
    controlConfiguration: {},
  },
  "quant-table": {
    name: "Quantification Table",
    description: "Quantification Table",
    widgetComponent: null,
    //component: QuantificationTableComponent,
    dataKey: "table",
    controlConfiguration: {},
  },
  "text-view": {
    name: "Text View",
    description: "Write freeform text using markdown",
    widgetComponent: null,
    //component: MarkdownTextViewComponent,
    dataKey: "markdownView",
    controlConfiguration: {},
  },
  variogram: {
    name: "Variogram",
    description: "Variogram",
    widgetComponent: null,
    //component: VariogramWidgetComponent,
    dataKey: "variogram",
    controlConfiguration: {},
  },
} satisfies Record<string, WidgetConfiguration>;

export type WidgetType = keyof typeof WIDGETS;
//export type WidgetType = string;

const loadedWidgets = new Map<WidgetType, any>();

const readWidgets = async () => {
  if (loadedWidgets.size <= 0) {
    const { SpectrumChartWidgetComponent } = await import("src/app/modules/spectrum/spectrum.module");
    const {
      BinaryChartWidgetComponent,
      TernaryChartWidgetComponent,
      HistogramWidgetComponent,
      ChordDiagramWidgetComponent,
      RGBUPlotWidgetComponent,
      SingleAxisRGBUComponent,
      ParallelCoordinatesPlotWidgetComponent,
    } = await import("src/app/modules/scatterplots/scatterplots.module");
    const { ContextImageComponent, MultiChannelViewerComponent } = await import("src/app/modules/image-viewers/image-viewers.module");
    const { QuantificationTableComponent } = await import("src/app/modules/table-views/table-views.module");
    const { MarkdownTextViewComponent } = await import("src/app/modules/text-views/text-views.module");
    const { VariogramWidgetComponent } = await import("src/app/modules/scatterplots/widgets/variogram-widget/variogram-widget.component");
    const { Scan3DViewComponent } = await import("src/app/modules/image-viewers/widgets/scan-3d-view/scan-3d-view.component");

    loadedWidgets.set("spectrum-chart", SpectrumChartWidgetComponent);
    loadedWidgets.set("binary-plot", BinaryChartWidgetComponent);
    loadedWidgets.set("ternary-plot", TernaryChartWidgetComponent);
    loadedWidgets.set("histogram", HistogramWidgetComponent);
    loadedWidgets.set("chord-diagram", ChordDiagramWidgetComponent);
    loadedWidgets.set("context-image", ContextImageComponent);
    loadedWidgets.set("multi-channel-image", MultiChannelViewerComponent);
    loadedWidgets.set("rgbu-plot", RGBUPlotWidgetComponent);
    loadedWidgets.set("single-axis-rgbu-plot", SingleAxisRGBUComponent);
    loadedWidgets.set("parallel-coordinates-plot", ParallelCoordinatesPlotWidgetComponent);
    loadedWidgets.set("quant-table", QuantificationTableComponent);
    loadedWidgets.set("text-view", MarkdownTextViewComponent);
    loadedWidgets.set("variogram", VariogramWidgetComponent);
    loadedWidgets.set("scan-3d-view", Scan3DViewComponent);
  }
  return loadedWidgets;
};
