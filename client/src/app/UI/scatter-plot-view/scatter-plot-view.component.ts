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

import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { Chart } from "chart.js";
import "chartjs-plugin-zoom";
import { Subscription } from "rxjs";
import { PMCDataValues } from "src/app/expression-language/data-values";
import { BeamSelection } from "src/app/models/BeamSelection";
import { DataSet } from "src/app/models/DataSet";
import { QuantificationLayer } from "src/app/models/Quantifications";
import { Experiment } from "src/app/protolibs/experiment_pb";
import { DataSetService } from "src/app/services/data-set.service";
import { LayoutService } from "src/app/services/layout.service";
import { QuantificationService } from "src/app/services/quantification.service";
import { SelectionService } from "src/app/services/selection.service";
import { chartjsPluginMouseCursor } from "src/app/utils/chartjs-cursor";
import { ChartArea, chartjsPIXLMouseInteraction } from "src/app/utils/chartjs-mouse-interaction";
import { Colours } from "src/app/utils/colours";
import { CANVAS_FONT_SIZE } from "src/app/utils/drawing";
import { HelpMessage } from "src/app/utils/help-message";
import { makeScatterPlotData, UNICODE_CARET_DOWN } from "src/app/utils/utils";










class ViewOption
{
    id: number;

    constructor(
        public name: string, // Name to be shown when selecting what to show
        public source: string, // Where to get this data from...
        public idx: number, // Which of those it's in...
        public isFloat: boolean,
        public quantElem: string = null, // for quant data only, the element type
        public quantElemCol: string = null // for quant data only, the element type
    )
    {
    }
}

const NoLinesDisplayMsg = HelpMessage.SCATTER_SELECT_LINES_TO_DISPLAY;
const PointSizeNotSelected = 1.3;
const PointSizeSelected = 3.5;
const PointSizeHover = 5;

@Component({
    selector: "app-scatter-plot-view",
    templateUrl: "./scatter-plot-view.component.html",
    styleUrls: ["./scatter-plot-view.component.scss"]
})
export class ScatterPlotViewComponent implements OnInit, OnDestroy
{
    private subs = new Subscription();

    @ViewChild("ScatterPlot") chart: ElementRef;

    scatterPlotCaret = UNICODE_CARET_DOWN;

    viewOptions: ViewOption[] = [];
    selectedViewOptionIdxs: number[] = [];

    showSelectionOnly: boolean = false;
    sortByY: boolean = false;
    message: string = NoLinesDisplayMsg;

    private mouseChartArea: ChartArea = null;

    private scatterChart: Chart;

    private colorList: string[] = [
        Colours.BLUE.asString(),
        Colours.ORANGE.asString(),
        Colours.YELLOW.asString(),
        Colours.PURPLE.asString()
    ];

    private maxY: number = null;
    private minY: number = null;

    private pointRadii: number[] = [];

    // NOTE: This is here because for some reason chartJS will display a certain tool tip on the chart, then when
    // we get the onClick callback it specifies a different data index. Seems to be a bug in chartJS
    // but to make the user less confused, we save the last shown PMC in the tooltip callback and use that
    // when onClick is called
    private lastToolTipPMC: number = null;

    constructor(
        private selectionService: SelectionService,
        private datasetService: DataSetService,
        private quantService: QuantificationService,
        private layoutService: LayoutService,
        private changeDetectorRef: ChangeDetectorRef
    )
    {
    }

    ngOnInit()
    {
        this.subs.add(this.datasetService.dataset$.subscribe(
            (dataset: DataSet)=>
            {
                // This provides more view options
                this.makeViewOptions(dataset, null/*this.quantService.quantificationLoaded*/);
            }
        ));
        /*
        // quantificationLoaded
        this.subs.add(this.quantService.quantification$.subscribe(
            (quant: QuantificationLayer)=>
            {
                // This provides more view options
                this.makeViewOptions(this.datasetService.datasetLoaded, quant);
            }
        ));
*/
        this.subs.add(this.selectionService.selection$.subscribe((selection)=>
        {
            if(this.showSelectionOnly)
            {
                // New selection happened! If it's a single point, display its detector info, if it's multiple
                // we need to do a bulk sum or something
                this.regenerate();
            }
            else
            {
                // We're showing all, so need to change the point radius array only
                this.updatePointRadii(this.pointRadii.length);
                if(this.scatterChart)
                {
                    this.scatterChart.update();
                }
            }
        }));
    }

    ngOnDestroy()
    {
        this.subs.unsubscribe();
    }

    ngAfterViewInit()
    {
        // Basically won't happen...
        if(this.message == null)
        {
            this.regenerate();
        }
    }

    resetZoom(): void
    {
        this.scatterChart.resetZoom("XY");
    }

    resetZoomX(): void
    {
        this.scatterChart.resetZoom("X");
    }

    resetZoomY(): void
    {
        this.scatterChart.resetZoom("Y");
    }

    clearChart(): void
    {
        // Forget what's enabled to be shown
        this.selectedViewOptionIdxs = [];
        this.setDisplayMessage(NoLinesDisplayMsg);
    }

    setSortByY(event): void
    {
        this.sortByY = event.checked;
        this.regenerate();
    }

    setShowSelection(event): void
    {
        this.showSelectionOnly = event.checked;
        this.regenerate();
    }

    onChangeViewOption(event): void
    {
        this.selectedViewOptionIdxs = event.value;
        if(this.selectedViewOptionIdxs.length <= 0)
        {
            this.setDisplayMessage(NoLinesDisplayMsg);
        }
        else
        {
            // Make sure the error msg is cleared
            this.setDisplayMessage(null);

            // NOTE: the above implicitly does this
            //this.regenerate();
        }
    }

    onHideScatterPlot(): void
    {
        this.layoutService.showScatterPlot = false;
    }

    getChartCursor(): string
    {
        if(this.mouseChartArea == ChartArea.AREA_LEFT)
        {
            return "upDownCursor";
        }

        if(this.mouseChartArea == ChartArea.AREA_BOTTOM)
        {
            return "leftRightCursor";
        }

        return "panZoomCursor";
    }

    private setDisplayMessage(msg: string): void
    {
        this.message = msg;
        this.changeDetectorRef.detectChanges();
        if(!this.message)
        {
            // Re-create the chart
            this.regenerate();
        }
    }

    private regenerate(): void
    {
        let dataset = this.datasetService.datasetLoaded;
        if(!dataset)
        {
            console.log("ScatterPlotViewComponent regenerate - no dataset yet!");
            return;
        }

        this.createChart(this.sortByY ? "" : "Location Indexes", "Y-Values");

        // Handling showing selection only
        let sel = this.selectionService.getCurrentSelection().beamSelection;
        if(!this.showSelectionOnly || sel.locationIndexes.size <= 0)
        {
            sel = null;
        }

        if(!this.showSelectionOnly)
        {
            // Showing all, ensure we have enough radius size points
            let count = dataset.experiment.getLocationsList().length;
            this.updatePointRadii(count);
        }

        // Loop through all data points and include what's needed in the chart
        if(dataset && this.viewOptions && this.scatterChart)
        {
            for(let selIdx of this.selectedViewOptionIdxs)
            {
                let opt = this.viewOptions[selIdx];

                if(opt.source == "HK")
                {
                    this.showHousekeeping(dataset, opt, sel);
                }
                else if(opt.source == "BEAM")
                {
                    this.showBeam(dataset, opt, sel);
                }
                else if(opt.source == "DM")
                {
                    if(opt.idx == 0)
                    {
                        this.showDetectorCount(dataset, opt, sel);
                    }
                    else
                    {
                        this.showDetectorMeta(dataset, opt, sel);
                    }
                }
                else if(opt.source == "QUANTELEM")
                {
                    //this.showQuantElement(opt, sel);
                }
                else if(opt.source == "QUANTDATA")
                {
                    //this.showQuantData(opt, sel);
                }
            }
        }
    }

    private updatePointRadii(count: number): void
    {
        // ONLY do this if we're showing all
        if(this.showSelectionOnly)
        {
            return;
        }

        // Make sure the sizes match
        //if(this.pointRadii.length != count)
        {
            // clear it
            this.pointRadii.length = 0;

            // add to it
            let toadd = count-this.pointRadii.length;
            this.pointRadii.push(...Array(toadd).fill(PointSizeNotSelected));
        }

        let sel = this.selectionService.getCurrentSelection().beamSelection;

        for(let idx of sel.locationIndexes)
        {
            this.pointRadii[idx] = PointSizeSelected;
        }
    }

    private getLocationIndexes(dataset: DataSet, selection: BeamSelection): Set<number>
    {
        if(selection && selection.locationIndexes.size > 0)
        {
            return selection.locationIndexes;
        }
        return new Set<number>(Array(dataset.experiment.getLocationsList().length).keys());
    }

    private showHousekeeping(dataset: DataSet, opt: ViewOption, selection: BeamSelection): void
    {
        // TODO: replace with expression language for retrieving this!
        let metaLabels = dataset.experiment.getMetaLabelsList();
        let metaTypes = dataset.experiment.getMetaTypesList();

        let values: number[] = [];
        let pmcs: number[] = [];

        let locs = dataset.experiment.getLocationsList();
        let locationIndexes = this.getLocationIndexes(dataset, selection);
        for(let locIdx of locationIndexes)
        {
            let loc = locs[locIdx];

            let metaList = loc.getMetaList();
            if(metaList)
            {
                let item = metaList[opt.idx];
                let metaType = metaTypes[item.getLabelIdx()];
                let pmc = Number.parseInt(loc.getId());

                if(metaType == Experiment.MetaDataType.MT_FLOAT)
                {
                    values.push(item.getFvalue());
                    pmcs.push(pmc);
                }
                else if(metaType == Experiment.MetaDataType.MT_INT)
                {
                    values.push(item.getIvalue());
                    pmcs.push(pmc);
                }
            }
        }

        if(opt.isFloat)
        {
            let valArray = new Float32Array(values);
            this.addDataSetToChart(opt.name, valArray, new Int32Array(pmcs));
        }
        else
        {
            let valArray = new Int32Array(values);
            this.addDataSetToChart(opt.name, valArray, new Int32Array(pmcs));
        }
    }

    private showBeam(dataset: DataSet, opt: ViewOption, selection: BeamSelection): void
    {
        let values: number[] = [];
        let pmcs: number[] = [];

        let locs = dataset.experiment.getLocationsList();
        let locationIndexes = this.getLocationIndexes(dataset, selection);
        for(let locIdx of locationIndexes)
        {
            let loc = locs[locIdx];
            let pmc = Number.parseInt(loc.getId());

            let beam = loc.getBeam();
            if(beam)
            {
                let added = true;
                switch (opt.idx)
                {
                case 0:
                    values.push(beam.getX());
                    break;
                case 1:
                    values.push(beam.getY());
                    break;
                case 2:
                    values.push(beam.getZ());
                    break;
                case 3:
                    values.push(beam.getImageI());
                    break;
                case 4:
                    values.push(beam.getImageJ());
                    break;
                default:
                    added = false;
                    break;
                }

                if(added)
                {
                    pmcs.push(pmc);
                }
            }
        }

        let valArray = new Float32Array(values);
        this.addDataSetToChart(opt.name, valArray, new Int32Array(pmcs));
    }

    private showDetectorCount(dataset: DataSet, opt: ViewOption, selection: BeamSelection): void
    {
        let pmcs: number[] = [];
        let values: number[] = [];

        let locs = dataset.experiment.getLocationsList();
        let locationIndexes = this.getLocationIndexes(dataset, selection);
        for(let locIdx of locationIndexes)
        {
            let loc = locs[locIdx];
            let pmc = Number.parseInt(loc.getId());

            let dets = loc.getDetectorsList();
            values.push(dets.length);
            pmcs.push(pmc);
        }

        let valArray = new Int32Array(values);
        this.addDataSetToChart(opt.name, valArray, new Int32Array(pmcs));
    }

    private showDetectorMeta(dataset: DataSet, opt: ViewOption, selection: BeamSelection): void
    {
        let pmcsA: number[] = [];
        let pmcsB: number[] = [];

        let valuesA: number[] = [];
        let valuesB: number[] = [];

        let minValueA = null;
        let minValueB = null;

        // TODO: consider other than normal A and normal B!

        let locs = dataset.experiment.getLocationsList();
        let locationIndexes = this.getLocationIndexes(dataset, selection);
        for(let locIdx of locationIndexes)
        {
            let loc = locs[locIdx];
            let pmc = Number.parseInt(loc.getId());
            let dets = loc.getDetectorsList();

            // Detector A and B have separate values
            for(let det of dets)
            {
                let readType = dataset.getDetectorMetaValue("READTYPE", det);
                let detectorId = dataset.getDetectorMetaValue("DETECTOR_ID", det);

                let value = null;

                if(opt.idx == 1)
                {
                    value = dataset.getDetectorReadUnixTime(det);
                }
                else if(opt.idx == 2)
                {
                    value = dataset.getDetectorMetaValue("LIVETIME", det);
                }
                else if(opt.idx == 3)
                {
                    value = dataset.getDetectorMetaValue("REALTIME", det);
                }
                else if(opt.idx == 4)
                {
                    value = dataset.getDetectorMetaValue("XPERCHAN", det);
                }
                else if(opt.idx == 5)
                {
                    value = dataset.getDetectorMetaValue("OFFSET", det);
                }

                if(value !== null)
                {
                    if(detectorId == "A" && readType == "Normal")
                    {
                        if(minValueA == null || value < minValueA)
                        {
                            minValueA = value;
                        }
                        valuesA.push(value);
                        pmcsA.push(pmc);
                    }
                    else if(detectorId == "B" && readType == "Normal")
                    {
                        if(minValueB == null || value < minValueB)
                        {
                            minValueB = value;
                        }
                        valuesB.push(value);
                        pmcsB.push(pmc);
                    }
                }
            }
        }

        if(opt.idx == 0)
        {
            // Unix times... Subtract the min value!
            let valArrayA = new Int32Array(valuesA);
            valArrayA.forEach((value, idx, arr)=> { arr[idx] = value-minValueA;});
            let valArrayB = new Int32Array(valuesB);
            valArrayB.forEach((value, idx, arr)=> { arr[idx] = value-minValueB;});

            this.addDataSetToChart(opt.name+" (A)", valArrayA, new Int32Array(pmcsA));
            this.addDataSetToChart(opt.name+" (B)", valArrayB, new Int32Array(pmcsB));
        }
        else if(opt.idx == 1)
        {
            // Fractional seconds!
            let valArrayA = new Float32Array(valuesA);
            let valArrayB = new Float32Array(valuesB);

            this.addDataSetToChart(opt.name+" (A)", valArrayA, new Int32Array(pmcsA));
            this.addDataSetToChart(opt.name+" (B)", valArrayB, new Int32Array(pmcsB));
        }
    }
    /*
    private showQuantElement(opt: ViewOption, selection: BeamSelection): void
    {
        let selectedPMCs = (selection) ? selection.getSelectedPMCs() : null;

        // Disabled due to multi-quants
        let layer = this.quantService.quantificationLoaded; //TODO: IGNORING what used to be here... [opt.idx];

        let detectors = layer.getDetectors();
        for(let det of detectors)
        {
            let data = layer.getQuantifiedDataWithExpression('element("'+opt.quantElem+'","'+opt.quantElemCol+'", "'+det+'")', selectedPMCs);
            let toAdd = this.makeChartData(det, data);
            this.addDataSetToChart(opt.name+' ('+det+')', new Float32Array(toAdd[det]), new Int32Array(toAdd['pmcs']));
        }
    }

    private showQuantData(opt: ViewOption, selection: BeamSelection): void
    {
        let selectedPMCs = (selection) ? selection.getSelectedPMCs() : null;

        // Disabled due to multi-quants
        let layer = this.quantService.quantificationLoaded; //TODO: IGNORING what used to be here... [opt.idx];

        let detectors = layer.getDetectors();
        for(let det of detectors)
        {
            let data = layer.getQuantifiedDataWithExpression('data("'+opt.quantElemCol+'", "'+det+'")', selectedPMCs);
            let toAdd = this.makeChartData(det, data);

            this.addDataSetToChart(opt.name+' ('+det+')', new Float32Array(toAdd[det]), new Int32Array(toAdd['pmcs']));
        }
    }
*/
    private makeChartData(detector: string, data: PMCDataValues): object
    {
        let pmcs: number[] = [];
        let values: number[] = [];

        for(let item of data.values)
        {
            values.push(item.value);
            pmcs.push(item.pmc);
        }

        let result = { "pmcs": pmcs };
        result[detector] = values;
        return result;
    }

    private makeViewOptions(dataset: DataSet, quant: QuantificationLayer): void
    {
        if(!dataset)
        {
            return;
        }

        this.viewOptions = [];

        let metaLabels = dataset.experiment.getMetaLabelsList();
        let metaTypes = dataset.experiment.getMetaTypesList();

        // Add beam locations
        this.viewOptions.push(new ViewOption("Beam-X", "BEAM", 0, true));
        this.viewOptions.push(new ViewOption("Beam-Y", "BEAM", 1, true));
        this.viewOptions.push(new ViewOption("Beam-Z", "BEAM", 2, true));
        this.viewOptions.push(new ViewOption("Beam-I", "BEAM", 3, true));
        this.viewOptions.push(new ViewOption("Beam-J", "BEAM", 4, true));

        // And detector metadata
        this.viewOptions.push(new ViewOption("Detector Counts", "DM", 0, true));
        this.viewOptions.push(new ViewOption("Detector Read Time (Sec)", "DM", 1, true));
        this.viewOptions.push(new ViewOption("Detector Live Time", "DM", 2, true));
        this.viewOptions.push(new ViewOption("Detector Real Time", "DM", 3, true));
        this.viewOptions.push(new ViewOption("Detector eV/channel", "DM", 4, true));
        this.viewOptions.push(new ViewOption("Detector eV start", "DM", 5, true));
        // TODO: potentially could add these:
        // LIVETIME, REALTIME, EVENTS, TRIGGERS, OVERFLOWS, UNDERFLOWS, BASE_EVENTS, RESETS, OVER_ADCMAX

        let c = 0;

        // Also element data from quant files
        // NOTE: We get a quantification for the bulk-sum spectrum for tactical datasets, don't allow charting that
        // as it only has 1 data point!
        if(quant && !dataset.isBulkSumQuant(quant.summary.jobId))
        {
            for(let elem of quant.getElementFormulae())
            {
                for(let elemType of quant.getElementColumns(elem))
                {
                    let name = "Quant: "+quant.summary.params.name+" "+elem+" ("+elemType+")";
                    this.viewOptions.push(new ViewOption(name, "QUANTELEM", c, true, elem, elemType));
                }
            }

            // Also add other quant columns
            for(let col of quant.getDataColumns())
            {
                let name = "Quant: "+quant.summary.params.name+" "+col;
                this.viewOptions.push(new ViewOption(name, "QUANTDATA", c, true, null, col));
            }

            c++;
        }

        let hkAdded = false;

        for(let loc of dataset.experiment.getLocationsList())
        {
            if(!hkAdded)
            {
                // Add metadata values
                c = 0;
                for(let item of loc.getMetaList())
                {
                    // Add all values which are not strings
                    let metaType = metaTypes[item.getLabelIdx()];
                    if(metaType == Experiment.MetaDataType.MT_FLOAT || metaType == Experiment.MetaDataType.MT_INT)
                    {
                        let metaLabel = metaLabels[item.getLabelIdx()];
                        this.viewOptions.push(new ViewOption(metaLabel, "HK", c, metaType == Experiment.MetaDataType.MT_FLOAT));//item.getLabelIdx()));
                    }
                    c++;
                }

                hkAdded = true;
            }
        }

        for(let c = 0; c < this.viewOptions.length; c++)
        {
            this.viewOptions[c].id = c;
        }
    }

    private addDataSetToChart(label: string, values: any, pmcs: any)
    {
        if(!values)
        {
            console.error("Attempted adding scatter plot with no values: "+label);
            return;
        }

        if(!pmcs)
        {
            console.error("Attempted adding scatter plot with no PMCs: "+label);
            return;
        }

        //console.log('Adding dataset: '+label+' to existing '+this.scatterChart.data.datasets.length+' datasets!');
        let data = makeScatterPlotData([...Array(values.length).keys()], values, null, null, pmcs);
        if(this.sortByY)
        {
            // Sort the data values by the Y value
            data.sort((a, b) => (a["y"] > b["y"]) ? 1 : -1);

            // Now that they're sorted, fix the x values
            // Also set the point radius array to fit all these points
            for(let c = 0; c < data.length; c++)
            {
                data[c]["x"] = c;
            }
        }

        let colour = this.colorList[this.scatterChart.data.datasets.length%this.colorList.length];

        this.scatterChart.data.datasets.push(
            {
                yAxisID: "y",
                xAxisID: "x",
                label: label,
                // NOTE: We use the point radius array only if we're showing ALL points
                pointRadius: this.showSelectionOnly ? PointSizeNotSelected : this.pointRadii,
                pointBackgroundColor: colour,
                pointStyle: "circle",
                pointHoverRadius: PointSizeHover,
                borderWidth: 1,
                data: data,
                borderColor: colour,
                fill: false
            }
        );

        // TODO: could use Math.min/Math.max or whatever but here we do both in 1 loop
        if(this.maxY === null)
        {
            this.maxY = values[0];
        }
        if(this.minY === null)
        {
            this.minY = values[0];
        }

        for(let v of values)
        {
            if(v > this.maxY)
            {
                this.maxY = v;
            }

            if(v < this.minY)
            {
                this.minY = v;
            }
        }
        //console.log('min: '+this.minY+', max: '+this.maxY);
        this.scatterChart.options.scales.yAxes[0].ticks.min = this.minY;
        this.scatterChart.options.scales.yAxes[0].ticks.max = this.maxY;

        // Set limits on the maximum points to zoom/show
        let maxDataCount = 0;
        for(let ds of this.scatterChart.data.datasets)
        {
            if(ds.data.length > maxDataCount)
            {
                maxDataCount = ds.data.length;
            }
        }

        this.scatterChart.options.scales.xAxes[0].ticks.max = maxDataCount;
        this.scatterChart.options.plugins.mouseInteraction.rangeMax.x = maxDataCount;

        this.scatterChart.update();
    }

    onMouseEventChart(params): void
    {
        this.mouseChartArea = params.chartArea;

        let dataset = this.datasetService.datasetLoaded;
        if(!dataset)
        {
            return;
        }

        if(params.type == "select")
        {
            // Range selection just happened! Check that we can access data
            if(this.scatterChart.data.datasets.length <= 0)
            {
                alert("No lines to select from!");
                return;
            }
            
            // The range indicates indexes in the dataset array we passed to the chart. If we have Sort-By-Y turned on, then we can only really
            // do range selection if there is ONE dataset only. If we have multiple, they have their sorting in different order, and we need to know
            // which lines PMCs we're wanting to select from. So bring up an alert here if there are multiple lines and sort-by-y is on
            if(this.sortByY && this.scatterChart.data.datasets.length > 1)
            {
                alert("Can only range-select for sort-by-Y data if there is only one line showing. For multiple lines, the data are in a different sort order so which one you are selecting cannot be determined");
                return;
            }

            // Get the selected PMCs
            // Just get the first dataset from the chart to read PMCs from (if we're doing sort-by-Y we've covered the case above with multiple lines)
            let values = this.scatterChart.data.datasets[0].data;
            if(params.xFrom < 0)
            {
                params.xFrom = 0;
            }
            if(params.xTo >= values.length)
            {
                params.xTo = values.length-1;
            }

            let set = new Set<number>();

            for(let idx = params.xFrom; idx < params.xTo; idx++)
            {
                // These are location indexes, so just shovel them into the selection
                let pmc = values[idx].pmc;
                let locIdx = dataset.pmcToLocationIndex.get(pmc);
                if(locIdx != undefined && locIdx != null)
                {
                    set.add(locIdx);
                }
            }

            if(set.size > 0)
            {
                this.selectionService.setSelection(dataset, new BeamSelection(dataset, set), null);
            }
        }
        else if(params.type == "up")
        {
            // Clicked somewhere on chart, select the nearest PMC
            if(this.lastToolTipPMC !== null)
            {
                let idx = dataset.pmcToLocationIndex.get(this.lastToolTipPMC);
                if(idx !== undefined)
                {
                    let set = new Set<number>();
                    set.add(idx);
                    this.selectionService.setSelection(dataset, new BeamSelection(dataset, set), null);
                }
                else
                {
                    console.error("Failed to find location index for PMC: "+this.lastToolTipPMC+". Selection not set for scatter plot click.");
                }
            }
        }
    }

    private createChart(xAxisLabel: string, yAxisLabel: string)
    {
        if(!this.chart)
        {
            console.warn("Scatter plot: createChart failed as no chart element reference is set");
            return;
        }

        // If we have an existing one, delete
        if(this.scatterChart != null && this.scatterChart != undefined)
        {
            console.log("Scatter plot: createChart destroyed previously created chart");
            this.scatterChart.destroy();
            this.scatterChart = null;

            // Also forget the min/max Y values we've saved, as we're re-creating from scratch, don't want any newly added lines to be affected
            this.maxY = null;
            this.minY = null;
        }

        const ctx = this.chart.nativeElement.getContext("2d");

        let self = this;
        let valueCount = undefined;

        this.scatterChart = new Chart(ctx,
            {
                // The type of chart we want to create
                type: "line",
            
                // The data for our dataset
                data: {
                    datasets: []
                },
                options: {
                    tooltips: {
                        // Custom tooltip item for element value, if exists
                        callbacks: {
                            title: (tooltipItem, data)=>
                            {
                                // PMC is obtained from data for this item
                                if(tooltipItem.length > 0 && data.datasets.length > tooltipItem[0].datasetIndex)
                                {
                                    let PMC = data.datasets[tooltipItem[0].datasetIndex].data[tooltipItem[0].index].pmc;

                                    this.lastToolTipPMC = PMC;
                                    return "PMC: "+PMC;
                                }
                            },
                            label: (tooltipItem, data)=>
                            {
                                return data.datasets[tooltipItem.datasetIndex].label+": "+parseFloat(tooltipItem.value).toFixed(3);
                            }
                        }
                    },
                    animation: false,
                    responsive: true,
                    maintainAspectRatio: false,
                    legend: {
                        display: false,
                    },
                    title: {
                        display: false
                    },
                    scales: {
                        yAxes: [{
                            id: "y",
                            type: "linear",
                            position: "left",
                            gridLines: {
                                lineWidth: 1,
                                color: Colours.UI_FOREGROUND.asString(),
                                zeroLineWidth: 2, // first line width (does not work in category type axis)
                                zeroLineColor: Colours.UI_FOREGROUND.asString(), // first line colour (does not work in category type axis)
                                /*
display: true,
color: 'rgba(0,0,0,0.1)',
lineWidth: 1,
drawBorder: true,
drawOnChartArea: true,
drawTicks: true,
tickMarkLength: 10,
zeroLineWidth: 1,
zeroLineColor: 'rgba(0,0,0,0.25)',
zeroLineBorderDash: [],
zeroLineBorderDashOffset: 0.0,
offsetGridLines: false,
borderDash: [],
borderDashOffset: 0.0
*/
                            },
                            ticks: {
                                //mirror: false, // on Y axis, draw labels on the other side of the axis line
                                //suggestedMin: -10,
                                /*callback: function(value, index, values) {
                                    return '$' + value;
                                }*/
                            },
                            scaleLabel: {
                                display: true,
                                labelString: yAxisLabel,
                                fontSize: CANVAS_FONT_SIZE,
                                padding: 0
                            }
                        }],
                        xAxes: [{
                            id: "x",
                            type: "linear", // default x is category, there's also linear, logarithmic, time
                            position: "bottom",
                            gridLines: {
                                display: true,
                                drawTicks: true, // draw a line between tick label and the axis (moves the text down a bit)
                                drawOnChartArea: true, // controls drawing tick line behind chart data
                                drawBorder: true, // border line drawing (line going perpendicular to ticks)
                                color: Colours.UI_FOREGROUND.asString(),
                                lineWidth: 1,
                                tickMarkLength: 10, // how long to draw into the axis area (among labels)
                                zeroLineWidth: 2, // first line width (does not work in category type axis)
                                zeroLineColor: Colours.UI_FOREGROUND.asString(), // first line colour (does not work in category type axis)
                                offsetGridLines: false, // shift grid lines between labels (SEEMS TO HAVE NO EFFECT?)
                                zeroLineIndex: 0,
                            },
                            //offset: false,
                            display: true, // show/hide the grid/tick/labels and scale label
                            ticks: {
                                display: true, //show/hide the label (if hidden, autoSkip is ignored so get a dense background of grid lines
                                labelOffset: 0, // pushing X labels left/right
                                autoSkip: true, // auto skip labels, or draw them as dense as possible
                                autoSkipPadding: 50, // gaps to leave around labels when autoskip enabled
                                padding: 3, // distance between labels and tick lines
                                maxRotation: 0, // there's a min/max rotation of labels that can be controlled
                                //stepSize: 100,
                                min: 0,
                                max: valueCount
                            },
                            scaleLabel: {
                                display: true,
                                labelString: xAxisLabel,
                                fontSize: CANVAS_FONT_SIZE,
                                padding: 0
                            }
                        }]
                    },
                    //showLines: false, // disable for all datasets
                    elements: {
                        line: {
                            tension: 0 // disables bezier curves
                        }
                    },
                    plugins: {
                        mouseInteraction: {
                            mouseEventCallback: (params)=>{this.onMouseEventChart(params);},
                            pan: {
                                enabledX: true,
                                enabledY: true,
                                needsSHIFT: false,
                            },
                            zoom: {
                                enabledX: true,
                                enabledY: true,
                                needsSHIFT: false,
                            },
                            rangeMin: {
                                x: 0,
                                y: 0,
                            },
                            rangeMax: {
                                x: DataSet.getSpectrumValueCount()
                            },
                            enableRangeSelect: true
                        },
                        mouseCursor: {
                            xUnit: "PMC",
                            indexToPMCFunc: (index)=> 
                            {
                                if(this.datasetService.datasetLoaded)
                                {
                                    // If we are sorted by Y and have multiple lines, we can't determine the PMC
                                    if(this.sortByY && this.scatterChart.data.datasets.length > 1)
                                    {
                                        return "multiple";
                                    }

                                    // Otherwise, just get the first dataset and use it to look up the PMC
                                    let values = this.scatterChart.data.datasets[0].data;
                                    if(index >= 0 && index < values.length)
                                    {
                                        let pmc = values[index].pmc;
                                        return pmc;
                                    }
                                }
                                return null;
                            }
                        }
                    },
                },
                plugins: [
                    chartjsPluginMouseCursor,
                    chartjsPIXLMouseInteraction
                ]
            }
        );

        console.log("Scatter plot: New chart created");
    }
}
