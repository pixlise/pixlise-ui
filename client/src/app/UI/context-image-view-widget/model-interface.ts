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

import { Subject } from "rxjs";
import { IColourScaleDataSource } from "src/app/models/ColourScaleDataSource";
import { ContextImageItem, DataSet } from "src/app/models/DataSet";
import { Point } from "src/app/models/Geometry";
import { SelectionService } from "src/app/services/selection.service";
import { SnackService } from "src/app/services/snack.service";
import { ViewStateService } from "src/app/services/view-state.service";
import { PanZoom } from "src/app/UI/atoms/interactive-canvas/pan-zoom";
import { LayerManager } from "src/app/UI/context-image-view-widget/layer-manager";
import { RegionManager } from "src/app/UI/context-image-view-widget/region-manager";
import { Colours, RGBA } from "src/app/utils/colours";


export enum ColourScheme
{
    BW = "BW",
    PURPLE_CYAN = "PURPLE_CYAN",
    RED_GREEN = "RED_GREEN",
}

export function getSchemeColours(scheme: ColourScheme): RGBA[]
{
    let a: RGBA;
    let b: RGBA;

    switch (scheme)
    {
    case ColourScheme.BW:
        a = Colours.BLACK;
        b = Colours.WHITE;
        break;
    case ColourScheme.RED_GREEN:
        a = Colours.CONTEXT_RED;
        b = Colours.CONTEXT_GREEN;
        break;
    case ColourScheme.PURPLE_CYAN:
    default:
        a = Colours.CONTEXT_PURPLE;
        b = Colours.CONTEXT_BLUE;
        break;
    }

    return [a, b];
}

// Define an interface for accessing model data - so we can change the implementation as needed
export interface IContextImageModel
{
    dataset: DataSet;
    layerManager: LayerManager;
    regionManager: RegionManager;
    selectionService: SelectionService;
    snackService: SnackService;
    viewStateService: ViewStateService;

    transform: PanZoom;

    contextImageItemShowing: ContextImageItem;
    contextImageItemShowingDisplay: HTMLImageElement;
    mmBeamRadius: number;

    rgbuImageLayerForScale: IColourScaleDataSource;

    selectionModeAdd: boolean;
    showPoints: boolean;
    pointColourScheme: ColourScheme;
    showPointBBox: boolean;
    pointBBoxColourScheme: ColourScheme;
    smoothing: boolean;
    brightness: number;
    colourRatioMin: number;
    colourRatioMax: number;
    displayedChannels: string; // String of what channels to show for R,G,B or a division of 2 channels. Can contain R,G,B,U. Examples: RGB, RBU, R/G
    elementRelativeShading: boolean;

    highlighedLocationIdx: number;

    uiPhysicalScaleTranslation: Point;
    uiLayerScaleTranslation: Point;

    drawnLinePoints: Point[];
    drawnLinePoints$: Subject<void>;

    widgetPosition: string;

    clearDrawnLinePoints(): void;
    addDrawnLinePoint(pt: Point): void

    saveState(reason: string): void;

    drawPointColours: Map<number, RGBA>;
}
