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

export class HelpMessage {
  public static readonly NO_QUANT_FOR_SELECTION = "No quantification data found for selected PMCs. Are they house-keeping PMCs?";
  public static readonly NOT_ENOUGH_ELEMENTS = "Not enough elements defined";
  public static readonly SCATTER_SELECT_LINES_TO_DISPLAY = "Select One Or More Lines To Display";

  public static readonly NO_DATASETS_FOUND = "No search results returned, Citizen.";
  public static readonly NETWORK_ERROR = "The network is unresponsive, Citizen.";
  public static readonly NO_PERMISSIONS = "Citizen, you have insufficient permissions.";
  public static readonly NO_SELECTED_DATASET = "Citizen needs to select a dataset to see metadata.";

  public static readonly PAGE_NOT_FOUND = "Page not found. Citizen must have thought of the wrong planet.";

  public static readonly SELECTION_EMPTY = "Selection is empty. Citizen needs to select points for this to work.";
  public static readonly REMAINING_POINTS_EMPTY = "There are no remaining points.";

  public static readonly AWAITING_ADMIN_APPROVAL = "Citizen, the admin has not yet verified your account. Check back later.";
  public static readonly NO_DATASET_GROUPS = "Citizen is not assigned to view any dataset groups.";
  public static readonly GET_CLAIMS_FAILED = "Failed to get citizens permissions. Try again later.";

  public static readonly ROI_QUERY_FAILED = "Failed to get data, do selected region(s) exist?";
}
