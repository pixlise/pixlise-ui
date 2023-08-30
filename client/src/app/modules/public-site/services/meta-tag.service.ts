import { Injectable } from "@angular/core";
import { Title, Meta } from "@angular/platform-browser";

@Injectable({
  providedIn: "root",
})
export class MetaTagService {
  constructor(
    private _titleService: Title,
    private _metaService: Meta
  ) {}

  setMeta(titleAddOn: string, description: string, keywords: string[]) {
    // Handle title setting
    let title = "PIXLISE";
    if (titleAddOn) {
      title += " | " + titleAddOn;
    }
    this._titleService.setTitle(title);

    // And the rest (note we only change them if they are non-blank)
    if (description) {
      this._metaService.removeTag("name='description'");
      this._metaService.addTag({ name: "description", content: description }, false);
    }

    if (keywords.length > 0) {
      this._metaService.removeTag("name='keywords'");
      this._metaService.addTag({ name: "keywords", content: keywords.join(", ") }, false);
    }
  }
}
