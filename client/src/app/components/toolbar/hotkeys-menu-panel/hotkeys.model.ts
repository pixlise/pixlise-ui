export type Hotkey = {
  name: string;
  shortcut: string;
};

function _isWindows(): boolean {
  return navigator.userAgent.search("Windows") !== -1;
}

const cmdOrCtrl = _isWindows() ? "Ctrl" : "Cmd";
const altOrOption = _isWindows() ? "Alt" : "Option";

export const HOTKEYS: Record<string, Hotkey[]> = {
  Layout: [
    {
      name: "Toggle Sidebar",
      shortcut: `${cmdOrCtrl} + B`,
    },
  ],
  "Datasets Listing": [
    {
      name: "Multi-Select Datasets",
      shortcut: `${cmdOrCtrl} + Click`,
    },
  ],
  "Chart Keys": [
    {
      name: "Solo Key Item",
      shortcut: `${altOrOption} + Click`,
    },
  ],
  "Context Image": [
    {
      name: "Band Box Zoom",
      shortcut: "Hold Z",
    },
    {
      name: "Zoom",
      shortcut: "Z",
    },
    {
      name: "Pan Mode",
      shortcut: "Hold Shift",
    },
    {
      name: "Lasso Tool",
      shortcut: "O",
    },
    {
      name: "Brush Tool",
      shortcut: "B",
    },
  ],
  "Spectrum Chart": [
    {
      name: "Band Box Zoom",
      shortcut: "Hold Z",
    },
    {
      name: "Zoom",
      shortcut: "Z",
    },
    {
      name: "Pan Mode",
      shortcut: "Hold Shift",
    },
  ],
  "Code Editor": [
    {
      name: "Run Expression",
      shortcut: `${cmdOrCtrl} + Enter`,
    },
    {
      name: "Run Until Line",
      shortcut: `${cmdOrCtrl} + ${altOrOption} + Enter`,
    },
    {
      name: "Run Highlighted Selection",
      shortcut: `Select Code, ${cmdOrCtrl} + ${altOrOption} + Enter`,
    },
  ],
};
