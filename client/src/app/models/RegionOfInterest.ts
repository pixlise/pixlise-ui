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

export type BuiltInROI = "AllPoints" | "SelectedPoints" | "RemainingPoints";
export class PredefinedROIID {
  private static readonly JoinChar = "-";
  private static readonly AllPoints: BuiltInROI = "AllPoints";
  private static readonly SelectedPoints: BuiltInROI = "SelectedPoints";
  //private static readonly RemainingPoints: BuiltInROI = "RemainingPoints";

  private static makeBuiltinIDFromScanID = (scanId: string, builtinType: string): string => {
    return `${builtinType}${PredefinedROIID.JoinChar}${scanId}`;
  };

  public static getAllPointsForScan(scanId: string): string {
    return PredefinedROIID.makeBuiltinIDFromScanID(scanId, PredefinedROIID.AllPoints);
  }

  public static isAllPointsROI(id: string): boolean {
    return id.startsWith(PredefinedROIID.AllPoints + PredefinedROIID.JoinChar);
  }

  public static getSelectedPointsForScan(scanId: string): string {
    return PredefinedROIID.makeBuiltinIDFromScanID(scanId, PredefinedROIID.SelectedPoints);
  }

  public static isSelectedPointsROI(id: string): boolean {
    return id.startsWith(PredefinedROIID.SelectedPoints + PredefinedROIID.JoinChar);
  }

  public static isPredefined(id: string): boolean {
    return id.startsWith(PredefinedROIID.AllPoints + PredefinedROIID.JoinChar) || id.startsWith(PredefinedROIID.SelectedPoints + PredefinedROIID.JoinChar); // || id.startsWith(PredefinedROIID.RemainingPoints);
  }

  //public static readonly defaultROIs: string[] = [PredefinedROIID.AllPoints, PredefinedROIID.SelectedPoints];
}
/*
export function orderVisibleROIs(rois: string[]): string[] {
  // Run through, make sure AllPoints is first, SelectedPoints is last (if they exist)
  let result = [];

  let hasAllPoints = false;
  let hasSelected = false;
  let hasRemaining = false;
  for (let roi of rois) {
    if (roi == PredefinedROIID.SelectedPoints) {
      hasSelected = true;
    } else if (roi == PredefinedROIID.AllPoints) {
      hasAllPoints = true;
    } else if (roi == PredefinedROIID.RemainingPoints) {
      hasRemaining = true;
    } else {
      result.push(roi);
    }
  }

  // Now add the all points/selected ones
  if (hasSelected) {
    result.push(PredefinedROIID.SelectedPoints);
  }
  if (hasAllPoints) {
    result.unshift(PredefinedROIID.AllPoints);
  }
  if (hasRemaining) {
    result.unshift(PredefinedROIID.RemainingPoints);
  }
  return result;
}
*/