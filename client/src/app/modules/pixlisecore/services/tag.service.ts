import { Injectable } from "@angular/core";
import { SnackbarService } from "./snackbar.service";
import { Tag } from "src/app/generated-protos/tags";
import { APIDataService } from "./apidata.service";
import { TagListReq } from "src/app/generated-protos/tag-msgs";

export type TagType = "expression" | "dataset" | "expression-mix" | "roi";

@Injectable({
  providedIn: "root",
})
export class TagService {
  tags: Tag[] = [];

  constructor(
    private _snackBar: SnackbarService,
    private _dataService: APIDataService
  ) {
    this.fetchAllTags();
  }

  fetchAllTags() {
    this._dataService.sendTagListRequest(TagListReq.create({})).subscribe({
      next: res => {
        this.tags = res.tags;
      },
      error: err => {
        console.error(err);
        this._snackBar.openError(err);
      },
    });
  }

  createTag(name: string, type: TagType, scanId: string = "") {
    return this._dataService.sendTagCreateRequest(Tag.create({ name, type, scanId })).subscribe({
      next: res => {
        if (res.tag) {
          this.tags.push(res.tag);
          this._snackBar.openSuccess(`Tag "${name}" created.`);
        }
      },
      error: err => {
        console.error(err);
        this._snackBar.openError(err);
      },
    });
  }
}
