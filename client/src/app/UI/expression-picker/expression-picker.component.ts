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

import { Component, Inject, OnInit } from "@angular/core";
import { MatDialog, MatDialogConfig, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { DataSet } from "src/app/models/DataSet";
import { QuantificationLayer } from "src/app/models/Quantifications";
import { DataExpressionService } from "src/app/services/data-expression.service";
import { DataModuleService } from "src/app/services/data-module.service";
import { DataExpression, DataExpressionId } from "src/app/models/Expression";
import { DataSetService } from "src/app/services/data-set.service";
import { RGBMixConfigService } from "src/app/services/rgbmix-config.service";
import { WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { ExpressionEditorComponent, ExpressionEditorConfig } from "src/app/UI/expression-editor/expression-editor.component";
import { ExpressionListHeaderToggleEvent } from "src/app/UI/atoms/expression-list/expression-list.component";
import { LayerVisibilityChange } from "src/app/UI/atoms/expression-list/layer-settings/layer-settings.component";
import { LocationDataLayerProperties } from "src/app/models/LocationData2D";
import { RGBMix } from "src/app/services/rgbmix-config.service";
import { makeDataForExpressionList, ExpressionListBuilder, ExpressionListGroupNames, ExpressionListItems, LocationDataLayerPropertiesWithVisibility } from "src/app/models/ExpressionList";
import { ObjectCreator } from "src/app/models/BasicTypes";
import { EXPR_LANGUAGE_LUA } from "src/app/expression-language/expression-language";
import { AuthenticationService } from "src/app/services/authentication.service";


export class ExpressionPickerData
{
    constructor(
        public title: string,
        public activeExpressionIDs: string[],
        public singleSelection: boolean,
        public showRGBMixes: boolean,
        public showAnomalyExpressions: boolean,
        public isPreviewMode: boolean = false,
        public showModules: boolean = true
    )
    {
    }
}

@Component({
    selector: "expression-picker",
    templateUrl: "./expression-picker.component.html",
    styleUrls: ["./expression-picker.component.scss"]
})
export class ExpressionPickerComponent extends ExpressionListGroupNames implements OnInit
{
    private _subs = new Subscription();

    // Icons to display
    activeIcon="assets/button-icons/check-on.svg";
    inactiveIcon="assets/button-icons/check-off.svg";

    // What we display in the virtual-scroll capable list
    headerSectionsOpen: Set<string> = new Set<string>();
    items: ExpressionListItems = null;
    initialScrollToIdx: number = -1;

    private _filterText: string = "";
    private _selectAllFiltered: boolean = false;

    private _authors: ObjectCreator[] = [];
    private _filteredAuthors: string[] = [];
    
    private _activeIDs: Set<string> = new Set<string>();
    private _listBuilder: ExpressionListBuilder;

    selectedTagIDs: string[] = [];

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: ExpressionPickerData,
        public dialogRef: MatDialogRef<ExpressionPickerComponent>,
        private _datasetService: DataSetService,
        private _widgetDataService: WidgetRegionDataService,
        private _exprService: DataExpressionService,
        private _moduleService: DataModuleService,
        private _rgbMixService: RGBMixConfigService,
        private _authService: AuthenticationService,
        public dialog: MatDialog
    )
    {
        super();
    }

    ngOnInit()
    {
        if(this.data.showModules)
        {
            this._moduleService.refresh();
        }
        this._listBuilder = new ExpressionListBuilder(true, ["%"], false, false, this.data.showRGBMixes, this.data.showAnomalyExpressions, this._exprService, this._authService);

        this.dialogRef.backdropClick().subscribe(
            ()=>
            {
                // We want "click away" to mean Apply
                this.onOK();
            }
        );

        if(this.data.singleSelection)
        {
            this.activeIcon="assets/button-icons/radio-on.svg";
            this.inactiveIcon="assets/button-icons/radio-off.svg";
        }

        // Save the list of visible IDs to start us off
        this._activeIDs = new Set<string>(Array.from(this.data.activeExpressionIDs));

        // Open whatever category we're showing:
        for(let id of this.data.activeExpressionIDs)
        {
            if(DataExpressionId.getPredefinedQuantExpressionElement(id))
            {
                this.headerSectionsOpen.add(this.elementsHeaderName);
            }
            else if(
                id == DataExpressionId.predefinedHeightZDataExpression ||
                id == DataExpressionId.predefinedRoughnessDataExpression ||
                id == DataExpressionId.predefinedDiffractionCountDataExpression
            )
            {
                this.headerSectionsOpen.add(this.anomalyHeaderName);
            }
            else if(RGBMixConfigService.isRGBMixID(id))
            {
                this.headerSectionsOpen.add(this.rgbMixHeaderName);
            }
            else if(DataExpressionId.getPredefinedPseudoIntensityExpressionElement(id))
            {
                this.headerSectionsOpen.add(this.pseudoIntensityHeaderName);
            }
            else
            {
                this.headerSectionsOpen.add(this.expressionsHeaderName);
            }
        }
        

        // Now subscribe for data we need, process when all have arrived
        let all$ = makeDataForExpressionList(
            this._datasetService,
            this._widgetDataService,
            this._exprService,
            this.data.showRGBMixes ? this._rgbMixService : null
        );
        this._subs.add(all$.subscribe(
            (data: unknown[])=>
            {
                this._listBuilder.notifyDataArrived(
                    (data[0] as DataSet).getPseudoIntensityElementsList(),
                    data[1] as QuantificationLayer,
                    this._exprService.getExpressions(),
                    this._rgbMixService.getRGBMixes()
                );

                // All have arrived, the taps above would've saved their contents in a way that we like, so
                // now we can regenerate our item list
                this.regenerateItemList();
            }
        ));
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    get title(): string 
    {
        return this.data.title;
    }

    private regenerateItemList(): void
    {
        this.items = this._listBuilder.makeExpressionList(
            this.headerSectionsOpen,
            this._activeIDs,
            new Set<string>(),
            this._filterText,
            this._filteredAuthors,
            this.selectedTagIDs,
            false, // We never show the exploratory RGB mix item
            (source: DataExpression|RGBMix): LocationDataLayerProperties=>
            {
                let layer = new LocationDataLayerPropertiesWithVisibility(source.id, source.name, source.id, source);
                if(this._selectAllFiltered)
                {
                    if(this.isLayerFiltered(layer, this._filterText, this._filteredAuthors, this.selectedTagIDs))
                    {
                        this._activeIDs.add(source.id);
                        layer.visible = true;
                    }
                    else
                    {
                        this._activeIDs.delete(source.id);
                        layer.visible = false;
                    }
                }
                else
                {
                    layer.visible = (this._activeIDs.has(source.id));
                }
                return layer;
            }
        );

        this.authors = this._listBuilder.getAuthors();
    }

    private isLayerFiltered(layer: LocationDataLayerProperties, filterText: string, filteredAuthors: string[], selectedTagIDs: string[]): boolean
    {
        let upperCaseFilter = filterText.toUpperCase();
        if(upperCaseFilter.length > 0)
        {
            let upperName = layer.source.name.toUpperCase();
            if(upperName.indexOf(upperCaseFilter) === -1)
            {
                // Does not contain the filter text, so don't show it
                return false;
            }
        }

        if(filteredAuthors && filteredAuthors.length > 0)
        {
            let upperAuthor = layer?.source?.creator?.user_id.toUpperCase();
            if(!filteredAuthors.map(author => author.toUpperCase()).includes(upperAuthor))
            {
                // Was not authored by one of the authors in the filter list
                return false;
            }
        }

        if(selectedTagIDs && selectedTagIDs.length > 0)
        {
            let tagIDs = layer?.source?.tags;
            if(!tagIDs || !selectedTagIDs.every(tag => tagIDs.includes(tag)))
            {
                // Was not tagged with one of the tags in the filter list
                return false;
            }
        }

        return true;
    }

    get isAllFilteredSelected(): boolean
    {
        return this._selectAllFiltered;
    }
    onSelectAllFiltered(): void
    {
        this._selectAllFiltered = !this._selectAllFiltered;
        this._activeIDs.clear();

        this.regenerateItemList();
    }

    get authors(): ObjectCreator[]
    {
        return this._authors;
    }

    set authors(authors: ObjectCreator[])
    {
        this._authors = authors;
    }

    get authorsTooltip(): string
    {
        let authorNames = this._authors.filter((author) => this._filteredAuthors.includes(author.user_id)).map((author) => author.name);
        return this._filteredAuthors.length > 0 ? `Authors:\n${authorNames.join("\n")}` : "No Authors Selected";
    }

    get filteredAuthors(): string[]
    {
        return this._filteredAuthors;
    }

    set filteredAuthors(authors: string[])
    {
        this._filteredAuthors = authors;

        this.regenerateItemList();
    }


    onTagSelectionChanged(tagIDs: string[]): void
    {
        this.selectedTagIDs = tagIDs;
        this.regenerateItemList();
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
        this.regenerateItemList();
    }

    onLayerImmediateSelection(event: LayerVisibilityChange): void
    {
        this.onLayerVisibilityChange(event);
        this.onOK();
    }

    onLayerVisibilityChange(event: LayerVisibilityChange): void
    {
        // We handle this by saving the ID in our list of "active" ids, if it's marked visible...
        if(event.visible)
        {
            if(this.data.singleSelection)
            {
                this._activeIDs.clear();
            }
            this._activeIDs.add(event.layerID);
        }
        else
        {
            this._activeIDs.delete(event.layerID);
            this._selectAllFiltered = false;
        }

        this.regenerateItemList();
    }

    // Compares and finds a matching expression ID (from the active expression ID list), not comparing
    // detector. This way we can fish out an element expression (and its detector) when building our list
    // because we only know what elements to loop through
    private getActiveElementExpression(id: string): string
    {
        for(let activeId of this._activeIDs)
        {
            let activeIdNoDet = DataExpressionId.getExpressionWithoutDetector(activeId);
            if(activeIdNoDet == id)
            {
                return activeId;
            }
        }

        return "";
    }

    onFilterExpressions(filter: string)
    {
        this._filterText = filter;
        this.regenerateItemList();
    }

    onAddExpression(): void
    {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.panelClass = "panel";
        dialogConfig.disableClose = true;
        //dialogConfig.backdropClass = "panel";

        let blankExpr = new DataExpression("", "", "", EXPR_LANGUAGE_LUA, "", false, null, 0, 0, [], [], null);
        dialogConfig.data = new ExpressionEditorConfig(blankExpr, true);

        const dialogRef = this.dialog.open(ExpressionEditorComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (dlgResult: ExpressionEditorConfig)=>
            {
                if(!dlgResult)
                {
                    // User probably cancelled
                }
                else
                {
                    this._exprService.add(dlgResult.expr.name, dlgResult.expr.sourceCode, blankExpr.sourceLanguage, dlgResult.expr.comments).subscribe(
                        (response)=>
                        {
                            // Make sure all objects are valid and check if we want to apply this expression immediately
                            if(dlgResult && dlgResult.applyNow && response && typeof response === "object")
                            {
                                if(this.data.singleSelection)
                                {
                                    this._activeIDs.clear();
                                }

                                // The response is the whole expression list, so we need to narrow it down to just our expression to get the assigned ID
                                let matchingIDs = Object.entries(response).filter(([, expression]) => expression.name === dlgResult.expr.name && expression.sourceCode === dlgResult.expr.sourceCode).map(([layerID]) => layerID);

                                // If we matched more or less than 1 expression, something went wrong so we're not going to close the picker
                                if(matchingIDs.length === 1) 
                                {
                                    this._activeIDs.add(matchingIDs[0]);
                                    this.onOK();
                                }
                                else 
                                {
                                    console.error(`Failed to find expression ID for ${dlgResult.expr.name} in response:`, response);
                                }
                            }
                        },
                        (err)=>
                        {
                            alert("Failed to add data expression: "+dlgResult.expr.name);
                        }
                    );
                }
            },
            (err)=>
            {
                console.error(err);
            }
        );
    }

    onOK()
    {
        this.dialogRef.close(Array.from(this._activeIDs));
    }

    onCancel()
    {
        this.dialogRef.close(null);
    }
}
