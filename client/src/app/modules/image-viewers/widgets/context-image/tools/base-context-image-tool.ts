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

import { Rect } from "src/app/models/Geometry";
import { CursorId } from "src/app/modules/analysis/components/widget/interactive-canvas/cursor-id";
import {
  CanvasInteractionHandler,
  CanvasDrawer,
  CanvasMouseEvent,
  CanvasInteractionResult,
  CanvasKeyEvent,
  CanvasDrawParameters,
} from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { BeamSelection } from "src/app/modules/pixlisecore/models/beam-selection";
import { PixelSelection } from "src/app/modules/pixlisecore/models/pixel-selection";
import { Colours, RGBA } from "src/app/utils/colours";
import { drawEmptyCircle, drawFilledCircle, drawPlusCoordinates } from "src/app/utils/drawing";
import { IContextImageModel, getSchemeColours } from "../context-image-model-interface";

export enum ContextImageToolId {
  DRAW_LINE,
  ZOOM,
  ROTATE,
  PAN,
  SELECT_LINE,
  SELECT_COLOUR,
  SELECT_LASSO,
  SELECT_POINT,
  PMC_INSPECTOR, // UNUSED as of redesign Sept 1 2020. TODO: remove this!
}

export interface IToolHost {
  //springActivate(id: ContextImageToolId): void;
  setCursor(cursor: CursorId): void;
  notifyToolStateChanged(): void;
}

export class BaseContextImageTool implements CanvasInteractionHandler {
  constructor(
    protected _id: ContextImageToolId,
    protected _ctx: IContextImageModel,
    protected _host: IToolHost,
    public toolTip: string,
    public buttonIcon: string
  ) {}

  activate(): void {}

  deactivate(): void {}

  get id(): ContextImageToolId {
    return this._id;
  }

  // CanvasInteractionHandler
  mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    return CanvasInteractionResult.neither;
  }

  keyEvent(event: CanvasKeyEvent): CanvasInteractionResult {
    return CanvasInteractionResult.neither;
  }
}
