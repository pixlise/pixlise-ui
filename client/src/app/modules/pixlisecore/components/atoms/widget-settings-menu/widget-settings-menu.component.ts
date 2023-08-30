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
import { ComponentPortal } from "@angular/cdk/portal";
import { Component, EventEmitter, Injector, Input, OnInit, Output, TemplateRef, ViewChild, ViewContainerRef } from "@angular/core";
import { MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MenuPanelHostComponent, MenuPanelHostData } from "./menu-panel-host/menu-panel-host.component";


// Warning when using this:
//
// If we don't close the options overlay in the onClick handler for some button in it (that navigates to
// another page???) it doesn't ever seem to get cleaned up. The menu remains at the bottom of the DOM tree
// within the overlay div.
//
// Tried debugging this in Angular, tried finding references to this online, no luck and too many hours
// wasted on it already.
//
// I did find that the difference is if user closes the menu by clicking off it, overlay.js line 1204 ends
// with this._pane.children.length === 0, while if user clicks on a button and menu detachment happens due
// to ngOnDestroy the menu element remains in this._pane.children and so cleanup code is never called.
// In fact, it seems to result in some kind of endless loop in Angular/rxjs/whatever and chrome debugger
// often crashes at this point with no stack trace/reason you can look at

@Component({
    selector: "widget-settings-menu",
    templateUrl: "./widget-settings-menu.component.html",
    styleUrls: ["./widget-settings-menu.component.scss"]
})
export class WidgetSettingsMenuComponent implements OnInit {
    @ViewChild(CdkOverlayOrigin) _overlayOrigin: CdkOverlayOrigin | undefined;

    @Input() settingsDialog: TemplateRef<any> | null = null;
    @Input() overflowSection: TemplateRef<any> | null = null;
    @Input() openDirDown: boolean = true;
    @Input() noPadding: boolean = false;
    @Input() xOffset: number = 0;
    @Output() onClose = new EventEmitter();

    private _overlayRef: OverlayRef | null = null;

    constructor(
        public overlay: Overlay,
        public viewContainerRef: ViewContainerRef,
        private injector: Injector
    ) {
    }

    ngOnInit(): void {
    }

    ngOnDestroy() {
        this.hidePanel();
    }

    onToggleSettings(): void {
        if (this._overlayRef) {
            this.hidePanel();
        }
        else {
            this.showPanel();
        }
    }

    close(): void {
        this.hidePanel();
    }

    get isShowing(): boolean {
        return this._overlayRef != null;
    }

    private hidePanel(): void {
        if (!this._overlayRef) {
            return;
        }

        // Clear our var and back up so detachments subscription doesn't double up calling us
        let ref = this._overlayRef;
        this._overlayRef = null;

        let result = ref.detach();
        this.onClose.emit();
    }

    private showPanel(): void {
        if (this._overlayRef || !this._overlayOrigin || !this.settingsDialog) {
            return;
        }
        const strategy = this.overlay.position().flexibleConnectedTo(this._overlayOrigin.elementRef);

        const positions = [
            new ConnectionPositionPair(
                {
                    originX: "end",
                    originY: (this.openDirDown ? "bottom" : "top")
                },
                {
                    overlayX: "end",
                    overlayY: (this.openDirDown ? "top" : "bottom")
                },
                this.xOffset, // Offset X
                2  // Offset Y
            )
        ];

        strategy.withPositions(positions);
        strategy.withPush(false);

        const config = new OverlayConfig(
            {
                positionStrategy: strategy,
                scrollStrategy: this.overlay.scrollStrategies.reposition(),
                hasBackdrop: true,
                backdropClass: "empty-overlay-backdrop",
            }
        );

        this._overlayRef = this.overlay.create(config);

        let inj = Injector.create(
            {
                parent: this.injector,
                providers: [
                    { provide: OverlayRef, useValue: this._overlayRef },
                    { provide: MAT_DIALOG_DATA, useValue: new MenuPanelHostData(this.settingsDialog, this.overflowSection, this.noPadding) },
                ]
            }
        );

        let attachment = new ComponentPortal(
            MenuPanelHostComponent,
            this.viewContainerRef,
            inj
        );

        this._overlayRef.attach(attachment);

        // If required, set up so we close if user clicks our background
        this._overlayRef.backdropClick().subscribe(
            (event) => {
                this.hidePanel();
            }
        );
    }
}
