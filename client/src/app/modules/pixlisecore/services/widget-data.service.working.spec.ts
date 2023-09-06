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

import { TestBed } from "@angular/core/testing";
import { of, Subject } from "rxjs";

import { WidgetRegionDataService } from "./widget-region-data.service";

import { ROIService } from "src/app/services/roi.service";
import { ROISavedItem } from "src/app/models/roi";
import { SelectionHistoryItem, SelectionService } from "src/app/services/selection.service";
import { ViewState, ViewStateService } from "src/app/services/view-state.service";
import { DataExpressionService } from "src/app/services/data-expression.service";
import { DataSetService } from "../services/data-set.service";
import { ZStackItem, QuantificationService } from "src/app/services/quantification.service";
import { DiffractionPeakService } from "src/app/services/diffraction-peak.service";
import { ExpressionRunnerService } from "src/app/services/expression-runner.service";
//import { HttpClient, HttpHandler } from "@angular/common/http";
//import { Router } from "@angular/router";

import { DataSet } from "src/app/models/DataSet";
import { PMCDataValues, PMCDataValue } from "src/app/expression-language/data-values";


describe("WidgetRegionDataService", () => 
{
    let service: WidgetRegionDataService;

    beforeEach(() => 
    {
        //const ds = new DataSet("dataset123", null, null);
        const ds = jasmine.createSpyObj("DataSet",
            ["isCombinedDataset", "getId", "getIdOffsetForSubDataset", "getLocationIdxsForSubDataset", "getPMCsForLocationIndexes"],
            ["locationPointCache", "experiment", "pmcToLocationIndex"]);
        //experiment.getLocationsList

        let roiSubject = new Subject<Map<string, ROISavedItem>>();
        const ROIServiceSpy = jasmine.createSpyObj("ROIService",
            [],
            {
                "roi$": roiSubject
            }
        );

        let selSubject = new Subject<SelectionHistoryItem>();
        const SelectionServiceSpy = jasmine.createSpyObj("SelectionService",
            ["getCurrentSelection"],
            {
                "selection$": selSubject
            }
        );

        //let viewStateObs = of(new ViewState(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null));
        let viewStateSubject = new Subject<ViewState>();
        let roiColoursSubject = new Subject<Map<string, string>>();
        let roiShapesSubject = new Subject<Map<string, string>>();
        let appliedQuantificationSubject = new Subject<string>();
        const ViewStateServiceSpy = jasmine.createSpyObj("ViewStateService",
            [],
            {
                "viewState$": viewStateSubject,
                "roiColours$": roiColoursSubject,
                "roiShapes$": roiShapesSubject,
                "appliedQuantification$": appliedQuantificationSubject
            }
        );

        let exprSubject = new Subject<void>();
        const DataExpressionServiceSpy = jasmine.createSpyObj("DataExpressionService",
            ["getExpression", "setQuantDataAvailable"],
            {
                "expressionsUpdated$": exprSubject
            }
        );
        
        
        let dsSubject = new Subject<DataSet>();
        const DataSetServiceSpy = jasmine.createSpyObj("DataSetService", [], {"dataset$": dsSubject, "datasetLoaded": true});
        //DataSetServiceSpy.dataset$.returnValues(dsSubject);
        //(Object.getOwnPropertyDescriptor(DataSetServiceSpy, "dataset$")?.get as Spy<() => Subject>).and.returnValue(ds2);

        let multiQuantZSubject = new Subject<ZStackItem[]>();
        const QuantificationServiceSpy = jasmine.createSpyObj("QuantificationService",
            ["getRemainingPMCs", "getQuantification"],
            {
                "multiQuantZStack$": multiQuantZSubject,
                "multiQuantZStack": []
            }
        );

        const DiffractionPeakServiceSpy = jasmine.createSpyObj("DiffractionPeakService", ["getDiffractionPeakEffectData", "getRoughnessData"]);
        const ExpressionRunnerServiceSpy = jasmine.createSpyObj("ExpressionRunnerService", ["runExpression", "exportExpressionCode"]);

        TestBed.configureTestingModule({
            providers: [
                { provide: ROIService, useValue: ROIServiceSpy },
                { provide: SelectionService, useValue: SelectionServiceSpy },
                { provide: ViewStateService, useValue: ViewStateServiceSpy },
                { provide: DataExpressionService, useValue: DataExpressionServiceSpy },
                { provide: DataSetService, useValue: DataSetServiceSpy },
                { provide: QuantificationService, useValue: QuantificationServiceSpy },
                { provide: DiffractionPeakService, useValue: DiffractionPeakServiceSpy },
                { provide: ExpressionRunnerService, useValue: ExpressionRunnerServiceSpy },
                //HttpClient,
                //HttpHandler,
                //Router
            ]
        });
        service = TestBed.inject(WidgetRegionDataService);
/*
        service = new WidgetRegionDataService(
            ROIServiceSpy,
            SelectionServiceSpy,
            ViewStateServiceSpy,
            DataExpressionServiceSpy,
            DataSetServiceSpy,
            QuantificationServiceSpy,
            DiffractionPeakServiceSpy,
            ExpressionRunnerServiceSpy
        );*/
    });

    it("should be created", () => 
    {
        expect(service).toBeTruthy();
    });

    it("filterForPMCs should filter", () => 
    {
        let result = PMCDataValues.makeWithValues(
            [
                new PMCDataValue(4, 100, false, "wtf0"),
                new PMCDataValue(5, 105),
                new PMCDataValue(6, 106, false, "wtf6"),
                new PMCDataValue(7, 107, false, "wtf7"),
                new PMCDataValue(10, 110),
                new PMCDataValue(11, 111),
            ]
        );
        let forPMCs = new Set<number>([5, 6, 9, 10]);
        
        let exp = PMCDataValues.makeWithValues(
            [
                new PMCDataValue(5, 105),
                new PMCDataValue(6, 106, false, "wtf6"),
                new PMCDataValue(10, 110),
            ]
        );

        expect(service["filterForPMCs"](result, forPMCs)).toEqual(exp);
    });
});
