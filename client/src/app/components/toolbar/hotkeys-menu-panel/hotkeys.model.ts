export type Hotkey = {
  name: string;
  shortcut: string;
};

export const HOTKEYS: Record<string, Hotkey[]> = {
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
  "Binary Chart": [
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
};
