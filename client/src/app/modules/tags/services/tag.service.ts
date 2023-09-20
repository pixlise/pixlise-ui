import { Injectable } from "@angular/core";
import { SnackbarService } from "../../pixlisecore/services/snackbar.service";
import { Tag } from "src/app/generated-protos/tags";
import { APIDataService } from "../../pixlisecore/services/apidata.service";
import { TagCreateReq, TagDeleteReq, TagListReq } from "src/app/generated-protos/tag-msgs";
import { BuiltInTags, TagType } from "../models/tag.model";
import { BehaviorSubject } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class TagService {
  tags: Tag[] = [];
  tags$ = new BehaviorSubject<Map<string, Tag>>(new Map<string, Tag>());

  constructor(
    private _snackBar: SnackbarService,
    private _dataService: APIDataService
  ) {
    this.fetchAllTags();
  }

  fetchAllTags() {
    this._dataService.sendTagListRequest(TagListReq.create({})).subscribe({
      next: res => {
        if (res.tags.length === this.tags.length) {
          // Check if tags are the same
          let tagsChanged = false;
          for (let i = 0; i < res.tags.length; i++) {
            if (res.tags[i].id !== this.tags[i].id) {
              tagsChanged = true;
              break;
            }
          }

          if (!tagsChanged) {
            // Tags are the same, don't update
            return;
          }
        }

        this.tags = res.tags;

        let tagsMap = this._getBuiltInTags();
        res.tags.forEach(tag => {
          tagsMap.set(tag.id, tag);
        });
        this.tags$.next(tagsMap);
      },
      error: err => {
        console.error(err);
        this._snackBar.openError(err);
        this.tags$.next(new Map<string, Tag>());
      },
    });
  }

  // Fixed list of built-in tags that can be assigned by users with privilege, but not edited
  private _getBuiltInTags(): Map<string, Tag> {
    let tags = new Map<string, Tag>([
      [
        BuiltInTags.exampleTag,
        Tag.create({
          id: BuiltInTags.exampleTag,
          name: "Example",
          type: BuiltInTags.type,
          owner: {
            id: "Built-in",
            name: "Built-in",
          },
        }),
      ],
    ]);

    return tags;
  }

  createTag(name: string, type: TagType, scanId: string = "") {
    return this._dataService.sendTagCreateRequest(TagCreateReq.create({ name, type, scanId })).subscribe({
      next: res => {
        if (res.tag) {
          this.tags.push(res.tag);
          this.tags$.next(this.tags$.value.set(res.tag.id, res.tag));
          this._snackBar.openSuccess(`Tag "${name}" created.`);
        }
      },
      error: err => {
        console.error(err);
        this._snackBar.openError(err);
      },
    });
  }

  deleteTag(tagId: string) {
    return this._dataService.sendTagDeleteRequest(TagDeleteReq.create({ tagId })).subscribe({
      next: res => {
        let tagName = this.tags$.value.get(tagId)?.name || tagId;

        this.tags = this.tags.filter(tag => tag.id !== tagId);
        if (this.tags$.value.delete(tagId)) {
          this.tags$.next(this.tags$.value);
        }
        this._snackBar.openSuccess(`Tag "${tagName}" deleted.`);
      },
      error: err => {
        console.error(err);
        this._snackBar.openError(err);
      },
    });
  }
}
