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

import { CdkOverlayOrigin, ConnectionPositionPair, Overlay } from "@angular/cdk/overlay";
import { Component, Injector, Input, OnDestroy, OnInit, ViewChild, ViewContainerRef } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { NavigationEnd, ResolveEnd, Router } from "@angular/router";
import { Subscription } from "rxjs";
import { AuthenticationService } from "src/app/services/authentication.service";
import { DataSetService } from "src/app/services/data-set.service";
import { ExportDataService } from "src/app/services/export-data.service";
import { UserMenuPanelComponent } from "src/app/UI/user-menu-panel/user-menu-panel.component";
import { OverlayHost } from "src/app/utils/overlay-host";
import { EnvConfigurationInitService } from "src/app/services/env-configuration-init.service";
import { MatDialog, MatDialogConfig, MatDialogRef } from "@angular/material/dialog";
import { AnnotationEditorComponent, AnnotationEditorData, AnnotationTool } from "../annotation-editor/annotation-editor.component";
import { FullScreenAnnotationItem } from "../annotation-editor/annotation-display/annotation-display.component";
import { ViewStateService } from "src/app/services/view-state.service";
import { ExportDataDialogComponent } from "src/app/UI/atoms/export-data-dialog/export-data-dialog.component";
import { ExportDataChoice, ExportDataConfig } from "src/app/UI/atoms/export-data-dialog/export-models";


class TabNav
{
    constructor(public label: string, public url: string, public enabled: boolean, public active: boolean = false)
    {
    }

    get cssClass(): string
    {
        if(this.active)
        {
            return "nav-link-active";
        }
        if(!this.enabled)
        {
            return "nav-link-disabled";
        }
        return "nav-link-normal";
    }
}

@Component({
    selector: "app-toolbar",
    templateUrl: "./toolbar.component.html",
    styleUrls: ["./toolbar.component.scss"]
})
export class ToolbarComponent implements OnInit, OnDestroy
{
    @Input() titleToShow: string = "";
    @Input() darkBackground: boolean = false;

    @ViewChild(CdkOverlayOrigin) _overlayOrigin: CdkOverlayOrigin;

    private _overlayHost: OverlayHost = null;

    private _subs = new Subscription();
    private _userPiquantConfigAllowed: boolean = false;
    private _userUserAdminAllowed: boolean = false;
    private _userPiquantJobsAllowed: boolean = false;
    
    // We want to allow all users, including public users, to export data that's visible
    private _userExportAllowed: boolean = true;

    private _isAnalysisTab: boolean = false;

    private _currTab: string = "";
    private _dataSetLoadedName = "";

    title = "";
    tabs: TabNav[] = [];
    datasetID: string = "";

    savedAnnotations: FullScreenAnnotationItem[] = [];
    annotationTool: AnnotationTool = null;
    editingAnnotationIndex: number = -1;

    annotationsVisible: boolean = false;
    editAnnotationsOpen: boolean = false;
    annotationEditorDialogRef: MatDialogRef<AnnotationEditorComponent, MatDialogConfig> = null;

    isPublicUser: boolean = false;

    constructor(
        private router: Router,
        private _datasetService: DataSetService,
        private _authService: AuthenticationService,
        private _exportService: ExportDataService,
        private _viewStateService: ViewStateService,

        private overlay: Overlay,
        private viewContainerRef: ViewContainerRef,
        private injector: Injector,
        private titleService: Title,

        public dialog: MatDialog,
    )
    {
    }

    ngOnInit()
    {
        //this.UserLoggedIn = this.authService.loggedIn;
        this.updateToolbar();

        // Set up listeners for things that can change how we display...

        // User login/logout/claims changing
        this._subs.add(this._authService.getIdTokenClaims$().subscribe(
            (claims)=>
            {
                this._userPiquantConfigAllowed = AuthenticationService.hasPermissionSet(claims, AuthenticationService.permissionEditPiquantConfig);
                this._userUserAdminAllowed = AuthenticationService.hasPermissionSet(claims, AuthenticationService.permissionViewUserRoles);
                this._userPiquantJobsAllowed = AuthenticationService.hasPermissionSet(claims, AuthenticationService.permissionViewPiquantJobs);

                this.updateToolbar();
            },
            (err)=>
            {
                this._userPiquantConfigAllowed = false;
                this._userUserAdminAllowed = false;
                this._userPiquantJobsAllowed = false;

                this.updateToolbar();
            }
        ));

        // Enables more tabs/changes title, etc
        this._subs.add(this._datasetService.dataset$.subscribe(
            (dataset)=>
            {
                if(dataset)
                {
                    this.datasetID = this._datasetService.datasetIDLoaded;

                    // If we load a dataset, we want to display the name
                    this._dataSetLoadedName = dataset.experiment.getTitle();
                    let sol = dataset.experiment.getSol();
                    if(sol)
                    {
                        this._dataSetLoadedName = "SOL-"+sol+": "+this._dataSetLoadedName;
                    }
                    this.updateToolbar();
                }
                else
                {
                    this.datasetID = "";
                    this._dataSetLoadedName = "";
                    this.updateToolbar();
                }
            },
            (err)=>
            {
                this.updateToolbar();
            }
        ));

        // If user changes tabs, etc, we want to know
        this._subs.add(this.router.events.subscribe(
            (event)=>
            {
                if(event instanceof NavigationEnd || event instanceof ResolveEnd)
                {
                    this._overlayHost.hidePanel();
                    this.updateToolbar();
                }
            }
        ));

        this._subs.add(this._viewStateService.annotations$.subscribe(
            (annotations: FullScreenAnnotationItem[])=>
            {
                this.savedAnnotations = annotations;
            }
        ));

        this._subs.add(this._authService.isPublicUser$.subscribe(
            (isPublicUser)=>
            {
                this.isPublicUser = isPublicUser;
            }
        ));
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    ngAfterViewInit()
    {
        let userOverlayPos = [
            new ConnectionPositionPair(
                {
                    originX: "end",
                    originY: "bottom"
                },
                {
                    overlayX: "end",
                    overlayY: "top"
                },
                0, // Offset X
                0  // Offset Y
            )
        ];

        this._overlayHost = new OverlayHost(
            this.overlay,
            this.viewContainerRef,
            this.injector,
            this._overlayOrigin,
            UserMenuPanelComponent,
            userOverlayPos,
            true
        );
    }

    get showExport(): boolean
    {
        // titleToShow being non-empty means we're not on a dataset tab, eg Admin.
        // Title being blank means dataset not yet loaded
        return this.titleToShow.length <= 0 && this.title.length > 0 && this._userExportAllowed && (![""].includes(this._currTab));
    }

    get showTitle(): boolean
    {
        return this.title.length > 0 && (![""].includes(this._currTab));
    }

    get showViewCapture(): boolean
    {
        return this._isAnalysisTab;
    }

    get showQuantPicker(): boolean
    {
        return (this._currTab == "Analysis" || this._currTab == "Element Maps");
    }

    private updateToolbar(): void
    {
        // Title to show overrides the dataset name
        this.title = this.titleToShow ? this.titleToShow : this._dataSetLoadedName;

        // Work out what URL we're on
        const url = this.router.url;

        // Build list of tabs
        if(this._dataSetLoadedName.length <= 0)
        {
            this.tabs = [
                //new TabNav('Help', 'help', true),
                new TabNav("Datasets", "datasets", true)
            ];
        }
        else
        {
            const datasetPrefix = "dataset/"+this.datasetID;

            this.tabs = [
                //new TabNav('Help', 'help', true),
                new TabNav("Datasets", "datasets", true),
                new TabNav("Analysis", datasetPrefix+"/analysis", true),
            ];
            // Only enabling maps tab if a quant is loaded
            // TODO: Hide maps tap if no quants or whatever... this all changed when multiple quantifications came in, for now just enabling it always
            this.tabs.push(new TabNav("Element Maps", datasetPrefix+"/maps", true));
            if(!this.isPublicUser)
            {
                this.tabs.push(new TabNav("Quant Tracker", datasetPrefix+"/quant-logs", true));
            }
        }

        if(this._userPiquantConfigAllowed)
        {
            this.tabs.push(new TabNav("Piquant", "piquant", true));
        }

        if(this._userUserAdminAllowed || this._userPiquantJobsAllowed)
        {
            this.tabs.push(new TabNav("Admin", "admin", true));
        }

        // Mark the right tab as being active
        this._currTab = "";
        for(let c = 0; c < this.tabs.length; c++)
        {
            this.tabs[c].active = url.indexOf("/"+this.tabs[c].url) > -1;

            if(this.tabs[c].active)
            {
                this._currTab = this.tabs[c].label;
            }
        }

        // Set the doc title to show the tab we're on
        this.titleService.setTitle("PIXLISE" + (this._currTab.length > 0 ? (" - "+this._currTab) : ""));

        // We only show saving of view state on analysis tab
        this._isAnalysisTab = (this._currTab == "Analysis");
    }

    onUserMenu(): void
    {
        this._overlayHost.showPanel();
    }

    get isLoggedIn(): boolean
    {
        return this._authService.loggedIn;
    }

    onNavigate(tab: TabNav, event): void
    {
        event.preventDefault();

        if(!tab.enabled)
        {
            return;
        }
        this.router.navigateByUrl("/"+tab.url);
    }

    onAbout(): void
    {
        this.router.navigateByUrl("/public/about-us");
    }

    onExport(): void
    {
        let choices = [
            new ExportDataChoice("raw-spectra", "Raw Spectral Data Per PMC .csv (and bulk .msa)", true),
            new ExportDataChoice("quant-map-csv", "PIQUANT Quantification map .csv", true),
            //new ExportDataChoice('quant-map-tif', 'Floating point map images .tif', false),
            new ExportDataChoice("beam-locations", "Beam Locations .csv", true),
            // new ExportDataChoice("context-image", "All context images with PMCs", false),
            new ExportDataChoice("unquantified-weight", "Unquantified Weight Percent .csv", true),
            new ExportDataChoice("ui-diffraction-peak", "Anomaly Features .csv", true),
            new ExportDataChoice("rois", "ROI PMC Membership List .csv", false, false),
            new ExportDataChoice("ui-roi-expressions", "ROI Expression Values .csv", false, false),
        ];

        const dialogConfig = new MatDialogConfig();

        //dialogConfig.disableClose = true;
        //dialogConfig.autoFocus = true;
        //dialogConfig.width = '1200px';
        dialogConfig.data = new ExportDataConfig("PIXLISE Data", "", true, true, true, false, choices, this._exportService);

        const dialogRef = this.dialog.open(ExportDataDialogComponent, dialogConfig);
        //dialogRef.afterClosed().subscribe...;
    }

    onToggleAnnotations(active: boolean): void
    {
        this.annotationsVisible = active;
    }

    onEditAnnotations(): void
    {
        if(this.editAnnotationsOpen)
        {
            return;
        }

        this.annotationsVisible = true;
        this.editAnnotationsOpen = true;

        const dialogConfig = new MatDialogConfig();
        dialogConfig.hasBackdrop = false;
        dialogConfig.data = new AnnotationEditorData(this.datasetID);
        this.annotationEditorDialogRef = this.dialog.open(AnnotationEditorComponent, dialogConfig);

        this.annotationEditorDialogRef.componentInstance.onActiveTool.subscribe(
            (activeTool: AnnotationTool)=>
            {
                if(this.annotationTool && this.annotationTool.tool !== activeTool.tool)
                {
                    this.editingAnnotationIndex = -1;
                }
                else if(this.editingAnnotationIndex >= 0)
                {
                    this.savedAnnotations[this.editingAnnotationIndex].colour = activeTool.colour;
                    this.savedAnnotations[this.editingAnnotationIndex].fontSize = activeTool.fontSize;

                    this._viewStateService.saveAnnotations(this.savedAnnotations);
                }

                this.annotationTool = activeTool;
            }
        );

        this.annotationEditorDialogRef.componentInstance.onBulkAction.subscribe(
            (action: string)=>
            {
                if(action === "clear")
                {
                    this.savedAnnotations = [];
                    this._viewStateService.saveAnnotations(this.savedAnnotations);
                    this.editingAnnotationIndex = -1;
                }
                else if(action === "save-workspace")
                {
                    this.annotationEditorDialogRef.componentInstance.openSaveWorkspaceDialog(this.savedAnnotations);
                }
            }
        );

        this.annotationEditorDialogRef.afterClosed().subscribe(
            ()=>
            {
                this.editAnnotationsOpen = false;
                this.editingAnnotationIndex = -1;
            }
        );
    }

    onNewAnnotation(newAnnotation: FullScreenAnnotationItem)
    {
        this.savedAnnotations.push(newAnnotation);
        this._viewStateService.saveAnnotations(this.savedAnnotations);
    }

    onEditAnnotation({ id, annotation }: { id: number; annotation: FullScreenAnnotationItem; })
    {
        this.savedAnnotations[id] = annotation;
        this._viewStateService.saveAnnotations(this.savedAnnotations);
    }

    onDeleteAnnotation(deleteIndex: number)
    {
        this.savedAnnotations = this.savedAnnotations.filter((_, i) => deleteIndex !== i);
        this._viewStateService.saveAnnotations(this.savedAnnotations);
        this.editingAnnotationIndex = -1;
    }

    onAnnotationEditIndex(index: number)
    {
        this.editingAnnotationIndex = index;
    }

    onAnnotationToolChange(tool: AnnotationTool): void
    {
        this.annotationTool = tool;
        if(this.annotationEditorDialogRef && this.annotationEditorDialogRef.componentInstance)
        {
            this.annotationEditorDialogRef.componentInstance.selectedTool = tool.tool;
            this.annotationEditorDialogRef.componentInstance.selectedColour = tool.colour;
            this.annotationEditorDialogRef.componentInstance.fontSize = tool.fontSize;
        }
    }

    get discussLink(): string
    {
        return "https://discuss."+EnvConfigurationInitService.appConfig.appDomain;
    }
}
