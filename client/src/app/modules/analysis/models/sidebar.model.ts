import { MistROIComponent } from "../components/analysis-sidepanel/tabs/mist-roi/mist-roi.component";
import { ROITabComponent } from "../components/analysis-sidepanel/tabs/roi-tab/roi-tab.component";

export interface SidebarTabItem {
  title: string;
  icon: string;
  component: any;
  width?: string;
  tooltip?: string;
  shortcut?: string[];
  showSearchButton?: boolean;
}

export interface SidebarViewShortcut {
  title: string;
  icon: string;
  tooltip?: string;
  shortcut?: string[];
  action: () => void;
}

export const SIDEBAR_TABS: SidebarTabItem[] = [
  // {
  //   title: "Workspaces",
  //   icon: "assets/icons/workspaces.svg",
  //   component: null,
  //   tooltip: "Workspaces",
  //   shortcut: ["Cmd", "Shift", "1"],
  // },
  // {
  //   title: "Collections",
  //   icon: "assets/icons/collections.svg",
  //   component: null,
  //   tooltip: "Collections",
  //   shortcut: ["Cmd", "Shift", "2"],
  // },
  {
    title: "Regions of Interest",
    icon: "assets/icons/roi.svg",
    component: ROITabComponent,
    width: "350px",
    tooltip: "Regions of Interest",
    shortcut: ["Cmd", "Shift", "3"],
    showSearchButton: true,
  },
  {
    title: "MIST ROIs",
    icon: "assets/icons/mist-roi.svg",
    component: MistROIComponent,
    width: "350px",
    tooltip: "MIST ROIs",
    shortcut: ["Cmd", "Shift", "4"],
  },
  {
    title: "Selection",
    icon: "assets/icons/selection.svg",
    component: null,
    tooltip: "Selection",
    shortcut: ["Cmd", "Shift", "5"],
  },
  {
    title: "Diffraction",
    icon: "assets/icons/diffraction.svg",
    component: null,
    tooltip: "Diffraction",
    shortcut: ["Cmd", "Shift", "6"],
  },
  {
    title: "Roughness",
    icon: "assets/icons/roughness.svg",
    component: null,
    tooltip: "Roughness",
    shortcut: ["Cmd", "Shift", "7"],
  },
  {
    title: "Multi-Quant",
    icon: "assets/icons/multiquant.svg",
    component: null,
    tooltip: "Multi-Quant",
    shortcut: ["Cmd", "Shift", "8"],
  },
];

export const SIDEBAR_VIEWS: SidebarViewShortcut[] = [
  // {
  //   title: "XRF View",
  //   icon: "assets/icons/xrf-symbol.svg",
  //   tooltip: "XRF View",
  //   action: () => {
  //     console.log("XRF View");
  //   },
  // },
  // {
  //   title: "RGBU View",
  //   icon: "assets/icons/rgbu-symbol.svg",
  //   tooltip: "RGBU View",
  //   action: () => {
  //     console.log("RGBU View");
  //   },
  // },
];

export const SIDEBAR_ADMIN_SHORTCUTS: SidebarViewShortcut[] = [
  {
    title: "Import View State",
    icon: "assets/button-icons/upload.svg",
    tooltip: "Import View State",
    action: () => {
      console.log("Import View State");
    },
  },
];
