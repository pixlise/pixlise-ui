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

import { Component, OnInit } from "@angular/core";

import { SectionImageListTextInputs, SectionImageItemContent } from "../../layouts/section-image-list-text/section-image-list-text.component";
import { NumberButtonParams } from "../../atoms/number-button/number-button.component";
import { MetaTagService } from "../../../services/meta-tag.service";

@Component({
  selector: "app-investigation-page",
  templateUrl: "./investigation-page.component.html",
  styleUrls: ["./investigation-page.component.scss"],
})
export class InvestigationPageComponent implements OnInit {
  description = "Intricately-interconnected and customizable tools that grow with your geoscientific knowledge.";
  suiteParams = new SectionImageListTextInputs(
    new NumberButtonParams("01", "Sample Investigation", "red", false, false, ""),
    ["A comprehensive ", "suite", " of interactive visualization tools to quickly explore an unknown sample."],
    false,
    "Investigate:",
    [
      new SectionImageItemContent(
        "Context Image",
        ["Spatial Co-Location"],
        [
          "Scan point location is indispensible for geochemical understanding. The PIXLISE context image can display base layer images, spectral point locations, quantified element maps, and custom expression maps, all precisely co-located.",
        ],
        "assets/images/investigation/sample-context-image.png",
        ""
      ),
      new SectionImageItemContent(
        "Spectral Point Selection",
        ["Investigate Each and Every Point in your Scan"],
        [
          "In PIXLISE, every view is linked. Ever wonder if a particular clast has high Ti content? Simply circle it on the context image, and you'll see it's weight percent in the binary and ternary chart. Want to know where the highest Fe regions are in your scan, circle the highest values in the binary chart, and see where they are in the context image. PIXLISE selection allows you to investigate your data with total transparency.",
        ],
        "assets/images/investigation/sample-spectral-point-selection.png",
        ""
      ),
      new SectionImageItemContent(
        "Binary + Ternary Plot",
        ["The Classic Geology Diagrams, with a PIXLISE Twist"],
        [
          "These might look like the timeless, basic diagrams you've seen your whole life, but this is the next generation. With two clicks, you can assign any element to any axis or vertex of your diagram. Assign a color to a Region of Interest, and see where it falls in relation to any elemental weight percent with the push of a button. They are even selectable and interlinked, circle a set of points on your binary, and instantly see where they are on every other plot.",
        ],
        "assets/images/investigation/sample-binary-ternary.png",
        ""
      ),
      new SectionImageItemContent(
        "Spectrtum Chart",
        ["It's Your Instrument's Raw Data, but Better"],
        [
          "The energy counts across the spectrum are the purest representation of an XRF measurement. In PIXLISE, this visualization comes alive. Overlay the characteristic energy emission lines of any element simply by hovering over it. Select a group of spectral points from another plot, and instantly see the bulk sum spectrum of those points. You can assign a Region of Interest a color, and visualize as many as you need, and even normalize them by counts per second.",
        ],
        "assets/images/investigation/sample-spectrum-chart.png",
        ""
      ),
      new SectionImageItemContent(
        "Quantified Element Maps",
        ["High Speed, Accurate Elemental Characterization, like You've Never Seen Before"],
        [
          "PIQUANT delivers rapid and highly precise quantification. PIXLISE will immediately transform that data into visual maps and lay everything out for you clearly. Then, you'll see directly into the geochemical composition of your scan, faster than ever before.",
        ],
        "assets/images/investigation/sample-quantified-element-maps.png",
        ""
      ),
      new SectionImageItemContent(
        "Chord Diagram",
        ["A Breakthrough, Novel Visualization"],
        [
          "The Chord Diagram was designed to enable maximum insight by delivering as many numeric dimensions of a dataset as possible, while still being readable. This plot shows the spatial relationships of every element in your dataset, as well as the weight percent, and error measurements. This super-summary will guide you immediately toward where to start your investigation.",
        ],
        "assets/images/investigation/sample-chord-diagram.png",
        ""
      ),
      new SectionImageItemContent(
        "Quantified Element Table",
        ["Are You a Numbers Person? (of course you are) Well, PIXLISE Has Them All Right Here for You"],
        [
          "While you may want to download and examine your data in Excel, which we support fully, PIXLISE has all of the quantified weight percentages for each element in your data set already organized into a table for you. What's more, it's interactive: it responds to selection, and displays Regions of Interest weight percents with a single click.",
        ],
        "assets/images/investigation/sample-quantified-element-table.png",
        ""
      ),
      new SectionImageItemContent(
        "Histogram",
        ["A Simple Visualization, With a Bit More Accuracy"],
        [
          "Everyone loves a good box and whisker plot, but, it obscures some of the complexity in the topology of your data. The PIXLISE histogram delivers greater clarity by representing each spectral point as a single line in the plot, this allows you to view the real distribution of your data without abstracting it away. Still want to see those average, standard deviation, and error numbers? Don't worry, they're available on hover.",
        ],
        "assets/images/investigation/sample-histogram.png",
        ""
      ),
    ]
  );

  expressionParams = new SectionImageListTextInputs(
    new NumberButtonParams("02", "Scripted Geochemical Definitions", "red", false, false, ""),
    ["Define bespoke mineral and crystalline definitions with self-composed and shareable ", "expressions."],
    false,
    "PIXLISE Expression Language",
    [
      new SectionImageItemContent(
        "Element Definition",
        ["PIXLISE Integrates the Lua Scripting Language to Implement Geochemical Definitions"],
        [
          "The most basic definition is an element map, which reports the quantified weight percent of a single element at every point in a scan. PIXLISE will deliver the element maps for each element you define in a quantification, so you don't need to create these yourself, however they can be used as building block to perform much more complex operations.",
        ],
        "assets/images/investigation/expr-element-definition.png",
        ""
      ),
      new SectionImageItemContent(
        "Variables and Operations",
        ["Store Customized Values, Calculations, and Ratios as Variables, then Modify them to Create what you Need"],
        [
          "PIXLISE enables you to define anything from a single integer, to an entire table of quantified elemental weight percents as a named variable. Once defined, a variable can be used in more complex operations: arithmetic, iteration, conditional branching, and any other modification that a Turing complete language has to offer can be applied.",
        ],
        "assets/images/investigation/expr-variables-operations.png",
        ""
      ),
      new SectionImageItemContent(
        "Mineral Definition",
        ["Combine the Basics to Create Complex and Precise Geochemical Definitions"],
        [
          "PIXLISE allows you to go beyond simple element definitions and mineral component ratios. You will be able to describe analyses that remove diffraction artifacts, account for surface roughness, or correctly assess the difference between oxide and carbonate phases of minerals. The flexibility of the PIXLISE expression language will support and enable you to move your research forward.",
        ],
        "assets/images/investigation/expr-mineral-definition.png",
        ""
      ),
      new SectionImageItemContent(
        "Modules and Sharing",
        ["Science Requires Collaboration, the PIXLISE Expression Language Makes this Easier than Ever Before"],
        [
          "Every scientist has their specialty, and the expression language will allow you to crystallize your knowledge into apprehensible and externalized pieces of code. But what if you could access your entire team or lab's knowledge, and implement it in support of your research? PIXLISE allows you to create and share modules, which are libraries of code that anyone on your team can install and utilize, enabling you to truly combine all of your specialities.",
        ],
        "assets/images/investigation/expr-modules-sharing.png",
        ""
      ),
    ]
  );

  diffractionParams = new SectionImageListTextInputs(
    new NumberButtonParams("03", "Anomaly Detection", "red", false, false, ""),
    ["Intelligent diffraction peak detection for all your quantification and analysis needs."],
    false,
    "Demonstrate",
    [
      new SectionImageItemContent(
        "Assess patterns across a sample",
        ["Specialized features designed for instruments with multiple detectors."],
        [
          "Ensure maximum data accuracy and ",
          "infer crystalline alignment",
          " with PIXLISE's anomoly detection features. With ",
          "automated diffraction detection",
          " and ",
          "custom-scripting removal",
          " features, visualize, identify, and resolve diffraction issues swiftly.",
        ],
        "assets/images/investigation/anim-diffraction.gif",
        ""
      ) /*
            new SectionImageItemContent(
                "Inspect individual detected peaks",
                ["Insert ", "Heading", " Here"],
                ["Insert ", "Description", " Here."],
                "",
                ""
            ),
            new SectionImageItemContent(
                "Localize areas of surface roughness",
                ["Insert ", "Heading", " Here"],
                ["Insert ", "Description", " Here."],
                "",
                ""
            ),
            new SectionImageItemContent(
                "Remove anomolies with expressions",
                ["Insert ", "Heading", " Here"],
                ["Insert ", "Description", " Here."],
                "",
                ""
            ),*/,
    ]
  );

  constructor(private _metaTagService: MetaTagService) {}

  ngOnInit(): void {
    this._metaTagService.setMeta("Investigation", this.description, []);
  }
}
