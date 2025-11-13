// Copyright (c) 2018-2022 California Institute of Technology ("Caltech"). U.S.
// Government sponsorship acknowledged.
// All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
// * Redistributions of source code must retain the above copyright notice, this
//   list of conditions and the following disclaimer.
// * Redistributions in binary form must reproduce the above copyright notice,
//   this list of conditions and the following disclaimer in the documentation
//   and/or other materials provided with the distribution.
// * Neither the name of Caltech nor its operating division, the Jet Propulsion
//   Laboratory, nor the names of its contributors may be used to endorse or
//   promote products derived from this software without specific prior written
//   permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import {
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  ViewChild,
  HostListener,
} from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import {
  FullScreenLayout,
  WidgetLayoutConfiguration,
} from "src/app/generated-protos/screen-configuration";
import {
  WidgetConfiguration,
  WIDGETS,
  WidgetType,
} from "src/app/modules/widget/models/widgets.model";
import { WidgetData } from "../../../../../../../generated-protos/widget-data";
import { getWidgetOptions } from "../../../../../../widget/components/widget/widget.component";

const WIDGET_ICONS: Record<string, string> = {
  "binary-plot": "assets/chart-placeholders/binary-plot.svg",
  "ternary-plot": "assets/chart-placeholders/ternary-plot.svg",
  "chord-diagram": "assets/chart-placeholders/chord-diagram.svg",
  "context-image": "assets/chart-placeholders/context-image.svg",
  histogram: "assets/chart-placeholders/histogram.svg",
  "spectrum-chart": "assets/chart-placeholders/spectrum-chart.svg",
  "rgbu-viewer": "assets/chart-placeholders/rgbu-viewer.svg",
  "rgbu-plot": "assets/chart-placeholders/rgbu-plot.svg",
  "single-axis-rgbu": "assets/chart-placeholders/single-axis-rgbu.svg",
  "parallel-coordinates-plot":
    "assets/chart-placeholders/parallel-coordinates-plot.svg",
  "quant-table": "assets/chart-placeholders/quant-table.svg",
  "text-view": "assets/chart-placeholders/text-view.svg",
  variogram: "assets/chart-placeholders/variogram.svg",
};

const _baseIconUrl = "assets/chart-placeholders/";
const getWidgetIconUrl = (widgetType: string): string => {
  return WIDGET_ICONS[widgetType] || `${_baseIconUrl}${widgetType}.svg`;
};

export interface LayoutConfiguratorData {
  layout: FullScreenLayout;
  tabName: string;
}

export interface LayoutConfiguratorResponse {
  layout?: FullScreenLayout;
}

interface WidgetPlaceholder {
  startRow: number;
  endRow: number;
  startColumn: number;
  endColumn: number;
  type?: WidgetType;
}

@Component({
  standalone: false,
  selector: "layout-configurator",
  templateUrl: "./layout-configurator.component.html",
  styleUrls: ["./layout-configurator.component.scss"],
})
export class LayoutConfiguratorComponent implements OnInit, OnDestroy {
  @ViewChild("layoutPreview", { static: false })
  layoutPreview!: ElementRef<HTMLDivElement>;

  public layout: FullScreenLayout;
  public originalLayout: FullScreenLayout;
  public tabName: string;
  public templateColumns: string = "";
  public templateRows: string = "";

  public numRows: number = 0;
  public numColumns: number = 0;
  private _defaultWidgetType: WidgetType = "text-view";

  public allWidgetOptions: WidgetConfiguration[] = getWidgetOptions();

  private isResizing: boolean = false;
  private resizeWidget: WidgetLayoutConfiguration | null = null;
  private resizeEdge: "top" | "bottom" | "left" | "right" | null = null;
  private resizeStartMouseY: number = 0;
  private resizeStartMouseX: number = 0;
  private resizeStartRow: number = 0;
  private resizeStartColumn: number = 0;
  private resizeStartEndRow: number = 0;
  private resizeStartEndColumn: number = 0;

  public placeholders: WidgetPlaceholder[] = [];

  constructor(
    public dialogRef: MatDialogRef<
      LayoutConfiguratorComponent,
      LayoutConfiguratorResponse
    >,
    @Inject(MAT_DIALOG_DATA) public data: LayoutConfiguratorData
  ) {
    this.layout = JSON.parse(JSON.stringify(data.layout));
    this.originalLayout = JSON.parse(JSON.stringify(data.layout));
    this.tabName = data.tabName;
  }

  ngOnInit(): void {
    this.numRows = this.layout.rows.length;
    this.numColumns = this.layout.columns.length;
    this.computeLayoutCSS();
    this.initializePlaceholders();
    this.defaultWidgetType = JSON.parse(localStorage.getItem("defaultNewLayoutWidgetType") || this._defaultWidgetType);
  }

  computeLayoutCSS(): void {
    this.templateRows = this.layout.rows
      .map((row) => `${row.height}fr`)
      .join(" ");
    this.templateColumns = this.layout.columns
      .map((column) => `${column.width}fr`)
      .join(" ");
  }

  getTotalSubdivisionRows(): number {
    return this.layout.rows.reduce(
      (sum, row) => sum + row.height,
      0
    );
  }

  getTotalSubdivisionColumns(): number {
    return this.layout.columns.reduce(
      (sum, column) => sum + column.width,
      0
    );
  }

  getSubdivisionGridRows(): string {
    const rows: string[] = [];
    this.layout.rows.forEach((row) => {
      for (let i = 0; i < row.height; i++) {
        rows.push("1fr");
      }
    });
    return rows.join(" ");
  }

  getSubdivisionGridColumns(): string {
    const columns: string[] = [];
    this.layout.columns.forEach((column) => {
      for (let i = 0; i < column.width; i++) {
        columns.push("1fr");
      }
    });
    return columns.join(" ");
  }

  getWidgetGridRowStart(widget: WidgetLayoutConfiguration): number {
    return widget.startRow;
  }

  getWidgetGridRowEnd(widget: WidgetLayoutConfiguration): number {
    return widget.endRow;
  }

  getWidgetGridColumnStart(widget: WidgetLayoutConfiguration): number {
    return widget.startColumn;
  }

  getWidgetGridColumnEnd(widget: WidgetLayoutConfiguration): number {
    return widget.endColumn;
  }

  get defaultWidgetType(): WidgetType {
    return this._defaultWidgetType;
  }

  set defaultWidgetType(value: WidgetType) {
    this._defaultWidgetType = value;
    localStorage.setItem("defaultNewLayoutWidgetType", JSON.stringify(value));
  }

  onRowsChange(newValue: number): void {
    if (newValue < 1) {
      newValue = 1;
    }
    this.numRows = newValue;

    while (this.layout.rows.length < newValue) {
      const newRowIndex = this.layout.rows.length + 1;
      this.layout.rows.push({ height: 1 });
      this.layout.columns.forEach((column, columnIndex) => {
        const newWidget = WidgetLayoutConfiguration.create({
          id: "",
          type: this.defaultWidgetType,
          startRow: newRowIndex,
          endRow: newRowIndex + 1,
          startColumn: columnIndex + 1,
          endColumn: columnIndex + 2,
        });
        this.layout.widgets.push(newWidget);
      });
    }
    while (this.layout.rows.length > newValue) {
      this.layout.rows.pop();
    }

    const maxRow = this.getTotalSubdivisionRows() + 1;
    this.layout.widgets = this.layout.widgets.filter((widget) => {
      if (widget.endRow > maxRow) {
        widget.endRow = maxRow;
      }
      if (widget.startRow > this.getTotalSubdivisionRows()) {
        return false;
      }
      return true;
    });

    this.regeneratePlaceholders();
    this.computeLayoutCSS();
  }

  onColumnsChange(newValue: number): void {
    if (newValue < 1) {
      newValue = 1;
    }
    this.numColumns = newValue;

    while (this.layout.columns.length < newValue) {
      const newColumnIndex = this.layout.columns.length + 1;
      this.layout.columns.push({ width: 1 });
      this.layout.rows.forEach((row, rowIndex) => {
        const newWidget = WidgetLayoutConfiguration.create({
          id: "",
          type: this.defaultWidgetType,
          startColumn: newColumnIndex,
          endColumn: newColumnIndex + 1,
          startRow: rowIndex + 1,
          endRow: rowIndex + 2,
        });
        this.layout.widgets.push(newWidget);
      });
    }

    this.layout.columns = this.layout.columns.slice(0, newValue);

    const maxColumn = this.getTotalSubdivisionColumns() + 1;
    this.layout.widgets = this.layout.widgets.filter((widget) => {
      if (widget.endColumn > maxColumn) {
        widget.endColumn = maxColumn;
      }
      if (widget.startColumn > this.getTotalSubdivisionColumns()) {
        return false;
      }
      return true;
    });

    this.regeneratePlaceholders();

    this.computeLayoutCSS();
  }

  private checkWidgetsMatch(widget1: WidgetLayoutConfiguration, widget2: WidgetLayoutConfiguration): boolean {
    return widget1.id === widget2.id && widget1.startRow === widget2.startRow &&
     widget1.endRow === widget2.endRow && widget1.startColumn === widget2.startColumn &&
     widget1.endColumn === widget2.endColumn && widget1.type === widget2.type;
  }

  onDeleteWidget(widget: WidgetLayoutConfiguration): void {
    const widgetType = this.getWidgetType(widget.type);
    this.layout.widgets = this.layout.widgets.filter((w) => !this.checkWidgetsMatch(w, widget));
    this.regeneratePlaceholders();
    const placeholder = this.placeholders.find(
      (p) =>
        p.startRow === widget.startRow &&
        p.endRow === widget.endRow &&
        p.startColumn === widget.startColumn &&
        p.endColumn === widget.endColumn
    );
    if (placeholder) {
      placeholder.type = widgetType;
    }
  }

  onRestoreWidget(placeholder: WidgetPlaceholder): void {
    const newWidget = WidgetLayoutConfiguration.create({
      id: "",
      type: placeholder.type || this.defaultWidgetType,
      startRow: placeholder.startRow,
      endRow: placeholder.endRow,
      startColumn: placeholder.startColumn,
      endColumn: placeholder.endColumn,
    });
    this.layout.widgets.push(newWidget);
    this.regeneratePlaceholders();
  }

  onResizeStart(
    event: MouseEvent,
    widget: WidgetLayoutConfiguration,
    edge: "top" | "bottom" | "left" | "right"
  ): void {
    event.preventDefault();
    event.stopPropagation();
    this.isResizing = true;
    this.resizeWidget = widget;
    this.resizeEdge = edge;
    this.resizeStartMouseY = event.clientY;
    this.resizeStartMouseX = event.clientX;
    this.resizeStartRow = widget.startRow;
    this.resizeStartColumn = widget.startColumn;
    this.resizeStartEndRow = widget.endRow;
    this.resizeStartEndColumn = widget.endColumn;
  }

  @HostListener("document:mousemove", ["$event"])
  onMouseMove(event: MouseEvent): void {
    if (!this.isResizing || !this.resizeWidget || !this.resizeEdge) {
      return;
    }

    const gridElement = this.layoutPreview?.nativeElement;
    if (!gridElement) {
      return;
    }

    const rect = gridElement.getBoundingClientRect();
    const totalSubdivisionRows = this.getTotalSubdivisionRows();
    const totalSubdivisionColumns = this.getTotalSubdivisionColumns();

    if (this.resizeEdge === "top" || this.resizeEdge === "bottom") {
      const gridHeight = rect.height;
      const rowHeight = gridHeight / totalSubdivisionRows;

      let targetSubdivision: number;
      if (this.resizeEdge === "top") {
        const deltaY = this.resizeStartMouseY - event.clientY;
        const deltaSubdivisions = Math.round(deltaY / rowHeight);
        targetSubdivision = this.resizeStartRow - deltaSubdivisions;
      } else {
        const deltaY = event.clientY - this.resizeStartMouseY;
        const deltaSubdivisions = Math.round(deltaY / rowHeight);
        targetSubdivision = this.resizeStartEndRow + deltaSubdivisions;
      }

      targetSubdivision = Math.max(1, Math.min(targetSubdivision, totalSubdivisionRows + 1));

      if (this.resizeEdge === "top") {
        if (targetSubdivision < this.resizeWidget.endRow) {
          this.resizeWidget.startRow = targetSubdivision;
        }
      } else {
        if (targetSubdivision > this.resizeWidget.startRow) {
          this.resizeWidget.endRow = targetSubdivision;
        }
      }
    } else {
      const gridWidth = rect.width;
      const columnWidth = gridWidth / totalSubdivisionColumns;

      let targetSubdivision: number;
      if (this.resizeEdge === "left") {
        const deltaX = this.resizeStartMouseX - event.clientX;
        const deltaSubdivisions = Math.round(deltaX / columnWidth);
        targetSubdivision = this.resizeStartColumn - deltaSubdivisions;
      } else {
        const deltaX = event.clientX - this.resizeStartMouseX;
        const deltaSubdivisions = Math.round(deltaX / columnWidth);
        targetSubdivision = this.resizeStartEndColumn + deltaSubdivisions;
      }

      targetSubdivision = Math.max(1, Math.min(targetSubdivision, totalSubdivisionColumns + 1));

      if (this.resizeEdge === "left") {
        if (targetSubdivision < this.resizeWidget.endColumn) {
          this.resizeWidget.startColumn = targetSubdivision;
        }
      } else {
        if (targetSubdivision > this.resizeWidget.startColumn) {
          this.resizeWidget.endColumn = targetSubdivision;
        }
      }
    }
  }

  @HostListener("document:mouseup", ["$event"])
  onMouseUp(event: MouseEvent): void {
    if (this.isResizing) {
      if (this.resizeWidget) {
        this.adjustOverlappingWidgets(this.resizeWidget);
      }

      this.isResizing = false;
      this.resizeWidget = null;
      this.resizeEdge = null;
      this.regeneratePlaceholders();
    }
  }

  adjustOverlappingWidgets(draggedWidget: WidgetLayoutConfiguration): void {
    const totalRows = this.getTotalSubdivisionRows();
    const totalColumns = this.getTotalSubdivisionColumns();

    const overlappingWidgets = this.layout.widgets.filter((widget) => {
      if (this.checkWidgetsMatch(widget, draggedWidget)) {
        return false;
      }

      const rowOverlap =
        widget.startRow < draggedWidget.endRow &&
        widget.endRow > draggedWidget.startRow;
      const columnOverlap =
        widget.startColumn < draggedWidget.endColumn &&
        widget.endColumn > draggedWidget.startColumn;

      return rowOverlap && columnOverlap;
    });

    const widgetsToDelete: WidgetLayoutConfiguration[] = [];

    overlappingWidgets.forEach((widget) => {
      const isCompletelyContained =
        widget.startRow >= draggedWidget.startRow &&
        widget.endRow <= draggedWidget.endRow &&
        widget.startColumn >= draggedWidget.startColumn &&
        widget.endColumn <= draggedWidget.endColumn;

      if (isCompletelyContained) {
        widgetsToDelete.push(widget);
      } else {
        this.adjustWidgetToAvoidOverlap(widget, draggedWidget, totalRows, totalColumns);
        
        const isNowCompletelyContained =
          widget.startRow >= draggedWidget.startRow &&
          widget.endRow <= draggedWidget.endRow &&
          widget.startColumn >= draggedWidget.startColumn &&
          widget.endColumn <= draggedWidget.endColumn;
        
        if (isNowCompletelyContained) {
          widgetsToDelete.push(widget);
        }
      }
    });

    if (widgetsToDelete.length > 0) {
      this.layout.widgets = this.layout.widgets.filter((w) => 
        !widgetsToDelete.some((toDelete) => this.checkWidgetsMatch(w, toDelete))
      );
    }

    this.regeneratePlaceholders();
  }

  private checkGlobalWidgetOverlap(
    widget: WidgetLayoutConfiguration,
    startRow: number,
    endRow: number,
    startColumn: number,
    endColumn: number,
    excludeWidgets: WidgetLayoutConfiguration[]
  ): boolean {
    return this.layout.widgets.some((otherWidget) => {
      if (excludeWidgets.some((exclude) => this.checkWidgetsMatch(otherWidget, exclude))) {
        return false;
      }

      if (this.checkWidgetsMatch(otherWidget, widget)) {
        return false;
      }

      const rowOverlap = otherWidget.startRow < endRow && otherWidget.endRow > startRow;
      const columnOverlap = otherWidget.startColumn < endColumn && otherWidget.endColumn > startColumn;

      return rowOverlap && columnOverlap;
    });
  }

  private adjustWidgetToAvoidOverlap(
    widget: WidgetLayoutConfiguration,
    draggedWidget: WidgetLayoutConfiguration,
    totalRows: number,
    totalColumns: number
  ): void {
    const overlapStartRow = Math.max(widget.startRow, draggedWidget.startRow);
    const overlapEndRow = Math.min(widget.endRow, draggedWidget.endRow);
    const overlapStartColumn = Math.max(widget.startColumn, draggedWidget.startColumn);
    const overlapEndColumn = Math.min(widget.endColumn, draggedWidget.endColumn);

    const overlapRowSize = overlapEndRow - overlapStartRow;
    const overlapColumnSize = overlapEndColumn - overlapStartColumn;

    if (overlapRowSize <= 0 || overlapColumnSize <= 0) {
      return;
    }

    const widgetRowSize = widget.endRow - widget.startRow;
    const widgetColumnSize = widget.endColumn - widget.startColumn;

    const spaceToRight = totalColumns + 1 - draggedWidget.endColumn;
    const spaceToLeft = draggedWidget.startColumn - 1;
    const spaceToBottom = totalRows + 1 - draggedWidget.endRow;
    const spaceToTop = draggedWidget.startRow - 1;

    if (overlapColumnSize > 0) {
      const moveRightAmount = draggedWidget.endColumn - widget.startColumn;
      const moveLeftAmount = widget.endColumn - draggedWidget.startColumn;
      
      if (spaceToRight >= widgetColumnSize && moveRightAmount > 0 && moveRightAmount <= spaceToRight) {
        const newStartColumn = draggedWidget.endColumn;
        const newEndColumn = newStartColumn + widgetColumnSize;
        
        if (newEndColumn <= totalColumns + 1) {
          if (!this.checkGlobalWidgetOverlap(widget, widget.startRow, widget.endRow, newStartColumn, newEndColumn, [draggedWidget])) {
            widget.startColumn = newStartColumn;
            widget.endColumn = newEndColumn;
            const stillOverlapsRow = widget.startRow < draggedWidget.endRow && widget.endRow > draggedWidget.startRow;
            if (!stillOverlapsRow) {
              return;
            }
          }
        }
      } else if (spaceToLeft >= widgetColumnSize && moveLeftAmount > 0 && moveLeftAmount <= spaceToLeft) {
        const newEndColumn = draggedWidget.startColumn;
        const newStartColumn = newEndColumn - widgetColumnSize;
        
        if (newStartColumn >= 1) {
          if (!this.checkGlobalWidgetOverlap(widget, widget.startRow, widget.endRow, newStartColumn, newEndColumn, [draggedWidget])) {
            widget.startColumn = newStartColumn;
            widget.endColumn = newEndColumn;
            const stillOverlapsRow = widget.startRow < draggedWidget.endRow && widget.endRow > draggedWidget.startRow;
            if (!stillOverlapsRow) {
              return;
            }
          }
        }
      }

      if (widget.startColumn < draggedWidget.startColumn && widget.endColumn > draggedWidget.startColumn) {
        widget.endColumn = Math.max(widget.startColumn + 1, draggedWidget.startColumn);
      } else if (widget.endColumn > draggedWidget.endColumn && widget.startColumn < draggedWidget.endColumn) {
        widget.startColumn = Math.min(widget.endColumn - 1, draggedWidget.endColumn);
      }
    }

    const stillOverlapsRow = widget.startRow < draggedWidget.endRow && widget.endRow > draggedWidget.startRow;
    const stillOverlapsColumn = widget.startColumn < draggedWidget.endColumn && widget.endColumn > draggedWidget.startColumn;
    
    if (stillOverlapsRow && stillOverlapsColumn && overlapRowSize > 0) {
      const moveDownAmount = draggedWidget.endRow - widget.startRow;
      const moveUpAmount = widget.endRow - draggedWidget.startRow;
      
      if (spaceToBottom >= widgetRowSize && moveDownAmount > 0 && moveDownAmount <= spaceToBottom) {
        const newStartRow = draggedWidget.endRow;
        const newEndRow = newStartRow + widgetRowSize;
        
        if (newEndRow <= totalRows + 1) {
          if (!this.checkGlobalWidgetOverlap(widget, newStartRow, newEndRow, widget.startColumn, widget.endColumn, [draggedWidget])) {
            widget.startRow = newStartRow;
            widget.endRow = newEndRow;
            return;
          }
        }
      }
      else if (spaceToTop >= widgetRowSize && moveUpAmount > 0 && moveUpAmount <= spaceToTop) {
        const newEndRow = draggedWidget.startRow;
        const newStartRow = newEndRow - widgetRowSize;
        
        if (newStartRow >= 1) {
          if (!this.checkGlobalWidgetOverlap(widget, newStartRow, newEndRow, widget.startColumn, widget.endColumn, [draggedWidget])) {
            widget.startRow = newStartRow;
            widget.endRow = newEndRow;
            return;
          }
        }
      }

      if (widget.startRow < draggedWidget.startRow && widget.endRow > draggedWidget.startRow) {
        widget.endRow = Math.max(widget.startRow + 1, draggedWidget.startRow);
      } else if (widget.endRow > draggedWidget.endRow && widget.startRow < draggedWidget.endRow) {
        widget.startRow = Math.min(widget.endRow - 1, draggedWidget.endRow);
      }
    }

    if (widget.endRow <= widget.startRow) {
      widget.endRow = widget.startRow + 1;
    }
    if (widget.endColumn <= widget.startColumn) {
      widget.endColumn = widget.startColumn + 1;
    }

    widget.startRow = Math.max(1, Math.min(widget.startRow, totalRows));
    widget.endRow = Math.max(widget.startRow + 1, Math.min(widget.endRow, totalRows + 1));
    widget.startColumn = Math.max(1, Math.min(widget.startColumn, totalColumns));
    widget.endColumn = Math.max(widget.startColumn + 1, Math.min(widget.endColumn, totalColumns + 1));
  }


  isPlaceholderAtPosition(
    row: number,
    column: number
  ): WidgetPlaceholder | null {
    return (
      this.placeholders.find(
        (p) =>
          p.startRow <= row &&
          p.endRow > row &&
          p.startColumn <= column &&
          p.endColumn > column
      ) || null
    );
  }

  doesPlaceholderOverlapWithWidgets(placeholder: WidgetPlaceholder): boolean {
    return this.layout.widgets.some((widget) => {
      const rowOverlap =
        widget.startRow < placeholder.endRow &&
        widget.endRow > placeholder.startRow;
      const columnOverlap =
        widget.startColumn < placeholder.endColumn &&
        widget.endColumn > placeholder.startColumn;
      return rowOverlap && columnOverlap;
    });
  }

  initializePlaceholders(): void {
    this.regeneratePlaceholders();
  }

  regeneratePlaceholders(): void {
    const totalRows = this.getTotalSubdivisionRows();
    const totalColumns = this.getTotalSubdivisionColumns();
    
    const placeholderTypes = new Map<string, WidgetType | undefined>();
    this.placeholders.forEach((p) => {
      const key = `${p.startRow}-${p.endRow}-${p.startColumn}-${p.endColumn}`;
      placeholderTypes.set(key, p.type);
    });

    this.placeholders = [];
    
    const coveredCells: boolean[][] = [];
    for (let row = 1; row <= totalRows; row++) {
      coveredCells[row] = [];
      for (let col = 1; col <= totalColumns; col++) {
        coveredCells[row][col] = false;
      }
    }

    this.layout.widgets.forEach((widget) => {
      for (let row = widget.startRow; row < widget.endRow; row++) {
        for (let col = widget.startColumn; col < widget.endColumn; col++) {
          if (row >= 1 && row <= totalRows && col >= 1 && col <= totalColumns) {
            coveredCells[row][col] = true;
          }
        }
      }
    });

    const visited: boolean[][] = [];
    for (let row = 1; row <= totalRows; row++) {
      visited[row] = [];
      for (let col = 1; col <= totalColumns; col++) {
        visited[row][col] = false;
      }
    }

    for (let row = 1; row <= totalRows; row++) {
      for (let col = 1; col <= totalColumns; col++) {
        if (!coveredCells[row][col] && !visited[row][col]) {
          let maxWidth = 0;
          let maxHeight = 0;

          for (let c = col; c <= totalColumns; c++) {
            if (coveredCells[row][c] || visited[row][c]) {
              break;
            }
            maxWidth++;
          }

          for (let r = row; r <= totalRows; r++) {
            let canExtend = true;
            for (let c = col; c < col + maxWidth; c++) {
              if (coveredCells[r][c] || visited[r][c]) {
                canExtend = false;
                break;
              }
            }
            if (!canExtend) {
              break;
            }
            maxHeight++;
          }

          if (maxWidth > 0 && maxHeight > 0) {
            const placeholder: WidgetPlaceholder = {
              startRow: row,
              endRow: row + maxHeight,
              startColumn: col,
              endColumn: col + maxWidth,
            };

            const key = `${placeholder.startRow}-${placeholder.endRow}-${placeholder.startColumn}-${placeholder.endColumn}`;
            placeholder.type = placeholderTypes.get(key);

            this.placeholders.push(placeholder);

            for (let r = row; r < row + maxHeight; r++) {
              for (let c = col; c < col + maxWidth; c++) {
                visited[r][c] = true;
              }
            }
          }
        }
      }
    }
  }

  getValidPlaceholders(): WidgetPlaceholder[] {
    const maxRow = this.getTotalSubdivisionRows() + 1;
    const maxColumn = this.getTotalSubdivisionColumns() + 1;

    return this.placeholders.filter((placeholder) => {
      if (
        placeholder.startRow < 1 ||
        placeholder.startColumn < 1 ||
        placeholder.endRow > maxRow ||
        placeholder.endColumn > maxColumn
      ) {
        return false;
      }

      return !this.doesPlaceholderOverlapWithWidgets(placeholder);
    });
  }

  getWidgetType(widgetTypeString: string): WidgetType {
    return widgetTypeString as WidgetType;
  }

  getWidgetIconUrl(widgetType: string): string {
    return getWidgetIconUrl(widgetType);
  }

  getWidgetNamePlaceholder(widgetType: string): string {
    return this.getWidgetName(widgetType).charAt(0).toUpperCase();
  }

  getWidgetName(widgetType: string): string {
    return WIDGETS[widgetType as WidgetType]?.name || widgetType;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    this.dialogRef.close({ layout: this.layout });
  }

  ngOnDestroy(): void {
  }
}
