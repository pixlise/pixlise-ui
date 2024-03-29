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
import { ComponentRef, Injector, ViewContainerRef } from "@angular/core";

export const getInitialModalPositionRelativeToTrigger = (trigger: Element | undefined, height: number, width: number) => {
  let position = {};
  if (trigger) {
    let boundingRect = trigger.getBoundingClientRect();

    // Position the dialog in the middle of the trigger, but make sure it stays fully on screen
    let top = Math.min(boundingRect.top - height / 2, window.innerHeight - height);

    // 6px is the marginLeft of the button, 8px is the grid spacing (assuming it's not a widget all the way on the left)
    // If it is all the way on the left, we want to make sure the dialog is still fully on screen (left: 0)
    let left = Math.max(boundingRect.left - width - 6 - 8, 0);
    position = {
      top: `${top}px`,
      left: `${left}px`,
    };
  }
  return position;
};

export class OverlayHost {
  private _overlayRef?: OverlayRef;

  constructor(
    private overlay: Overlay,
    private viewContainerRef: ViewContainerRef,
    private injector: Injector,
    private overlayOrigin: CdkOverlayOrigin,
    private panelComponentClassType: any,
    private positions: ConnectionPositionPair[],
    private closeIfClickedBackground: boolean = false,
    private backdropClass: string = "empty-overlay-backdrop"
  ) {}

  get isOpen(): boolean {
    return !!this._overlayRef;
  }

  showPanel(): ComponentRef<any> | null {
    if (this._overlayRef) {
      return null;
    }

    const strategy = this.overlay.position().flexibleConnectedTo(this.overlayOrigin.elementRef);

    strategy.withPositions(this.positions);
    strategy.withPush(false);

    const config = new OverlayConfig({
      positionStrategy: strategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      hasBackdrop: this.closeIfClickedBackground,
      backdropClass: this.backdropClass,
    });

    this._overlayRef = this.overlay.create(config);
    let componentRef: ComponentRef<any> = this._overlayRef.attach(
      new ComponentPortal(this.panelComponentClassType, this.viewContainerRef, this.createInjector(this._overlayRef))
    );

    if (componentRef.instance.close) {
      componentRef.instance.close.subscribe(() => {
        this.hidePanel();
      });
    }

    // If required, set up so we close if user clicks our background
    if (this.closeIfClickedBackground) {
      this._overlayRef.backdropClick().subscribe(event => {
        this.hidePanel();
      });
    }

    // If overlay closes itself we wanna know
    this._overlayRef.detachments().subscribe(() => {
      this.panelHidden();
    });

    return componentRef;
  }

  private createInjector(overlayRef: OverlayRef): Injector {
    return Injector.create({
      parent: this.injector,
      providers: [{ provide: OverlayRef, useValue: overlayRef }],
    });
  }

  hidePanel(): void {
    if (!this._overlayRef) {
      return;
    }

    this._overlayRef.detach();
    this.panelHidden();
  }

  private panelHidden(): void {
    this._overlayRef = undefined;
  }
}
