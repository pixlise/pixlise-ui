import { Component, HostListener } from "@angular/core";
import { AnalysisLayoutService } from "../../services/analysis-layout.service";
import { WidgetType } from "../../components/widget/models/widgets.model";

export type ScreenConfigurationCSS = {
  templateColumns: string;
  templateRows: string;
};

export type ScreenConfigurationRow = {
  height: number;
};

export type ScreenConfigurationColumn = {
  width: number;
};

export type WidgetLayoutConfiguration = {
  id: string;
  type: WidgetType;
  startRow: number;
  startColumn: number;
  endRow: number;
  endColumn: number;
};

export type StoredScreenConfiguration = {
  id: string;
  rows: ScreenConfigurationRow[];
  columns: ScreenConfigurationColumn[];
  widgets: WidgetLayoutConfiguration[];
};

export class ScreenConfiguration {
  layoutCSS: ScreenConfigurationCSS = { templateColumns: "", templateRows: "" };

  private _rows: ScreenConfigurationRow[] = [];
  private _columns: ScreenConfigurationColumn[] = [];

  constructor(
    public id: string,
    rows: ScreenConfigurationRow[],
    columns: ScreenConfigurationColumn[],
    public widgets: WidgetLayoutConfiguration[]
  ) {
    this.rows = rows;
    this.columns = columns;
  }

  get rows(): ScreenConfigurationRow[] {
    return this._rows;
  }

  set rows(rows: ScreenConfigurationRow[]) {
    this._rows = rows;
    this.generateTemplate();
  }

  get columns(): ScreenConfigurationColumn[] {
    return this._columns;
  }

  set columns(columns: ScreenConfigurationColumn[]) {
    this._columns = columns;
    this.generateTemplate();
  }

  generateTemplate() {
    let templateRows = this.rows.map(row => `${row.height}fr`).join(" ");
    let templateColumns = this.columns.map(column => `${column.width}fr`).join(" ");
    this.layoutCSS = { templateColumns, templateRows };
  }
}

@Component({
  selector: "app-analysis-page",
  templateUrl: "./analysis-page.component.html",
  styleUrls: ["./analysis-page.component.scss"],
})
export class AnalysisPageComponent {
  private _keyPresses = new Set<string>();

  private _templateIndex: number = 0;
  private _templates: ScreenConfiguration[] = [];

  _screenConfiguration: StoredScreenConfiguration[] = [
    {
      id: "screen-1",
      rows: [{ height: 3 }, { height: 2 }],
      columns: [{ width: 3 }, { width: 2 }, { width: 2 }, { width: 2 }],
      widgets: [
        {
          id: "context-1",
          type: "binary-plot",
          startRow: 1,
          startColumn: 1,
          endRow: 2,
          endColumn: 2,
        },
        {
          id: "spectrum-1",
          type: "spectrum-chart",
          startRow: 1,
          startColumn: 2,
          endRow: 2,
          endColumn: 5,
        },
        {
          id: "below-context-1",
          type: "histogram",
          startRow: 2,
          startColumn: 1,
          endRow: 3,
          endColumn: 2,
        },
        {
          id: "plot-1",
          type: "chord-diagram",
          startRow: 2,
          startColumn: 2,
          endRow: 3,
          endColumn: 3,
        },
        {
          id: "plot-2",
          type: "ternary-plot",
          startRow: 2,
          startColumn: 3,
          endRow: 3,
          endColumn: 4,
        },
        {
          id: "plot-3",
          type: "binary-plot",
          startRow: 2,
          startColumn: 4,
          endRow: 3,
          endColumn: 5,
        },
      ],
    },
    // {
    //   id: "screen-2",
    //   rows: [{ height: 3 }, { height: 2 }],
    //   columns: [{ width: 3 }, { width: 2 }, { width: 2 }, { width: 2 }],
    //   widgets: [
    //     {
    //       id: "context-1",
    //       type: "ternary-plot",
    //       startRow: 1,
    //       startColumn: 1,
    //       endRow: 2,
    //       endColumn: 2,
    //     },
    //     {
    //       id: "spectrum-1",
    //       type: "binary-plot",
    //       startRow: 1,
    //       startColumn: 2,
    //       endRow: 2,
    //       endColumn: 5,
    //     },
    //     {
    //       id: "below-context-1",
    //       type: "histogram",
    //       startRow: 2,
    //       startColumn: 1,
    //       endRow: 3,
    //       endColumn: 2,
    //     },
    //     {
    //       id: "plot-1",
    //       type: "chord-diagram",
    //       startRow: 2,
    //       startColumn: 2,
    //       endRow: 3,
    //       endColumn: 3,
    //     },
    //     {
    //       id: "plot-2",
    //       type: "ternary-plot",
    //       startRow: 2,
    //       startColumn: 3,
    //       endRow: 3,
    //       endColumn: 4,
    //     },
    //     {
    //       id: "plot-3",
    //       type: "binary-plot",
    //       startRow: 2,
    //       startColumn: 4,
    //       endRow: 3,
    //       endColumn: 5,
    //     },
    //   ],
    // },
  ];

  constructor(private _analysisLayoutService: AnalysisLayoutService) {}

  ngOnInit(): void {
    this.generateTemplate(this._screenConfiguration);
  }

  generateTemplate(storedConfigs: StoredScreenConfiguration[]) {
    this._templates = storedConfigs.map(screen => new ScreenConfiguration(screen.id, screen.rows, screen.columns, screen.widgets));
    this._templateIndex = 0;
  }

  get screenConfigurations(): ScreenConfiguration[] {
    if (this._templates.length === 0) {
      return [new ScreenConfiguration("empty", [], [], [])];
    }

    return this._templates;
  }

  get screenConfiguration(): ScreenConfiguration {
    if (this._templateIndex >= this._templates.length) {
      return new ScreenConfiguration("empty", [], [], []);
    }

    return this._templates[this._templateIndex];
  }

  @HostListener("window:keydown", ["$event"])
  onKeydown(event: KeyboardEvent): void {
    let cmdOrCtrl = this._analysisLayoutService.isWindows ? "Control" : "Meta";
    let bOrAltB = this._analysisLayoutService.isFirefox ? "∫" : "b";

    this._keyPresses.add(event.key);
    if (this._keyPresses.has(cmdOrCtrl) && this._keyPresses.has(bOrAltB)) {
      if (event.key === cmdOrCtrl) {
        this._keyPresses.delete(cmdOrCtrl);
        this._keyPresses.delete(bOrAltB);
      }
      this._keyPresses.delete(event.key);

      this._analysisLayoutService.toggleSidePanel();
    }
  }

  @HostListener("window:keyup", ["$event"])
  onKeyup(event: KeyboardEvent): void {
    this._keyPresses.delete(event.key);
  }

  @HostListener("window:resize", ["$event"])
  onResize() {
    // Window resized, notify all canvases
    this._analysisLayoutService.notifyWindowResize();
  }
}
