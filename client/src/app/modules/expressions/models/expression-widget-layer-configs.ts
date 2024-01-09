import { WidgetType } from "../../widget/models/widgets.model";

export type WidgetLayerPositionConfig = {
  position: number;
  icon: string;
};

export type WidgetLayerPositionConfigMap = { Off: WidgetLayerPositionConfig } & { [key: string]: WidgetLayerPositionConfig };

export const TERNARY_WIDGET_OPTIONS: WidgetLayerPositionConfigMap = {
  Left: { position: 0, icon: "assets/button-icons/ternary-left.svg" },
  Right: { position: 1, icon: "assets/button-icons/ternary-right.svg" },
  Top: { position: 2, icon: "assets/button-icons/ternary-top.svg" },
  Off: { position: -1, icon: "assets/button-icons/visible-off.svg" },
};

export const BINARY_WIDGET_OPTIONS: WidgetLayerPositionConfigMap = {
  X: { position: 0, icon: "assets/button-icons/binary-x-axis.svg" },
  Y: { position: 1, icon: "assets/button-icons/binary-y-axis.svg" },
  Off: { position: -1, icon: "assets/button-icons/visible-off.svg" },
};

export const widgetLayerPositions: Partial<Record<WidgetType | "", WidgetLayerPositionConfigMap>> = {
  "ternary-plot": TERNARY_WIDGET_OPTIONS,
  "binary-plot": BINARY_WIDGET_OPTIONS,
  "": {} as WidgetLayerPositionConfigMap,
};
