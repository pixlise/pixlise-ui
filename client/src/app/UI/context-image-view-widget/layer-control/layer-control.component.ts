// Copyright (c) 2018-2022 California Institute of Technology (“Caltech”). U.S.
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

import { Component, Input, OnDestroy, OnInit } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Observable, Subscription } from "rxjs";
import { AuthenticationService } from "src/app/services/authentication.service";
import { ContextImageService } from "src/app/services/context-image.service";
import { DataExpression, DataExpressionService } from "src/app/services/data-expression.service";
import { DiffractionPeakService } from "src/app/services/diffraction-peak.service";
import { RGBMixConfigService } from "src/app/services/rgbmix-config.service";
import { ViewStateService } from "src/app/services/view-state.service";
import { DataSourceParams, RegionDataResults, WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { ExportDrawer } from "src/app/UI/context-image-view-widget/drawers/export-drawer";
import { LayerChangeInfo, LayerManager } from "src/app/UI/context-image-view-widget/layer-manager";
import { CanvasExportParameters, ClientSideExportGenerator } from "src/app/UI/export-data-dialog/client-side-export";
import { ExportDataChoice } from "src/app/UI/export-data-dialog/export-models";
import { showExportDialog } from "src/app/UI/export-data-dialog/show-export-dialog";
import { ExpressionEditorComponent, ExpressionEditorConfig } from "src/app/UI/expression-editor/expression-editor.component";
import { LayerVisibilityChange, LayerColourChange } from "src/app/UI/atoms/expression-list/layer-settings/layer-settings.component";
import { ExpressionListHeaderInfo } from "src/app/UI/atoms/expression-list/layer-settings/header.component";
import { ExpressionListHeaderToggleEvent } from "src/app/UI/atoms/expression-list/expression-list.component";
import { ExpressionListGroupNames, ExpressionListItems, LayerViewItem } from "src/app/models/ExpressionList";
import { CanvasExportItem, CSVExportItem, generatePlotImage, PlotExporterDialogComponent, PlotExporterDialogData, PlotExporterDialogOption } from "../../atoms/plot-exporter-dialog/plot-exporter-dialog.component";
import { DataSetService } from "src/app/services/data-set.service";
import { PredefinedROIID } from "src/app/models/roi";

export class ItemTag
{
    constructor(
        public id: string,
        public name: string,
        public author: string,
        public dateCreated: string,
        public type: string,
    ) {}
}

export interface AuthorTags
{
    author: string;
    tags: ItemTag[];
}


export class LayerDetails
{
    subLayers: LayerDetails[] = [];

    constructor(
        public layerID: string,
        public predefined: boolean,
        public heading: string,
        public summary: string,
        public subheading: string,
        public expressionID: string,
        public opacity: number,
        public visible: boolean,
        public shared: boolean
    ) {}
}

@Component({
    selector: ViewStateService.widgetSelectorContextImageLayers,
    templateUrl: "./layer-control.component.html",
    styleUrls: ["./layer-control.component.scss"]
})
export class LayerControlComponent extends ExpressionListGroupNames implements OnInit, OnDestroy
{
    private _subs = new Subscription();

    @Input() title: string = "Layers";
    @Input() showOpacitySliders: boolean = true;
    @Input() showElementRelative: boolean = false;
    @Input() showExport: boolean = true;

    private _userExportAllowed: boolean = false;
    private _filterText: string = "";
    
    headerSectionsOpen: Set<string> = new Set<string>();
    items: ExpressionListItems = null;
    
    private _lastLayerChangeCount: number = 0;
    
    authors: string[] = [];
    private _filteredAuthors: string[] = [];
    
    selectedTagIDs: string[] = [];
    tags: ItemTag[] = [
        new ItemTag("1", "Layer 1", "Author 1", "2020-01-01", "Layer"),
        new ItemTag("12", "Layer 2", "Author 1", "2020-01-01", "Layer"),
        new ItemTag("13", "Layer 3", "Author 1", "2020-01-01", "Layer"),
        new ItemTag("14", "Layer 4", "Author 2", "2020-01-01", "Layer"),
        new ItemTag("15", "Layer 5", "Author 2", "2020-01-01", "Layer"),
        new ItemTag("16", "Layer 6", "Author 2", "2020-01-01", "Layer"),
        new ItemTag("17", "Layer 7", "Author 3", "2020-01-01", "Layer"),
    ];

    constructor(
        private _contextImageService: ContextImageService,
        private _exprService: DataExpressionService,
        private _rgbMixService: RGBMixConfigService,
        private _widgetDataService: WidgetRegionDataService,
        private _authService: AuthenticationService,
        private _diffractionService: DiffractionPeakService,
        private _datasetService: DataSetService,
        public dialog: MatDialog
    )
    {
        super();
    }

    ngOnInit()
    {
        this._subs.add(this._contextImageService.mdl$.subscribe(
            ()=>
            {
                this.onGotModel();
            }
        ));

        this._subs.add(this._authService.getIdTokenClaims$().subscribe(
            (claims)=>
            {
                this._userExportAllowed = AuthenticationService.hasPermissionSet(claims, AuthenticationService.permissionExportMap);
            },
            (err)=>
            {
                this._userExportAllowed = false;
            }
        ));
    }

    onGotModel(): void
    {
        let layerManager = this.getLayerManager();
        // Listen to what layers exist...
        this._subs.add(layerManager.locationDataLayers$.subscribe(
            (change: LayerChangeInfo)=>
            {
                let t0 = performance.now();

                // NOTE: We only regenerate if:
                if(
                    // We haven't generated yet
                    !this.items ||
                    // - There is a difference in the layer count
                    this._lastLayerChangeCount != change.layers.length ||
                    // - Data refresh happened (eg new expressions or quant loaded)
                    change.reason == "dataArrived" ||
                    // - This is NOT simply a layer opacity change
                    ( this.items.items.length > 0 && change.reason != "setLayerOpacity" )
                )
                {
                    this.regenerateItemList("");
                }
                else
                {
                    // User may have shown/hidden layers, re-count what's visible in each group and update those headers
                    layerManager.recalcHeaderInfos(this.items);
                }
                this._lastLayerChangeCount = change.layers.length;
                this.populateAuthorsList();

                let t1 = performance.now();
                let timing = "layer control regeneration: " + (t1 - t0).toLocaleString() + "ms";
                console.log(timing);
            },
            (err)=>
            {
            }
        ));
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    private toggleLayerSectionOpenNoRegen(itemType: string, open: boolean): void
    {
        if(open)
        {
            // It was opened, ensure it's in the set of open sections
            this.headerSectionsOpen.add(itemType);
        }
        else
        {
            // It's closed, ensure it's not in the open list
            this.headerSectionsOpen.delete(itemType);
        }
    }

    onToggleLayerSectionOpen(event: ExpressionListHeaderToggleEvent): void
    {
        this.toggleLayerSectionOpenNoRegen(event.itemType, event.open);

        // Now that one of our sections has toggled, regenerate the whole list of what to show
        this.regenerateItemList(""/*event.itemType*/);
        //this.updateHeaderCounts(); // updates counts for the header too...
    }

    private populateAuthorsList(): void
    {
        let items = this.getLayerManager().makeExpressionList(new Set(["expressions-header", "rgbmix-header"]), "", this._contextImageService.lastSubLayerOwners, []);
        if(items && items.items && items.items.length > 0)
        {
            this.authors = [...new Set(items.items.map((item) => item.content?.layer?.source?.creator?.name))].filter((author) => author).sort();
        }
    }

    private regenerateItemList(fromGroupHeaderName: string): void
    {
        let items = this.getLayerManager().makeExpressionList(this.headerSectionsOpen, this._filterText, this._contextImageService.lastSubLayerOwners, this.filteredAuthors);
        if(!items)
        {
            return;
        }

        // Add the scan/footprint special settings
        items.items.push(new LayerViewItem(this.settingHeaderName, false, new ExpressionListHeaderInfo("X-ray Beam Locations", -1, 0, -1, 0)));
        if(this.headerSectionsOpen.has(this.settingHeaderName))
        {
            items.items.push(new LayerViewItem("setting-scanpoints", false, null));
            items.items.push(new LayerViewItem("setting-footprint", false, null));
        }

        // If we haven't generated yet, just accept it
        if(!this.items)
        {
            this.items = items;
            return;
        }

        // Find the group name and simply copy the old values over
        // and only put the new values in afterwards, should stop things
        // like filtering list boxes losing focus
        let snipIdx = 0;
        let c = 0;
        for(let item of items.items)
        {
            if(item.itemType == fromGroupHeaderName)
            {
                snipIdx = c+1;
                break;
            }
            c++;
        }

        this.items = new ExpressionListItems([...this.items.items.slice(0, snipIdx), ...items.items.slice(snipIdx)], items.groups, items.elementSubLayerOwnerIDs);

        // Remember for next time!
        this._contextImageService.setLastSubLayerOwners(new Set<string>(items.elementSubLayerOwnerIDs));
    }

    get showExportButton(): boolean
    {
        // If we're told not to show it, don't
        if(!this.showExport)
        {
            return false;
        }

        // Otherwise, only show it if user has permissions for export
        return this._userExportAllowed;
    }

    private getLayerManager(): LayerManager
    {
        if(!this._contextImageService.mdl)
        {
            return null;
        }
        return this._contextImageService.mdl.layerManager;
    }

    get imageSmoothing(): boolean
    {
        if(!this._contextImageService.mdl)
        {
            return false;
        }
        return this._contextImageService.mdl.smoothing;
    }

    onToggleImageSmoothing(): void
    {
        if(this._contextImageService.mdl)
        {
            this._contextImageService.mdl.smoothing = !this._contextImageService.mdl.smoothing;
        }
    }

    onAddExpression(): void
    {
        this.showExpressionEditor(new DataExpression("", "", "", DataExpressionService.DataExpressionTypeAll, "", false, null)).subscribe(
            (expr: DataExpression)=>
            {
                if(expr)
                {
                    // User has defined a new one, upload it
                    this._exprService.add(expr.name, expr.expression, expr.type, expr.comments).subscribe(
                        ()=>
                        {
                            // Don't need to do anything, service refreshes
                        },
                        (err)=>
                        {
                            alert("Failed to add data expression: "+expr.name);
                        }
                    );
                }
                // Else user probably cancelled...
            },
            (err)=>
            {
                console.error(err);
            }
        );
    }

    private showExpressionEditor(toEdit: DataExpression): Observable<DataExpression>
    {
        return new Observable<DataExpression>(
            (observer)=>
            {
                const dialogConfig = new MatDialogConfig();
                dialogConfig.panelClass = "panel";
                dialogConfig.disableClose = true;
                //dialogConfig.backdropClass = "panel";

                dialogConfig.data = new ExpressionEditorConfig(toEdit, true);

                const dialogRef = this.dialog.open(ExpressionEditorComponent, dialogConfig);

                dialogRef.afterClosed().subscribe(
                    (dlgResult: ExpressionEditorConfig)=>
                    {
                        let toReturn: DataExpression = null;
                        if(dlgResult)
                        {
                            toReturn = new DataExpression(toEdit.id, dlgResult.expr.name, dlgResult.expr.expression, toEdit.type, dlgResult.expr.comments, toEdit.shared, toEdit.creator);
                        }

                        observer.next(toReturn);
                        observer.complete();
                    },
                    (err)=>
                    {
                        observer.error(err);
                    }
                );
            }
        );
    }

    get elementRelativeShading(): boolean
    {
        if(!this._contextImageService.mdl)
        {
            return false;
        }
        return this._contextImageService.mdl.elementRelativeShading;
    }

    onToggleRelativeShading(active: boolean): void
    {
        if(this._contextImageService.mdl)
        {
            this._contextImageService.mdl.elementRelativeShading = active;
        }
    }

    onExport(): void
    {
        let choices = [
            new ExportDataChoice(ClientSideExportGenerator.exportWebResolution, "Web Resolution", false),
            new ExportDataChoice(ClientSideExportGenerator.exportPrintResolution, "Print Resolution", false),

            new ExportDataChoice(ClientSideExportGenerator.exportDrawBackgroundBlack, "Black Background On Images", true),

            new ExportDataChoice(ClientSideExportGenerator.exportContextImage, "Visible Context Image", false),

            new ExportDataChoice(ClientSideExportGenerator.exportContextImageFootprint, "Include Instrument Footprint", false),
            new ExportDataChoice(ClientSideExportGenerator.exportContextImageScanPoints, "Include Scan Points", false),

            new ExportDataChoice(ClientSideExportGenerator.exportContextImageROIs, "Visible Regions of Interest", false),
            new ExportDataChoice(ClientSideExportGenerator.exportExpressionValues, "Expression Values .csv", false),
            new ExportDataChoice(ClientSideExportGenerator.exportROIExpressionValues, "Separate ROI Expression Values .csv", false),
            // new ExportDataChoice(ClientSideExportGenerator.exportContextImageROIKey, '', false),
        ];

        // Come up with some defaults
        let params = new CanvasExportParameters(
            "file.name",
            1200, 800, 1,
            4096, 2160, 1
        );

        let lastDrawTransform = this._contextImageService.mdl.transform;
        if(lastDrawTransform && lastDrawTransform.canvasParams)
        {
            /*
            // Make the web res images double what we have in the viewport
            params.webResWidth = lastDrawTransform.canvasParams.width*2;
            params.webResHeight = lastDrawTransform.canvasParams.height*2;
*/
            // Make the web res be 1280 x (preserved aspect ratio)
            params.webResWidth = 1280;
            params.webResHeight = Math.floor(lastDrawTransform.canvasParams.height/lastDrawTransform.canvasParams.width*params.webResWidth);
            params.webDPI = params.webResWidth/lastDrawTransform.canvasParams.width;

            // Make the print res be 4096 x (preserved aspect ratio)
            params.printResWidth = 4096;
            params.printResHeight = Math.floor(lastDrawTransform.canvasParams.height/lastDrawTransform.canvasParams.width*params.printResWidth);
            params.printDPI = params.printResWidth/lastDrawTransform.canvasParams.width;
        }

        let drawer = new ExportDrawer(this._contextImageService.mdl, this._contextImageService.mdl.toolHost);
        let exportGen = new ClientSideExportGenerator(
            this._contextImageService.mdl.dataset,
            this._widgetDataService,
            drawer,
            this._contextImageService.mdl.transform,
            params,
            this._rgbMixService,
            this._exprService,
            this._diffractionService
        );

        showExportDialog(this.dialog, "Context Image Export Options", false, false, true, true, choices, exportGen).subscribe(
            ()=>
            {
            }
        );
    }

    onFilterExpressions(filter: string): void
    {
        this._filterText = filter;
        /* This used to make sense when we were ONLY filtering expressions... now we just leave the open states unchanged
        and the user can decide what they want to see
        if(filter.length > 0)
        {
            // Make sure the section is open
            this.toggleLayerSectionOpenNoRegen(this.expressionsHeaderName, true);
        }*/

        this.regenerateItemList("");
        //this.updateHeaderCounts(); // updates counts for the header too...
    }

    onLayerVisibilityChange(event: LayerVisibilityChange): void
    {
        // We handle this by passing straight to the layer manager!
        this._contextImageService.mdl.layerManager.setLayerVisibility(event.layerID, event.opacity, event.visible, event.layersToHide);

        // NOTE: we don't call this otherwise sliders wouldn't work (because the control being slid is being rebuilt in the background).
        // It actually works fine anyway because as users slide around/change visibility, the structure behind this (which we store a reference
        // to) is being updated, so we do show the right value!
        //this.regenerateItemList();
    }
    
    onLayerColourChange(event: LayerColourChange): void
    {
        this._contextImageService.mdl.layerManager.setLayerDisplayValueShading(event.layerID, event.colourRamp);

        // NOTE: we don't call this otherwise sliders wouldn't work (because the control being slid is being rebuilt in the background).
        // It actually works fine anyway because as users slide around/change visibility, the structure behind this (which we store a reference
        // to) is being updated, so we do show the right value!
        //this.regenerateItemList();
    }

    onHideAllLayers(): void
    {
        const layerMan = this.getLayerManager();

        // Get visible IDs
        let ids = layerMan.getLayerIds();
        let visibleIds: string[] = [];

        for(let id of ids)
        {
            const props = layerMan.getLayerProperties(id);
            if(props.visible)
            {
                visibleIds.push(id);
            }
        }

        layerMan.setLayerVisibility("", 1, false, visibleIds);

        this.regenerateItemList("");
    }

    get showHideAllButton(): boolean
    {
        if(!this.items)
        {
            return false;
        }

        for(let group of this.items.groups.values())
        {
            if(group.headerInfo.visibleCount > 0)
            {
                return true;
            }
        }

        return false;
    }

    get filteredAuthors(): string[]
    {
        return this._filteredAuthors;
    }

    set filteredAuthors(authors: string[])
    {
        this._filteredAuthors = authors;

        this.regenerateItemList("");
    }

    onTagSelectionChanged(tagIDs: string[]): void
    {
        this.selectedTagIDs = tagIDs;
    }

    exportExpressionValues(id: string): string
    {
        let queryData: RegionDataResults = this._widgetDataService.getData([new DataSourceParams(id, PredefinedROIID.AllPoints)], false);

        if(queryData.error)
        {
            throw new Error(`Failed to query CSV data for expression: ${id}. ${queryData.error}`);
        }

        let csv: string = "PMC,Value\n";
        queryData.queryResults[0].values.values.forEach(({pmc, value, isUndefined})=>
        {
            csv += `${pmc},${isUndefined ? "" : value}\n`;
        });

        return csv;
    }

    getCanvasOptions(options: PlotExporterDialogOption[], ids: string[]): string[]
    {
        let isColourScaleVisible = options.findIndex((option) => option.label == "Visible Colour Scale") > -1;
        let backgroundMode = options[options.findIndex((option) => option.label == "Background")].value;
        let exportIDs = [
            ClientSideExportGenerator.exportContextImageScanPoints,
            ClientSideExportGenerator.exportContextImageElementMap,
            ...ids.map((id) => `${ClientSideExportGenerator.exportExpressionPrefix}${id}`)
        ];

        if(isColourScaleVisible)
        {
            exportIDs.push(ClientSideExportGenerator.exportContextImageColourScale);
        }

        if(backgroundMode === "Context Image")
        {
            exportIDs.push(ClientSideExportGenerator.exportContextImage);
        }
        else if(backgroundMode === "Black")
        {
            exportIDs.push(ClientSideExportGenerator.exportDrawBackgroundBlack);
        }

        return exportIDs;
    }

    getAllElements(): LayerViewItem[]
    {
        let items = this.getLayerManager().makeExpressionList(new Set(["elements-header"]), "", this._contextImageService.lastSubLayerOwners, []);
        return items.items.filter((item) => item.itemType == "element-map");
    }

    onDownloadAllElements()
    {
        let exportOptions = [
            new PlotExporterDialogOption("Background", "Context Image", true, { type: "switch", options: ["Transparent", "Context Image", "Black"] }),
            new PlotExporterDialogOption("Visible Colour Scale", true, true),
            new PlotExporterDialogOption("Web Resolution (1200x800)", true),
            new PlotExporterDialogOption("Print Resolution (4096x2160)", true),
            new PlotExporterDialogOption("Expression Values .csv", true),
        ];

        let elements = this.getAllElements();
        const dialogConfig = new MatDialogConfig();
        dialogConfig.data = new PlotExporterDialogData(`${this._datasetService.datasetLoaded.getId()} - All Elements`, "Export All Quantified Elements", exportOptions, true, "Export All Elements", elements.length);

        const dialogRef = this.dialog.open(PlotExporterDialogComponent, dialogConfig);
        
        dialogRef.componentInstance.onPreviewChange.subscribe((options: PlotExporterDialogOption[]) =>
        {
            let ids = [];
            let previewLabel = null;
            if(elements.length > 0 && elements[0]?.content?.layer?.source)
            {
                ids.push(elements[0].content.layer.source.id);
                previewLabel = `(Group Export) ${elements[0].content.layer.source.name} Shown as Example`;
            }
            let drawer = new ExportDrawer(this._contextImageService.mdl, this._contextImageService.mdl.toolHost);
            let exportIDs = this.getCanvasOptions(options, ids);

            let preview: HTMLCanvasElement = null;
            if(options.findIndex((option) => option.label === "Web Resolution (1200x800)" || option.label === "Print Resolution (4096x2160)") > -1)
            {
                preview = generatePlotImage(drawer, this._contextImageService.mdl.transform, [], 1200, 800, false, false, exportIDs);
            }
            else
            {
                preview = generatePlotImage(drawer, this._contextImageService.mdl.transform, [], 1200, 800, false, false, []);
            }

            dialogRef.componentInstance.updatePreview(preview, previewLabel);
        });

        dialogRef.componentInstance.onConfirmOptions.subscribe(
            (options: PlotExporterDialogOption[])=>
            {
                let canvases: CanvasExportItem[] = [];
                let csvs: CSVExportItem[] = [];

                let drawer = new ExportDrawer(this._contextImageService.mdl, this._contextImageService.mdl.toolHost);

                elements.forEach((element) =>
                {
                    let id = element?.content?.layer?.source?.id;
                    let name = element?.content?.layer?.source?.name;

                    if(!element?.content?.layer?.source?.id)
                    {
                        console.error("Failed to export element. No ID found.", element);
                        return;
                    }
                    let exportIDs = this.getCanvasOptions(options, [id]);

                    if(options.findIndex((option) => option.label === "Web Resolution (1200x800)") > -1)
                    {
                        canvases.push(new CanvasExportItem(
                            `Web Resolution/${name.replace(/\//g, "_")}`,
                            generatePlotImage(drawer, this._contextImageService.mdl.transform, [], 1200, 800, false, false, exportIDs)
                        ));   
                    }

                    if(options.findIndex((option) => option.label === "Print Resolution (4096x2160)") > -1)
                    {
                        canvases.push(new CanvasExportItem(
                            `Print Resolution/${name.replace(/\//g, "_")}`,
                            generatePlotImage(drawer, this._contextImageService.mdl.transform, [], 4096, 2160, false, false, exportIDs)
                        ));   
                    }

                    if(options.findIndex((option) => option.label == "Expression Values .csv") > -1)
                    {
                        csvs.push(new CSVExportItem(
                            `Expression Values/${name.replace(/\//g, "_")}`,
                            this.exportExpressionValues(id)
                        ));  
                    }
                });

                dialogRef.componentInstance.onDownload(canvases, csvs);
            });

        return dialogRef.afterClosed();
    }
}