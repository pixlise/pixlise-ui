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

import { Component, Inject, OnInit } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { DataExpression } from "src/app/models/Expression";

export class DOIPublishData
{
    constructor(
        public expression: DataExpression,
        public isModule: boolean,
        public version: string = null,
    )
    {
    }
}

export class DOICreator
{
    constructor(
        public name: string = "",
        public affiliation: string = "",
        public orcid: string = "",
    )
    {
    }
}

export class DOIContributor
{
    static AffiliationTypes = ["ContactPerson", "DataCollector", "DataCurator", "DataManager", "Distributor", "Editor", "HostingInstitution", "Producer", "ProjectLeader", "ProjectManager", "ProjectMember", "RegistrationAgency", "RegistrationAuthority", "RelatedPerson", "Researcher", "ResearchGroup", "RightsHolder", "Supervisor", "Sponsor", "WorkPackageLeader", "Other"];

    constructor(
        public name: string = "",
        public type: "ContactPerson" | "DataCollector" | "DataCurator" | "DataManager" | "Distributor" | "Editor" | "HostingInstitution" | "Producer" | "ProjectLeader" | "ProjectManager" | "ProjectMember" | "RegistrationAgency" | "RegistrationAuthority" | "RelatedPerson" | "Researcher" | "ResearchGroup" | "RightsHolder" | "Supervisor" | "Sponsor" | "WorkPackageLeader" | "Other" = null,
        public affiliation: string = "",
        public orcid: string = "",
    )
    {
    }
}


export class DOIRelatedID
{
    static RelationTypes = ["isCitedBy", "cites", "isSupplementTo", "isSupplementedBy", "isContinuedBy", "continues", "isDescribedBy", "describes", "hasMetadata", "isMetadataFor", "isNewVersionOf", "isPreviousVersionOf", "isPartOf", "hasPart", "isReferencedBy", "references", "isDocumentedBy", "documents", "isCompiledBy", "compiles", "isVariantFormOf", "isOriginalFormof", "isIdenticalTo", "isAlternateIdentifier", "isReviewedBy", "reviews", "isDerivedFrom", "isSourceOf", "requires", "isRequiredBy", "isObsoletedBy", "obsoletes"];

    constructor(
        public identifier: string = "",
        public relation: "isCitedBy" | "cites" | "isSupplementTo" | "isSupplementedBy" | "isContinuedBy" | "continues" | "isDescribedBy" | "describes" | "hasMetadata" | "isMetadataFor" | "isNewVersionOf" | "isPreviousVersionOf" | "isPartOf" | "hasPart" | "isReferencedBy" | "references" | "isDocumentedBy" | "documents" | "isCompiledBy" | "compiles" | "isVariantFormOf" | "isOriginalFormof" | "isIdenticalTo" | "isAlternateIdentifier" | "isReviewedBy" | "reviews" | "isDerivedFrom" | "isSourceOf" | "requires" | "isRequiredBy" | "isObsoletedBy" | "obsoletes" = null,
    )
    {
    }
}

export class DOIMetadata
{
    constructor(
        public title: string = "",
        public creators: DOICreator[] = [],
        public description: string = "",
        public keywords: string = "",
        public notes: string = "",
        public relatedIdentifiers: DOIRelatedID[] = [],
        public contributors: DOIContributor[] = [],
        public references: string = "",
        public version: string = "",

        // Injected after creation
        public doi: string = "",
        public doiBadge: string = "",
        public doiLink: string = "",
    )
    {
    }
}

@Component({
    selector: "doi-publish-dialog",
    templateUrl: "./doi-publish-dialog.component.html",
    styleUrls: ["./doi-publish-dialog.component.scss"]
})
export class DOIPublishDialog implements OnInit
{
    doiMetadata: DOIMetadata = new DOIMetadata();

    affiliationTypes = DOIContributor.AffiliationTypes;
    relationTypes = DOIRelatedID.RelationTypes;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: DOIPublishData,
        public dialogRef: MatDialogRef<DOIPublishDialog>,
    )
    {
        if(!this.data.expression.doiMetadata || this.data.expression.doiMetadata.title === "")
        {
            this.formNewMetadata();
        }
        else
        {
            let relatedIDs = this.data.expression.doiMetadata?.relatedIdentifiers || [];
            if(this.data.expression.doiMetadata.doi)
            {
                relatedIDs = [...relatedIDs, new DOIRelatedID(this.data.expression.doiMetadata.doi, "isPreviousVersionOf")];
            }

            this.doiMetadata = new DOIMetadata(
                this.data.expression.doiMetadata?.title,
                this.data.expression.doiMetadata?.creators,
                this.data.expression.doiMetadata?.description,
                this.data.expression.doiMetadata?.keywords,
                this.data.expression.doiMetadata?.notes,
                relatedIDs,
                this.data.expression.doiMetadata?.contributors,
                this.data.expression.doiMetadata?.references,
                this.data.expression.doiMetadata?.version
            );
        }
    }

    ngOnInit(): void
    {
        this.formNewMetadata();
    }

    formNewMetadata(): void
    {
        this.doiMetadata.title = this.data.expression.name;
        if(this.doiMetadata.creators.length === 0)
        {
            this.doiMetadata.creators.push(new DOICreator(this.data.expression.creator.name));
        }
        if(this.data.isModule)
        {
            this.doiMetadata.description = `Lua module created using PIXLISE (https://pixlise.org). ${this.data.expression.comments}`;
            this.doiMetadata.version = this.data.version;
        }
        else
        {
            this.doiMetadata.description = `Expression created using PIXLISE (https://pixlise.org). ${this.data.expression.comments}`;
        }
    }

    addCreator(): void
    {
        this.doiMetadata.creators.push(new DOICreator());
    }

    removeCreator(index: number): void
    {
        this.doiMetadata.creators.splice(index, 1);
    }

    addContributor(): void
    {
        this.doiMetadata.contributors.push(new DOIContributor());
    }

    removeContributor(index: number): void
    {
        this.doiMetadata.contributors.splice(index, 1);
    }

    addRelatedDOI(): void
    {
        this.doiMetadata.relatedIdentifiers.push(new DOIRelatedID());
    }

    removeRelatedDOI(index: number): void
    {
        this.doiMetadata.relatedIdentifiers.splice(index, 1);
    }

    onSave(): void
    {
        this.dialogRef.close(this.doiMetadata);
    }

    onCancel(): void
    {
        this.dialogRef.close();
    }
}
