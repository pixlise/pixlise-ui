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

// Client-side export generation helpers:
export class ClientSideExportGenerator {
  // Context-image specific export options
  public static readonly exportWebResolution = "exportWebResolution";
  public static readonly exportPrintResolution = "exportPrintResolution";

  public static readonly exportDrawBackgroundBlack = "exportDrawBackgroundBlack";
  public static readonly exportDrawBackgroundWhite = "exportDrawBackgroundWhite";

  public static readonly exportContextImage = "exportContextImage";

  public static readonly exportContextImageColourScale = "exportContextImageColourScale";
  public static readonly exportContextImagePhysicalScale = "exportContextImagePhysicalScale";

  public static readonly exportContextImageFootprint = "exportContextImageFootprint";
  public static readonly exportContextImageScanPoints = "exportContextImageScanPoints";

  public static readonly exportContextImageROIs = "exportContextImageROIs";
  //public static readonly exportContextImageROIKey = 'exportContextImageROIKey';

  public static readonly exportContextImageElementMap = "exportContextImageElementMaps";
  public static readonly exportExpressionValues = "exportExpressionValues";
  public static readonly exportROIExpressionValues = "exportROIExpressionValues";

  public static readonly exportExpressionPrefix = "exportExpression:";
  public static readonly exportROIPrefix = "exportROI:";

  public static getExportExpressionID(exportItemIDs: string[]): string {
    if (exportItemIDs) {
      for (const id of exportItemIDs) {
        if (id.startsWith(ClientSideExportGenerator.exportExpressionPrefix)) {
          return id.substring(ClientSideExportGenerator.exportExpressionPrefix.length);
        }
      }
    }
    return "";
  }

  public static getExportROIIDs(exportItemIDs: string[]): string[] {
    const result = [];
    if (exportItemIDs) {
      for (const id of exportItemIDs) {
        if (id.startsWith(ClientSideExportGenerator.exportROIPrefix)) {
          result.push(id.substring(ClientSideExportGenerator.exportROIPrefix.length));
        }
      }
    }
    return result;
  }
}
