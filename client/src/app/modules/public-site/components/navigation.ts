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

export const DefaultLoggedInLink = "/datasets";

export class NavigationItem
{
    constructor(public label: string, public link: string)
    {
    } 
}

export class Navigation
{
    public categories = ["Features", "Get Started", "About Us"];

    private _categoryRoots = new Map<string, string>([
        [this.categories[0], ""],
        [this.categories[1], "/public/get-started"],
        [this.categories[2], "/public/about-us"],
    ]);

    private _categoryItems = new Map<string, NavigationItem[]>([
        [this.categories[0], [
            new NavigationItem("Workflow", "/public/workflow"),
            new NavigationItem("Quantification", "/public/quantification"),
            new NavigationItem("Investigation", "/public/investigation")
        ]],
        [this.categories[1], [
            new NavigationItem("PIXLISE Options", "/public/get-started#top"),
            new NavigationItem("Get PIXLISE", "/public/get-started#get"),
            new NavigationItem("Links and Docs", "/public/get-started#links"),
        ]],
        [this.categories[2], [
            new NavigationItem("PIXL + MARS 2020", "/public/about-us#mars2020"),
            new NavigationItem("Impact", "/public/about-us#impact"),
            new NavigationItem("Our Team", "/public/about-us#team"),
        ]]
    ]);

    public getItems(category: string): NavigationItem[]
    {
        return this._categoryItems.get(category);
    }

    public getCategoryByLink(link: string): string
    {
        for(let [cat, items] of this._categoryItems)
        {
            for(let nav of items)
            {
                if(nav.link.startsWith(link))
                {
                    return cat;
                }
            }
        }
        return "";
    }

    public getRootLink(category: string)
    {
        return this._categoryRoots.get(category);
    }
}
