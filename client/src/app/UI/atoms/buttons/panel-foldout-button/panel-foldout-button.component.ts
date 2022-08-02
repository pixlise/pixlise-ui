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

import { CdkOverlayOrigin, ConnectionPositionPair, HorizontalConnectionPos, Overlay, OverlayConfig, OverlayRef, VerticalConnectionPos } from "@angular/cdk/overlay";
import { ComponentPortal } from "@angular/cdk/portal";
import { Component, InjectionToken, Injector, Input, OnInit, ViewChild, ViewContainerRef } from "@angular/core";
// Possible classes of panels that can be opened
import { QuantSelectorPanelComponent } from "src/app/UI/quantification-selector/quant-selector-panel/quant-selector-panel.component";




// The token we use to pass data to anything that is shown as a fold-out panel child
export const PANEL_CHILD_DATA = new InjectionToken<{}>("PANEL_CHILD_DATA");

export enum PanelFoldOutDirection
{
    LEFT="LEFT",
    RIGHT="RIGHT",
    UP="UP",
    DOWN="DOWN"
}

@Component({
    selector: "panel-foldout-button",
    templateUrl: "./panel-foldout-button.component.html",
    styleUrls: ["./panel-foldout-button.component.scss"]
})
export class PanelFoldoutButtonComponent implements OnInit
{
    @Input() foldOutDirection: string = PanelFoldOutDirection.DOWN;

    @Input() overlayPanelClass: string = ""; // Must be 1 of the supported classes, see ngOnInit

    @Input() originX: HorizontalConnectionPos = "end";
    @Input() originY: VerticalConnectionPos = "bottom";
    @Input() overlayX: HorizontalConnectionPos = "start";
    @Input() overlayY: VerticalConnectionPos = "bottom";
    @Input() offsetX: number = 0;
    @Input() offsetY: number = 0;

    @Input() closeIfClickedBackground: boolean = false;

    @Input() dataForPanel: any = "";

    @ViewChild(CdkOverlayOrigin) _overlayOrigin: CdkOverlayOrigin;

    private _overlayRef: OverlayRef;

    constructor(
        public overlay: Overlay,
        public viewContainerRef: ViewContainerRef,
        private injector: Injector
    )
    {
    }

    ngOnInit()
    {
    }

    ngOnDestroy()
    {
        this.hidePanel();
    }

    onClickTogglePanel(): void
    {
        if(this._overlayRef)
        {
            this.hidePanel();
        }
        else
        {
            this.showPanel();
        }
    }
    /* Deprecated as of Angular 10
    createInjector(data: any, overlayRef: OverlayRef): PortalInjector
    {

        const injectorTokens = new WeakMap();
        injectorTokens.set(OverlayRef, overlayRef);
        injectorTokens.set(PANEL_CHILD_DATA, data);

        return new PortalInjector(this.injector, injectorTokens);
    }
*/

    private hidePanel(): void
    {
        if(!this._overlayRef)
        {
            return;
        }

        this._overlayRef.detach();
        this.panelHidden();
    }

    private panelHidden(): void
    {
        this._overlayRef = null;
        //this._buttonCaret = this.getCaretForDirection(PanelFoldOutDirection[this.foldOutDirection]);
    }

    private showPanel(): void
    {
        if(this._overlayRef)
        {
            return;
        }
        
        const strategy = this.overlay.position().flexibleConnectedTo(this._overlayOrigin.elementRef);

        const positions = [
            new ConnectionPositionPair(
                {
                    originX: this.originX,
                    originY: this.originY
                },
                {
                    overlayX: this.overlayX,
                    overlayY: this.overlayY
                },
                this.offsetX, // Offset X
                this.offsetY  // Offset Y
            )
        ];
        strategy.withPositions(positions);
        strategy.withPush(false);

        const config = new OverlayConfig(
            {
                positionStrategy: strategy,
                // Other strategies are .noop(), .reposition(), or .close()
                scrollStrategy: this.overlay.scrollStrategies.reposition(),
                hasBackdrop: this.closeIfClickedBackground,
                // TODO: make backdrop a transparent colour???
                backdropClass: "empty-overlay-backdrop",
            }
        );

        this._overlayRef = this.overlay.create(config);

        let inj = Injector.create(
            {
                parent: this.injector,
                providers: [
                    { provide: OverlayRef, useValue: this._overlayRef },
                    { provide: PANEL_CHILD_DATA, useValue: this.dataForPanel },
                ]
            }
        );

        let attachment = new ComponentPortal(
            this.getFoldOutPanelClass(),
            this.viewContainerRef,
            inj
        );

        this._overlayRef.attach(attachment);

        // If required, set up so we close if user clicks our background
        if(this.closeIfClickedBackground)
        {
            this._overlayRef.backdropClick().subscribe((event)=>
            {
                this.hidePanel();
            });
        }

        // If overlay closes itself we wanna know
        this._overlayRef.detachments().subscribe(() => this.panelHidden());

        //this._buttonCaret = this.getCaretForDirection(this.getOppositeDirection(PanelFoldOutDirection[this.foldOutDirection]));
    }

    private getFoldOutPanelClass(): any
    {
    // TODO: Find a better way to do this!
        if(this.overlayPanelClass == "QuantSelectorPanelComponent")
        {
            return QuantSelectorPanelComponent;
        }

        // Dunno??
        throw new Error("Unknown fold out panel class: "+this.overlayPanelClass);
    }
    /*
    private getCaretForDirection(dir: PanelFoldOutDirection): string
    {
        let result = UNICODE_CARET_LEFT;

        // Decide what the default caret is
        switch(dir)
        {
        //case PanelFoldOutDirection.LEFT:
        //    result = UNICODE_CARET_LEFT;
        //    break;
        case PanelFoldOutDirection.RIGHT:
            result = UNICODE_CARET_RIGHT;
            break;
        case PanelFoldOutDirection.UP:
            result = UNICODE_CARET_UP;
            break;
        case PanelFoldOutDirection.DOWN:
            result = UNICODE_CARET_DOWN;
            break;
        }
        return result;
    }
*/
    private getOppositeDirection(dir: PanelFoldOutDirection): PanelFoldOutDirection
    {
        let result = PanelFoldOutDirection.RIGHT;

        switch (dir)
        {
        //case PanelFoldOutDirection.LEFT:
        //    result = PanelFoldOutDirection.RIGHT;
        //    break;
        case PanelFoldOutDirection.RIGHT:
            result = PanelFoldOutDirection.LEFT;
            break;
        case PanelFoldOutDirection.UP:
            result = PanelFoldOutDirection.DOWN;
            break;
        case PanelFoldOutDirection.DOWN:
            result = PanelFoldOutDirection.UP;
            break;
        }
        return result;
    }
}
