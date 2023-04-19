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

import { Component, ElementRef, EventEmitter, Input, Output } from "@angular/core";
import { MatDialogRef, MatDialogConfig, MatDialog } from "@angular/material/dialog";
import { PickerDialogComponent, PickerDialogData, PickerDialogItem } from "../atoms/picker-dialog/picker-dialog.component";
import { DataExpressionService } from "src/app/services/data-expression.service";

export type ExpressionValue = {
    name: string;
    weightPercentage: number;
    error: number;
}

export type ExpressionReference = {
    name: string;
    expressionValues: ExpressionValue[];
}

// Berger et al., 2016, https://doi.org/10.1002/2015GL066675
const MARS_REFERENCES: ExpressionReference[] = [
    {
        name: "MSL Gale Crater O-Tray Dust Sol 571",
        expressionValues: [
            {name: "Na2O", weightPercentage: 2.75, error: 0.22},
            {name: "MgO", weightPercentage: 8.31, error: 0.38},
            {name: "Al2O3", weightPercentage: 8.91, error: 0.39},
            {name: "SiO2", weightPercentage: 39.3, error: 1.7},
            {name: "SO3", weightPercentage: 8.01, error: 0.94},
            {name: "Cl", weightPercentage: 1.06, error: 0.27},
            {name: "K2O", weightPercentage: 0.47, error: 0.09},
            {name: "CaO", weightPercentage: 7.04, error: 0.6},
            {name: "TiO2", weightPercentage: 1.06, error: 0.09},
            {name: "MnO", weightPercentage: 0.42, error: 0.1},
            {name: "FeOT", weightPercentage: 21, error: 2.2},
        ],
    },
    {
        name: "MER Gusev Crater Dust",
        expressionValues: [
            {name: "Na2O", weightPercentage: 2.9, error: 0.3},
            {name: "MgO", weightPercentage: 8.25, error: 0.15},
            {name: "Al2O3", weightPercentage: 9.56, error: 0.16},
            {name: "SiO2", weightPercentage: 45, error: 0.5},
            {name: "P2O5", weightPercentage: 0.91, error: 0.09},
            {name: "SO3", weightPercentage: 7.61, error: 0.13},
            {name: "Cl", weightPercentage: 0.88, error: 0.03},
            {name: "K2O", weightPercentage: 0.49, error: 0.07},
            {name: "CaO", weightPercentage: 6.17, error: 0.07},
            {name: "TiO2", weightPercentage: 0.89, error: 0.08},
            {name: "MnO", weightPercentage: 0.31, error: 0.02},
            {name: "FeOT", weightPercentage: 16.5, error: 0.15}
        ]
    },
    {
        name: "MER Meridiani Planum Dust",
        expressionValues: [
            {name: "Na2O", weightPercentage: 2.22, error: 0.19},
            {name: "MgO", weightPercentage: 7.57, error: 0.08},
            {name: "Al2O3", weightPercentage: 9.14, error: 0.09},
            {name: "SiO2", weightPercentage: 45, error: 0.3},
            {name: "P2O5", weightPercentage: 0.93, error: 0.09},
            {name: "SO3", weightPercentage: 7.28, error: 0.07},
            {name: "Cl", weightPercentage: 0.78, error: 0.01},
            {name: "K2O", weightPercentage: 0.48, error: 0.06},
            {name: "CaO", weightPercentage: 6.54, error: 0.04},
            {name: "TiO2", weightPercentage: 1.01, error: 0.07},
            {name: "MnO", weightPercentage: 0.34, error: 0.01},
            {name: "FeOT", weightPercentage: 17.5, error: 0.04}
        ]
    }
];

export class ExpressionReferences
{
    static references: ExpressionReference[] = this._convertSimpleNamesToIDs(MARS_REFERENCES);

    private static _convertSimpleNamesToIDs(expressionReferences: ExpressionReference[]): ExpressionReference[]
    {
        return expressionReferences.map((expressionReference: ExpressionReference) =>
        {
            let expandedExpressionValues: ExpressionValue[] = [];
            expressionReference.expressionValues.forEach((expressionValue: ExpressionValue) =>
            {
                ["A", "B", "Combined"].forEach((detector: string) =>
                {
                    let name = `expr-elem-${expressionValue.name}-%(${detector})`;
                    expandedExpressionValues.push({ ...expressionValue, name });
                });
            });
            return {
                ...expressionReference,
                expressionValues: expandedExpressionValues
            };
        });
    }

    static getByName(name: string): ExpressionReference
    {
        let references = ExpressionReferences.references;
        let index = references.findIndex((reference: ExpressionReference) => reference.name === name);
        
        return index >= 0 ? references[index] : null;
    }

    static getExpressionValue(reference: ExpressionReference, expressionName: string): ExpressionValue
    {
        let expressionValues = reference.expressionValues;
        let index = expressionValues.findIndex((expressionValue: ExpressionValue) => expressionValue.name === expressionName);

        return index >= 0 ? expressionValues[index] : null;
    }

    static getCombinedExpressionValues(reference: ExpressionReference): ExpressionValue[]
    {
        let expressionValues = reference.expressionValues;
        let combinedExpressionValues: ExpressionValue[] = [];
        expressionValues.forEach((expressionValue: ExpressionValue) =>
        {
            let noDetName = expressionValue.name.replace(/-%\([A-Za-z]+\)/, "");
            let combinedExpressionValue = combinedExpressionValues.find((combinedExpressionValue: ExpressionValue) => combinedExpressionValue.name === noDetName);
            if(!combinedExpressionValue)
            {
                combinedExpressionValues.push({ ...expressionValue, name: noDetName });
            }
        });

        return combinedExpressionValues;
    }
}

@Component({
    selector: "references-picker",
    templateUrl: "./references-picker.component.html",
    styleUrls: ["./references-picker.component.scss"]
})
export class ReferencesPickerComponent
{
    selectedReferences: string[] = [];

    @Input() plotIDs: string[] = [];
    @Output() onChange = new EventEmitter();

    dialogRef: MatDialogRef<PickerDialogComponent>;

    constructor(
        public dialog: MatDialog,
        private _exprService: DataExpressionService
    )
    {
    }

    get warnings(): string[]
    {
        let refWarnings: string[] = [];
        this.selectedReferences.forEach((refID: string) =>
        {
            let expressionValues = ExpressionReferences.getByName(refID).expressionValues;
            let missingExpressionIDs = this.plotIDs.filter((plotID: string) => !expressionValues.find((expressionValue: ExpressionValue) => expressionValue.name === plotID));
            missingExpressionIDs.forEach((expressionID: string) =>
            {
                let expressionName = this._exprService.getExpressionShortDisplayName(expressionID, 30).shortName;
                refWarnings.push(`${refID}: undefined ${expressionName}`);
            });
        });

        return refWarnings;
    }

    get warningTooltip(): string
    {
        return this.warnings.join("\n");
    }

    onReferences(): void
    {
        const dialogConfig = new MatDialogConfig();

        let items: PickerDialogItem[] = [];
        items.push(new PickerDialogItem(null, "References", null, true));

        for(let ref of ExpressionReferences.references)
        {
            let missingExpressionNames = this.plotIDs.filter((plotID: string) => 
                !ref.expressionValues.find((expressionValue: ExpressionValue) => expressionValue.name === plotID)
            ).map((expressionID: string) =>
            {
                return this._exprService.getExpressionShortDisplayName(expressionID, 30).shortName;
            });

            let missingExpressionNamesString = missingExpressionNames.length > 0 ? "Missing: " + missingExpressionNames.join(", ") : "";

            items.push(new PickerDialogItem(ref.name, ref.name, null, true, missingExpressionNamesString));
        }

        dialogConfig.data = new PickerDialogData(true, true, true, false, items, this.selectedReferences, "", new ElementRef(event.currentTarget));

        this.dialogRef = this.dialog.open(PickerDialogComponent, dialogConfig);
        this.dialogRef.componentInstance.onSelectedIdsChanged.subscribe((selectedIds: string[]) =>
        {
            this.selectedReferences = selectedIds;
            this.onChange.emit(this.selectedReferences);
        });
    }
}
