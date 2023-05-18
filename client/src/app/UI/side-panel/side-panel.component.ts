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

import { Component, ComponentFactoryResolver, ComponentRef, OnInit, ViewChild, ViewContainerRef } from "@angular/core";
import { rgbuPlotWidgetState, ViewStateService } from "src/app/services/view-state.service";
import { IconButtonState } from "src/app/UI/atoms/buttons/icon-button/icon-button.component";
import { QuantificationCombineComponent } from "src/app/UI/side-panel/tabs/quantification-combine/quantification-combine.component";
import { DiffractionComponent } from "./tabs/diffraction/diffraction.component";
import { ROIComponent } from "./tabs/roi/roi.component";
import { MistROIComponent } from "./tabs/mist-roi/mist-roi.component";
import { RoughnessComponent } from "./tabs/roughness/roughness.component";
import { SelectionComponent } from "./tabs/selection/selection.component";
import { ViewStateCollectionsComponent } from "./tabs/view-state-collections/view-state-collections.component";
import { WorkspacesComponent } from "./tabs/workspaces/workspaces.component";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { ViewStateUploadComponent, ViewStateUploadData } from "./viewstate-upload/viewstate-upload.component";
import { AuthenticationService } from "src/app/services/authentication.service";
import { Subscription } from "rxjs";



@Component({
    selector: "side-panel",
    templateUrl: "./side-panel.component.html",
    styleUrls: ["./side-panel.component.scss"]
})
export class SidePanelComponent implements OnInit
{
    @ViewChild("tabHostTop", { read: ViewContainerRef }) tabHostTop;
    @ViewChild("tabHostBottom", { read: ViewContainerRef }) tabHostBottom;

    private _noneTab: string = "None";

    private _WorkspacesTab: string = "Workspaces";
    private _CollectionsTab: string = "Collections";
    private _ROITab: string = "Regions of Interest";
    private _MistROITab: string = "MIST ROIs";
    private _SelectionTab: string = "Selection";
    private _DiffractionTab: string = "Diffraction";
    private _RoughnessTab: string = "Roughness";
    private _MultiQuantTab: string = "Multi-Quant";
    
    private _XRFView: string = "XRF View";
    private _RGBUView: string = "RGBU View";

    private _AdminImportViewState: string = "Import View State";

    tabs: string[] = [
        this._WorkspacesTab,
        this._CollectionsTab,
        this._ROITab,
        this._MistROITab,
        this._SelectionTab,
        this._DiffractionTab,
        this._RoughnessTab,
        this._MultiQuantTab,
    ];

    // These tabs are hidden because all relevant actions are blocked by API for public user
    private _tabsHiddenFromPublic: string[] = [
        this._MultiQuantTab
    ];

    shortcuts: string[] = [
        this._XRFView,
        this._RGBUView
    ];

    adminButtons: string[] = [
        this._AdminImportViewState
    ];

    tabsWithNone: string[] = [...this.tabs, this._noneTab];

    private _tabsIcons: string[] = [
        "assets/icons/workspaces.svg",
        "assets/icons/collections.svg",
        "assets/icons/roi.svg",
        "assets/icons/mist-roi.svg",
        "assets/icons/selection.svg",
        "assets/icons/diffraction.svg",
        "assets/icons/roughness.svg",
        "assets/icons/multiquant.svg",
    ];

    private _viewIcons: string[] = [
        "assets/icons/xrf-symbol.svg",
        "assets/icons/rgbu-symbol.svg"
    ];

    private _adminIcons: string[] = [
        "assets/button-icons/upload.svg",
    ];

    private _tabClasses: any[] = [
        WorkspacesComponent,
        ViewStateCollectionsComponent,
        ROIComponent,
        MistROIComponent,
        SelectionComponent,
        DiffractionComponent,
        RoughnessComponent,
        QuantificationCombineComponent
    ];

    private _activeTabTop: string = "";
    private _activeTabBottom: string = "";

    private _tabRefTop: ComponentRef<any> = null;
    private _tabRefBottom: ComponentRef<any> = null;

    private _showShared: boolean = false;
    private _showSearch: boolean = false;

    private _topPercent: number = 50;

    private _subs = new Subscription();

    isPublicUser: boolean = false;
    private _userUserAdminAllowed: boolean = false;

    constructor(
        private _componentFactoryResolver: ComponentFactoryResolver,
        private _viewStateService: ViewStateService,
        private _dialog: MatDialog,
        private _authService: AuthenticationService,
    )
    {
    }

    ngOnInit(): void
    {
        this._subs.add(this._authService.getIdTokenClaims$().subscribe(
            (claims)=>
            {
                this._userUserAdminAllowed = AuthenticationService.hasPermissionSet(claims, AuthenticationService.permissionViewUserRoles);
            },
            (err)=>
            {
                this._userUserAdminAllowed = false;
            }
        ));

        this._subs.add(this._authService.isPublicUser$.subscribe((isPublicUser) => 
        {
            this.isPublicUser = isPublicUser;
            if(this.isPublicUser)
            {
                this.tabs = this.tabs.filter(tab => !this._tabsHiddenFromPublic.includes(tab));
            }
        }));
    }

    ngAfterViewInit(): void
    {
        this.activeTabTop = this.tabs[0];
        this.activeTabBottom = this._noneTab;
    }

    ngAfterViewChecked(): void
    {
        // Reset in case it was never shown
        if(this._viewStateService.showSidePanel)
        {
            if(!this._tabRefTop)
            {
                this.updateActiveTabTop();
            }
            if(!this._tabRefBottom && this.activeTabBottom != this._noneTab)
            {
                this.updateActiveTabBottom();
            }
        }
    }

    // Component switching inspired by: https://stackblitz.com/edit/angular-ygz3jg?file=app%2Fdcl-wrapper.component.ts
    ngOnDestroy()
    {
        this.clearTabTop();
        this.clearTabBottom();
    }

    private clearTabTop(): void
    {
        if(this._tabRefTop)
        {
            this._tabRefTop.changeDetectorRef.detach();
            this._tabRefTop.destroy();
            this._tabRefTop = null;
        }
    }

    private clearTabBottom(): void
    {
        if(this._tabRefBottom)
        {
            this._tabRefBottom.changeDetectorRef.detach();
            this._tabRefBottom.destroy();
            this._tabRefBottom = null;
        }
    }

    private updateActiveTabTop(): void
    {
        // Find this index
        let idx = this.tabs.indexOf(this._activeTabTop);
        if(idx >= 0)
        {
            this.clearTabTop();

            if(this.tabHostTop)
            {
                let factory = this._componentFactoryResolver.resolveComponentFactory(this._tabClasses[idx]);
                this._tabRefTop = this.tabHostTop.createComponent(factory);

                if(this.showSharedButton)
                {
                    this._tabRefTop.instance.showShared = this._showShared;
                }

                if(this.showSearchButton)
                {
                    this._tabRefTop.instance.showSearch = this._showSearch;
                }

                this._tabRefTop.changeDetectorRef.detectChanges();
            }
        }
    }

    private updateActiveTabBottom(): void
    {
        // Find this index
        let idx = this.tabsWithNone.indexOf(this._activeTabBottom);
        if(idx >= 0)
        {
            this.clearTabBottom();

            // Bottom may be set to None!
            let klass = this._tabClasses[idx];
            if(this.tabHostBottom && klass)
            {
                let factory = this._componentFactoryResolver.resolveComponentFactory(klass);
                this._tabRefBottom = this.tabHostBottom.createComponent(factory);
                this._tabRefBottom.changeDetectorRef.detectChanges();
            }
        }
    }

    get isOpen(): boolean
    {
        return this._viewStateService.showSidePanel;
    }

    get presentationActive(): boolean
    {
        return this._viewStateService.isPresentingViewStates();
    }

    get activeTabTop(): string
    {
        return this._activeTabTop;
    }

    set activeTabTop(tab: string)
    {
        this._activeTabTop = tab;
        this.updateActiveTabTop();
    }

    get activeTabBottom(): string
    {
        return this._activeTabBottom;
    }

    set activeTabBottom(tab: string)
    {
        this._activeTabBottom = tab;
        this.updateActiveTabBottom();
    }

    private calcTopPercent(): number
    {
        let pct = this._topPercent;
        // if bottom has nothing, top is full
        if(this._activeTabBottom == this._noneTab)
        {
            pct = 100;
        }
        return pct;
    }

    get topPercent(): string
    {
        return this.calcTopPercent()+"%";
    }

    get bottomPercent(): string
    {
        return (100-this.calcTopPercent())+"%";
    }

    onOpenTab(tab: string): void
    {
        this._viewStateService.showSidePanel = true;
        this.activeTabTop = tab;
    }

    onOpenView(shortcut: string): void
    {
        if(shortcut === this._RGBUView)
        {
            // Show RGBU Plot in the underspectrum0 spot and display UV/Blue and UV/IR
            this._viewStateService.setAnalysisViewSelector("underspectrum0", ViewStateService.widgetSelectorRGBUPlot);
            this._viewStateService.setRGBUPlotState(new rgbuPlotWidgetState(
                [],
                "U","B","U","R",
                false
            ), "underspectrum0");

            // Show RGBU Plot in the underspectrum1 spot and display UV/Green and UV/IR
            this._viewStateService.setAnalysisViewSelector("underspectrum1", ViewStateService.widgetSelectorRGBUPlot);
            this._viewStateService.setRGBUPlotState(new rgbuPlotWidgetState(
                [],
                "U","G","U","R",
                false
            ), "underspectrum1");

            this._viewStateService.setAnalysisViewSelector("underspectrum2", ViewStateService.widgetSelectorRGBUViewer);
            this._viewStateService.setAnalysisViewSelector("top1", ViewStateService.widgetSelectorParallelCoordinates);
            this._viewStateService.setAnalysisViewSelector("undercontext", ViewStateService.widgetSelectorHistogram);
            this._viewStateService.showContextImageOptions = true;
        }
        else if(shortcut === this._XRFView)
        {
            this._viewStateService.setAnalysisViewSelector("underspectrum0", ViewStateService.widgetSelectorChordDiagram);
            this._viewStateService.setAnalysisViewSelector("underspectrum1", ViewStateService.widgetSelectorBinaryPlot);
            this._viewStateService.setAnalysisViewSelector("underspectrum2", ViewStateService.widgetSelectorTernaryPlot);
            this._viewStateService.setAnalysisViewSelector("top1", ViewStateService.widgetSelectorSpectrum);
            this._viewStateService.setAnalysisViewSelector("undercontext", ViewStateService.widgetSelectorHistogram);
        }
    }

    onAdminAction(adminBtn: string): void
    {
        if(adminBtn === this._AdminImportViewState)
        {
            const dialogConfig = new MatDialogConfig();

            dialogConfig.data = new ViewStateUploadData();
            const dialogRef = this._dialog.open(ViewStateUploadComponent, dialogConfig);

            dialogRef.afterClosed().subscribe(
                (response: any)=>
                {
                    console.log(response);
                }
            );
        }
    }

    tabIcon(tab: string): string
    {
        let idx = this.tabs.indexOf(tab);
        if(idx === undefined)
        {
            return "";
        }
        return this._tabsIcons[idx];
    }

    viewIcon(viewShortcut: string): string
    {
        let idx = this.shortcuts.indexOf(viewShortcut);
        if(idx === undefined)
        {
            return "";
        }
        return this._viewIcons[idx];
    }

    getAdminIcon(adminBtn: string): string
    {
        let idx = this.adminButtons.indexOf(adminBtn);
        if(idx === undefined)
        {
            return "";
        }
        return this._adminIcons[idx];
    }

    onSizePanel(): void
    {
        if(this._topPercent > 50)
        {
            this._topPercent = 0;
        }
        else if(this._topPercent == 50)
        {
            this._topPercent = 100;
        }
        else
        {
            this._topPercent = 50;
        }
    }

    get isWindows(): boolean
    {
        return navigator.userAgent.search("Windows") !== -1;
    }

    get isFirefox(): boolean
    {
        return !!navigator.userAgent.match(/firefox|fxios/i);
    }

    get toggleSidePanelTooltip(): string
    {
        let tooltip = this._viewStateService.showSidePanel ? "Hide Side Panel" : "Show Side Panel";
        let cmdOrCtrl = this.isWindows ? "Ctrl" : "Cmd";
        let altKeyName = this.isFirefox ? this.isWindows ? "+Alt" : "+Option" : "";
        return `${tooltip} (${cmdOrCtrl}${altKeyName}+B)`;
    }

    onToggleSidePanel(): void
    {
        this._viewStateService.showSidePanel = !this._viewStateService.showSidePanel;

        // NOTE: if we were not open, at this point we don't have a ViewChild ref yet. This will
        // all get updated in ngAfterViewChecked()

        // If we just closed, we can clear it
        if(!this._viewStateService.showSidePanel)
        {
            this.clearTabTop();
            this.clearTabBottom();
        }
        else
        {
            this.updateActiveTabTop();
            this.updateActiveTabBottom();
        }
    }

    get bottomIsNoneTab(): boolean
    {
        return this._activeTabBottom == this._noneTab;
    }

    get showSharedButton(): boolean
    {
        return ( this._activeTabTop == this._WorkspacesTab ||
            this._activeTabTop == this._CollectionsTab ||
            this._activeTabTop == this._ROITab );
    }

    get showSearchButton(): boolean
    {
        return this._activeTabTop == this._ROITab;
    }

    get showShared(): boolean
    {
        return this._showShared;
    }

    onToggleShared(): void
    {
        this._showShared = !this._showShared;
        // Also set it in the tab if needed
        this.updateActiveTabTop();
    }

    get showSearch(): boolean
    {
        return this._showSearch;
    }

    onToggleSearch(): void
    {
        this._showSearch = !this._showSearch;
        // Also set it in the tab if needed
        this.updateActiveTabTop();
    }

    onNextWorkspace(): void
    {
        if(!this._viewStateService.presentNextViewStates())
        {
            alert("The presentation has ended");
        }
    }

    onPreviousWorkspace(): void
    {
        this._viewStateService.presentPreviousViewStates();
    }

    onStopPresentation(): void
    {
        this._viewStateService.stopPresenting();
    }

    onAddToPresentation(): void
    {
        alert("Not implemented yet");
    }

    get presentationSlideIdx(): number
    {
        return this._viewStateService.presentationSlideIdx+1;
    }

    get presentationSlideCount(): number
    {
        return this._viewStateService.presentationSlideCount;
    }

    get nextButtonState(): IconButtonState
    {
        return (this._viewStateService.presentationSlideIdx+1 >= this._viewStateService.presentationSlideCount) ? IconButtonState.DISABLED : IconButtonState.ACTIVE;
    }

    get prevButtonState(): IconButtonState
    {
        return (this._viewStateService.presentationSlideIdx <= 0) ? IconButtonState.DISABLED : IconButtonState.ACTIVE;
    }

    get isAdmin(): boolean
    {
        return this._userUserAdminAllowed;
    }
}
