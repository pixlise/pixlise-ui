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

import { CdkOverlayOrigin, ConnectionPositionPair, Overlay, OverlayConfig, OverlayRef } from "@angular/cdk/overlay";
import { ComponentPortal, PortalInjector } from "@angular/cdk/portal";
import { Injector, ViewContainerRef } from "@angular/core";


// Class to open a dialog relative to some component. This needs the variables in the constructor, and they should come
// as fields injected into the component constructor:
// - public overlay: Overlay
// - public viewContainerRef: ViewContainerRef
// - private injector: Injector
// - @ViewChild(CdkOverlayOrigin) _overlayOrigin: CdkOverlayOrigin;
// - panelComponentClassType - the component class type (eg MyDialogComponent)
// - positions: Array of ConnectionPositionPair containing originX/Y, overlayX/Y and offsetX/Y
// - closeIfClickedBackground - as the name says
// - backdropClass - css class name of backdrop

export class OverlayHost
{
    private _overlayRef: OverlayRef;

    constructor(
        private overlay: Overlay,
        private viewContainerRef: ViewContainerRef,
        private injector: Injector,
        private overlayOrigin: CdkOverlayOrigin,
        private panelComponentClassType: any,
        private positions: ConnectionPositionPair[],
        private closeIfClickedBackground: boolean = false,
        private backdropClass: string = "empty-overlay-backdrop"
    )
    {
    }

    showPanel(): void
    {
        if(this._overlayRef)
        {
            return;
        }
        
        const strategy = this.overlay.position().flexibleConnectedTo(this.overlayOrigin.elementRef);

        strategy.withPositions(this.positions);
        strategy.withPush(false);

        const config = new OverlayConfig(
            {
                positionStrategy: strategy,
                // Other strategies are .noop(), .reposition(), or .close()
                scrollStrategy: this.overlay.scrollStrategies.reposition(),
                hasBackdrop: this.closeIfClickedBackground,
                // TODO: make backdrop a transparent colour???
                backdropClass: this.backdropClass,
            }
        );

        this._overlayRef = this.overlay.create(config);
        this._overlayRef.attach(
            new ComponentPortal(
                this.panelComponentClassType,
                this.viewContainerRef,
                this.createInjector({ data: "No Data" }, this._overlayRef)
            )
        );

        // If required, set up so we close if user clicks our background
        if(this.closeIfClickedBackground)
        {
            this._overlayRef.backdropClick().subscribe(
                (event)=>
                {
                    this.hidePanel();
                }
            );
        }

        // If overlay closes itself we wanna know
        this._overlayRef.detachments().subscribe(
            ()=>
            {
                this.panelHidden();
            }
        );
    }

    private createInjector(data: any, overlayRef: OverlayRef): PortalInjector
    {
        const injectorTokens = new WeakMap();
        injectorTokens.set(OverlayRef, overlayRef);
        // Not passing in data
        //        injectorTokens.set(???, data);

        return new PortalInjector(this.injector, injectorTokens);
    }

    hidePanel(): void
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
    }
}

