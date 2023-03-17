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

import { Component, Input, OnInit } from "@angular/core";
import { DataExpression } from "src/app/models/Expression";
import { DataModuleVersionSourceWire } from "src/app/services/data-module.service";

type MajorGroupedRelease = {
    majorVersion: DataModuleVersionSourceWire;
    minorVersions: DataModuleVersionSourceWire[];
}

@Component({
    selector: "expression-metadata-editor",
    templateUrl: "./expression-metadata-editor.component.html",
    styleUrls: ["./expression-metadata-editor.component.scss"]
})
export class ExpressionMetadataEditorComponent implements OnInit
{
    @Input() expression: DataExpression = null;
    @Input() isModule: boolean = false;
    @Input() currentVersion: DataModuleVersionSourceWire = null;
    @Input() versions: DataModuleVersionSourceWire[] = [];

    private _fetched: boolean = false;
    private _releaseNotes: MajorGroupedRelease[] = [];

    constructor()
    {
        this.groupReleaseNotes();
    }

    ngOnInit(): void
    {
        this.groupReleaseNotes();
    }

    get name(): string
    {
        return this.expression.name;
    }

    set name(value: string)
    {
        this.expression.name = value;
    }

    get description(): string
    {
        return this.expression.comments;
    }

    set description(value: string)
    {
        this.expression.comments = value;
    }

    get tags(): string[]
    {
        return this.expression.tags;
    }

    set tags(value: string[])
    {
        this.expression.tags = value;
    }

    onTagSelectionChanged(tags: string[]): void
    {
        this.tags = tags;
    }

    get releaseNotes(): MajorGroupedRelease[]
    {
        if(!this._fetched && this.isModule && this.versions.length > 0)
        {
            this._fetched = true;
            this.groupReleaseNotes();
        }
        return this._releaseNotes;
    }

    set releaseNotes(value: MajorGroupedRelease[])
    {
        this._releaseNotes = value;
    }

    groupReleaseNotes(): void
    {
        let majorRelease: Record<string, MajorGroupedRelease> = {};
        this.versions.forEach((specificVersion) =>
        {
            let versionParts = specificVersion.version.split(".");
            let majorVersion = versionParts[0];
            let minorVersion = versionParts[1];
            let isMinorRelease = versionParts[2] === "0";
            let isMajorRelease = isMinorRelease && minorVersion === "0";

            let majorVersionGroup = !isMajorRelease ? majorVersion : `${Number(majorVersion) - 1}`;

            if(isMajorRelease)
            {
                majorRelease[majorVersionGroup] = {
                    majorVersion: specificVersion,
                    minorVersions: majorRelease[majorVersionGroup]?.minorVersions || []
                };
            }
            else if(isMinorRelease && majorRelease[majorVersionGroup])
            {
                majorRelease[majorVersionGroup].minorVersions.push(specificVersion);
            }
            else if(isMinorRelease)
            {
                majorRelease[majorVersionGroup] = {
                    majorVersion: null,
                    minorVersions: [specificVersion]
                };
            }
        });

        this.releaseNotes = Object.values(majorRelease).sort((a, b) =>
        {
            let aMajorVersion = a.majorVersion?.version.split(".")[0];
            let bMajorVersion = b.majorVersion?.version.split(".")[0];
            return Number(bMajorVersion) - Number(aMajorVersion);
        });
    }

    getVersionDisplayName(version: DataModuleVersionSourceWire): string
    {
        let versionParts = version.version.split(".");
        let majorVersion = versionParts[0];
        let minorVersion = versionParts[1];

        return `${majorVersion}.${minorVersion}`;
    }

    getVersionReleaseDate(version: DataModuleVersionSourceWire): string
    {
        let unixTimeSec = version.mod_unix_time_sec;

        return new Date(unixTimeSec * 1000).toLocaleDateString();
    }
}
