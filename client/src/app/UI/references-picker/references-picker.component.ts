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
    value: number;
}

export type ExpressionReference = {
    name: string;
    expressionValues: ExpressionValue[];
}

const EXPRESSION_REFERENCES: ExpressionReference[] = [
    { 
        name: "Mars Dust", 
        expressionValues: 
        [
            { name: "expr-elem-Na2O-%(A)", value: 50 },
            { name: "expr-elem-Na2O-%(B)", value: 5 },
            { name: "expr-elem-MgO-%(A)", value: 5 },
            { name: "expr-elem-MgO-%(B)", value: 5 },
            { name: "expr-elem-Al2O3-%(A)", value: 1 },
            { name: "expr-elem-Al2O3-%(B)", value: 1 },
            { name: "expr-elem-SiO2-%(A)", value: 1 },
            { name: "expr-elem-SiO2-%(B)", value: 1 },
            { name: "expr-elem-P2O5-%(A)", value: 1 },
            { name: "expr-elem-P2O5-%(B)", value: 2 },
            { name: "expr-elem-SO3-%(A)", value: 2 },
            { name: "expr-elem-SO3-%(B)", value: 2 },
            { name: "expr-elem-Cl-%(A)", value: 2 },
            { name: "expr-elem-Cl-%(B)", value: 2 },
            { name: "expr-elem-K2O-%(A)", value: 2 },
            { name: "expr-elem-K2O-%(B)", value: 3 },
            { name: "expr-elem-CaCO3-%(A)", value: 3 },
            { name: "expr-elem-CaCO3-%(B)", value: 3 },
            { name: "expr-elem-CaO-%(A)", value: 3 },
            { name: "expr-elem-CaO-%(B)", value: 3 },
            { name: "expr-elem-TiO2-%(A)", value: 3 },
            { name: "expr-elem-TiO2-%(B)", value: 3 },
            { name: "expr-elem-Cr2O3-%(A)", value: 3 },
            { name: "expr-elem-Cr2O3-%(B)", value: 4 },
            { name: "expr-elem-MnCO3-%(A)", value: 4 },
            { name: "expr-elem-MnCO3-%(B)", value: 4 },
            { name: "expr-elem-MnO-%(A)", value: 4 },
            { name: "expr-elem-MnO-%(B)", value: 4 },
            { name: "expr-elem-FeCO3-T-%(A)", value: 0.5 },
            { name: "expr-elem-FeCO3-T-%(B)", value: 0.5 },
            { name: "expr-elem-FeO-T-%(A)", value: 0.5 },
            { name: "expr-elem-FeO-T-%(B)", value: 0.5 },
            { name: "expr-elem-NiO-%(A)", value: 0.5 },
            { name: "expr-elem-NiO-%(B)", value: 0.5 },
        ]
    },
];

export class ExpressionReferences
{
    static references: ExpressionReference[] = EXPRESSION_REFERENCES;

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
}

@Component({
    selector: "references-picker",
    templateUrl: "./references-picker.component.html",
    styleUrls: ["./references-picker.component.scss"]
})
export class ReferencesPickerComponent
{
    selectedReferences: string[] = [];

    @Input() plotIDs: string[];
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
        this.selectedReferences.forEach((refID: string, i) =>
        {
            let expressionValues = ExpressionReferences.getByName(refID).expressionValues;
            let missingExpressionIDs = this.plotIDs.filter((plotID: string) => !expressionValues.find((expressionValue: ExpressionValue) => expressionValue.name === plotID));
            missingExpressionIDs.forEach((expressionID: string) =>
            {
                let expressionName = this._exprService.getExpressionShortDisplayName(expressionID, 30).shortName;
                refWarnings.push(`${refID}: undefined ${expressionName}`);
            });

            if(i !== this.selectedReferences.length - 1)
            {
                refWarnings.push("");
            }
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
