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
  public defaultWidgetType: WidgetType = "text-view";

  private isDragging: boolean = false;
  private dragType: "column" | "row" | null = null;
  private dragIndex: number = -1;
  private dragStartPosition: number = 0;
  private dragStartValue: number = 0;

  public allWidgetOptions: WidgetConfiguration[] = getWidgetOptions();

  constructor(
    public dialogRef: MatDialogRef<
      LayoutConfiguratorComponent,
      LayoutConfiguratorResponse
    >,
    @Inject(MAT_DIALOG_DATA) public data: LayoutConfiguratorData
  ) {
    // Clone the layout to avoid mutating the original
    this.layout = JSON.parse(JSON.stringify(data.layout));
    this.originalLayout = JSON.parse(JSON.stringify(data.layout));
    this.tabName = data.tabName;
  }

  ngOnInit(): void {
    this.numRows = this.layout.rows.length;
    this.numColumns = this.layout.columns.length;
    this.computeLayoutCSS();
  }

  computeLayoutCSS(): void {
    this.templateRows = this.layout.rows
      .map((row) => `${row.height}fr`)
      .join(" ");
    this.templateColumns = this.layout.columns
      .map((column) => `${column.width}fr`)
      .join(" ");
  }

  onRowsChange(newValue: number): void {
    if (newValue < 1) {
      newValue = 1;
    }
    this.numRows = newValue;

    while (this.layout.rows.length < newValue) {
      this.layout.rows.push({ height: 1 });
      this.layout.columns.forEach((column, columnIndex) => {
        const originalWidgetIndex =
          this.layout.widgets.length - columnIndex - 1;
        // if (this.originalLayout.widgets.length > originalWidgetIndex) {
        //   const newWidget = WidgetLayoutConfiguration.create(this.originalLayout.widgets[originalWidgetIndex]);
        //   newWidget.startRow += 1;
        //   newWidget.endRow += 1;
        //   newWidget.startColumn = columnIndex + 1;
        //   newWidget.endColumn = columnIndex + 1;
        //   this.layout.widgets.push(newWidget);
        // } else {
        const newWidget = WidgetLayoutConfiguration.create({
          id: "",
          type: this.defaultWidgetType,
          startRow: newValue,
          endRow: newValue + 1,
          startColumn: columnIndex + 1,
          endColumn: columnIndex + 1,
        });
        console.log("Creating new widget", this.defaultWidgetType, newWidget);
        this.layout.widgets.push(newWidget);
        // }
      });
    }
    while (this.layout.rows.length > newValue) {
      this.layout.rows.pop();
    }

    const maxRow = newValue;
    this.layout.widgets = this.layout.widgets.filter((widget) => {
      if (widget.endRow > maxRow) {
        widget.endRow = maxRow;
      }
      if (widget.startRow > maxRow) {
        return false;
      }
      return true;
    });

    this.computeLayoutCSS();
  }

  onColumnsChange(newValue: number): void {
    if (newValue < 1) {
      newValue = 1;
    }
    this.numColumns = newValue;

    // Adjust columns array
    while (this.layout.columns.length < newValue) {
      this.layout.columns.push({ width: 1 });
      this.layout.rows.forEach((row, rowIndex) => {
        const originalWidgetIndex =
          this.layout.widgets.length -
          1 -
          this.layout.columns.length * rowIndex;
        // if (this.originalLayout.widgets.length > originalWidgetIndex) {
        //   const newWidget = WidgetLayoutConfiguration.create(this.originalLayout.widgets[originalWidgetIndex]);
        //   newWidget.startColumn += 1;
        //   newWidget.endColumn += 1;
        //   newWidget.startRow = rowIndex + 1;
        //   newWidget.endRow = rowIndex + 1;
        //   this.layout.widgets.push(newWidget);
        // } else {
        const newWidget = WidgetLayoutConfiguration.create({
          id: "",
          type: this.defaultWidgetType,
          startColumn: newValue,
          endColumn: newValue + 1,
          startRow: rowIndex + 1,
          endRow: rowIndex + 1,
        });
        console.log("Creating new widget", this.defaultWidgetType, newWidget);
        this.layout.widgets.push(newWidget);
        // }
      });
    }
    while (this.layout.columns.length > newValue) {
      this.layout.columns.pop();
    }

    // Adjust widgets that are out of bounds
    const maxColumn = newValue;
    this.layout.widgets = this.layout.widgets.filter((widget) => {
      if (widget.endColumn > maxColumn) {
        widget.endColumn = maxColumn;
      }
      if (widget.startColumn > maxColumn) {
        return false; // Remove widget if it's completely out of bounds
      }
      return true;
    });

    this.computeLayoutCSS();
  }

  startColumnDrag(event: MouseEvent, columnIndex: number): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
    this.dragType = "column";
    this.dragIndex = columnIndex;
    this.dragStartPosition = event.clientX;
    // Store the widths of the two columns being resized
    this.dragStartValue = this.layout.columns[columnIndex].width;
    document.addEventListener("mousemove", this.onColumnDrag);
    document.addEventListener("mouseup", this.stopDrag);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  startRowDrag(event: MouseEvent, rowIndex: number): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
    this.dragType = "row";
    this.dragIndex = rowIndex;
    this.dragStartPosition = event.clientY;
    // Store the height of the row being resized
    this.dragStartValue = this.layout.rows[rowIndex].height;
    document.addEventListener("mousemove", this.onRowDrag);
    document.addEventListener("mouseup", this.stopDrag);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }

  private onColumnDrag = (event: MouseEvent): void => {
    if (!this.isDragging || this.dragType !== "column" || this.dragIndex < 0) {
      return;
    }

    const delta = event.clientX - this.dragStartPosition;
    const previewElement = this.layoutPreview?.nativeElement;
    if (!previewElement) {
      return;
    }

    const rect = previewElement.getBoundingClientRect();
    const totalWidth = rect.width - 32; // Subtract padding
    const gap = 8; // Grid gap

    // Calculate total fr units
    const totalFr = this.layout.columns.reduce(
      (sum, col) => sum + col.width,
      0
    );
    const frToPixels =
      (totalWidth - gap * (this.layout.columns.length - 1)) / totalFr;

    // Calculate how many fr units the delta represents
    const deltaFr = delta / frToPixels;

    // Adjust the column widths
    // When dragging, we're resizing the column at dragIndex and the next one
    if (this.dragIndex < this.layout.columns.length - 1) {
      let newWidth = this.dragStartValue + deltaFr;
      if (newWidth < 0.5) {
        newWidth = 0.5;
      }
      // Adjust the next column to maintain total
      const nextColumnIndex = this.dragIndex + 1;
      const nextColumnStartValue = this.layout.columns[nextColumnIndex].width;
      const nextColumnNewWidth =
        nextColumnStartValue - (newWidth - this.dragStartValue);
      if (nextColumnNewWidth >= 0.5) {
        this.layout.columns[this.dragIndex].width = newWidth;
        this.layout.columns[nextColumnIndex].width = nextColumnNewWidth;
        this.computeLayoutCSS();
      }
    }
  };

  private onRowDrag = (event: MouseEvent): void => {
    if (!this.isDragging || this.dragType !== "row" || this.dragIndex < 0) {
      return;
    }

    const delta = event.clientY - this.dragStartPosition;
    const previewElement = this.layoutPreview?.nativeElement;
    if (!previewElement) {
      return;
    }

    const rect = previewElement.getBoundingClientRect();
    const totalHeight = rect.height - 32; // Subtract padding
    const gap = 8; // Grid gap

    // Calculate total fr units
    const totalFr = this.layout.rows.reduce((sum, row) => sum + row.height, 0);
    const frToPixels =
      (totalHeight - gap * (this.layout.rows.length - 1)) / totalFr;

    // Calculate how many fr units the delta represents
    const deltaFr = delta / frToPixels;

    // Adjust the row heights
    // When dragging, we're resizing the row at dragIndex and the next one
    if (this.dragIndex < this.layout.rows.length - 1) {
      let newHeight = this.dragStartValue + deltaFr;
      if (newHeight < 0.5) {
        newHeight = 0.5;
      }
      // Adjust the next row to maintain total
      const nextRowIndex = this.dragIndex + 1;
      const nextRowStartValue = this.layout.rows[nextRowIndex].height;
      const nextRowNewHeight =
        nextRowStartValue - (newHeight - this.dragStartValue);
      if (nextRowNewHeight >= 0.5) {
        this.layout.rows[this.dragIndex].height = newHeight;
        this.layout.rows[nextRowIndex].height = nextRowNewHeight;
        this.computeLayoutCSS();
      }
    }
  };

  private stopDrag = (): void => {
    this.isDragging = false;
    this.dragType = null;
    this.dragIndex = -1;
    document.removeEventListener("mousemove", this.onColumnDrag);
    document.removeEventListener("mousemove", this.onRowDrag);
    document.removeEventListener("mouseup", this.stopDrag);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  getWidgetType(widgetTypeString: string): WidgetType {
    return widgetTypeString as WidgetType;
  }

  getColumnHandles(): number[] {
    // Return indices for handles between columns (0 to numColumns-2)
    return Array.from({ length: this.numColumns - 1 }, (_, i) => i);
  }

  getRowHandles(): number[] {
    // Return indices for handles between rows (0 to numRows-2)
    return Array.from({ length: this.numRows - 1 }, (_, i) => i);
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
    // Clean up event listeners
    this.stopDrag();
  }
}
