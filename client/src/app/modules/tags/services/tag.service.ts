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
  private _lastChecked: number = 0;
  private _cachedTags: Tag[] = [];
  tags$ = new BehaviorSubject<Map<string, Tag>>(new Map<string, Tag>());

  // Don't check more than once a minute
  static MAX_CHECK_INTERVAL = 60 * 1000;

  constructor(
    private _snackBar: SnackbarService,
    private _dataService: APIDataService
  ) {
    this.fetchAllTags();
  }

  fetchAllTags() {
    // Don't request if we checked less than the max check interval
    if (Date.now() - this._lastChecked < TagService.MAX_CHECK_INTERVAL) {
      return;
    }

    // We have to update this before the request is sent, otherwise all calls made before returning will trigger another request
    this._lastChecked = Date.now();

    this._dataService.sendTagListRequest(TagListReq.create({})).subscribe({
      next: res => {
        if (res.tags.length === this._cachedTags.length) {
          // Check if tags are the same
          let tagsChanged = false;
          for (let i = 0; i < res.tags.length; i++) {
            if (res.tags[i].id !== this._cachedTags[i].id) {
              tagsChanged = true;
              break;
            }
          }

          if (!tagsChanged) {
            // Tags are the same, don't update
            return;
          }
        }

        this._cachedTags = res.tags;

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
      [
        BuiltInTags.variogramComparisonAlgorithm,
        Tag.create({
          id: BuiltInTags.variogramComparisonAlgorithm,
          name: "Variogram Comparison Algorithm",
          type: BuiltInTags.type,
          owner: {
            id: "Built-in",
            name: "Built-in",
          },
        }),
      ],
      [
        BuiltInTags.variogramMap,
        Tag.create({
          id: BuiltInTags.variogramMap,
          name: "Variogram Map Expression",
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
          this._cachedTags.push(res.tag);
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

        this._cachedTags = this._cachedTags.filter(tag => tag.id !== tagId);
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
