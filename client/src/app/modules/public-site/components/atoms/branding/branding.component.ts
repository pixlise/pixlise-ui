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

@Component({
  standalone: false,
  selector: "branding-logos",
  templateUrl: "./branding.component.html",
  styleUrls: ["./branding.component.scss"],
})
export class BrandingComponent implements OnInit {
  logos: string[][] = [
    ["/assets/images/footer/gray-nasa-tribrand-logo.svg", "https://www.jpl.nasa.gov", "NASA Jet Propultion Lab"],
    ["assets/images/footer/gray-qut-logo.svg", "https://www.qut.edu.au", "Queensland University of Technology"],
    ["assets/images/footer/gray-dtu-logo.svg", "https://www.dtu.dk", "Technical University of Denmark"],
    ["assets/images/footer/gray-uw-logo.svg", "https://www.washington.edu", "University of Washington"],
    ["assets/images/footer/gray-texas-am-logo.svg", "https://www.tamu.edu", "Texas A&M University"],
    ["assets/images/footer/gray-stonybrook-logo.svg", "https://www.stonybrook.edu", "Stony Brook University"],
  ];

  constructor() {}

  ngOnInit(): void {}
}
