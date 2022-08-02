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

import { CanvasDrawer } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { EngineeringDrawer } from "src/app/UI/context-image-view-widget/drawers/engineering-drawer";
import { MainContextImageLayeredDrawer } from "src/app/UI/context-image-view-widget/drawers/main-drawer";
import { MapBrowserContextImageLayeredDrawer } from "src/app/UI/context-image-view-widget/drawers/map-drawer";
import { ContextImageModel } from "src/app/UI/context-image-view-widget/model";
import { ContextImageToolHost } from "src/app/UI/context-image-view-widget/tools/tool-host";


export function makeDrawer(drawerName: string, toolHost: ContextImageToolHost, mdl: ContextImageModel): CanvasDrawer
{
// Drawing setup
    if(drawerName == "MainContextImageLayeredDrawer")
    {
        return new MainContextImageLayeredDrawer(mdl, toolHost);
    }
    else if(drawerName == "MapBrowserContextImageLayeredDrawer")
    {
        return new MapBrowserContextImageLayeredDrawer(mdl, toolHost);
    }
    else if(drawerName == "EngineeringDrawer")
    {
        return new EngineeringDrawer(mdl, toolHost);
    }

    console.error("Failed to allocate drawer for context image. Unknown drawer name: "+drawerName);
    return null;
}
