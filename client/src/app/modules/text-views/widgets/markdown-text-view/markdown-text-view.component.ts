import { Component, OnDestroy, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { MarkdownViewState } from "src/app/generated-protos/widget-data";
import { BaseWidgetModel } from "src/app/modules/widget/models/base-widget.model";

@Component({
  selector: "app-markdown-text-view",
  templateUrl: "./markdown-text-view.component.html",
  styleUrls: ["./markdown-text-view.component.scss"],
})
export class MarkdownTextViewComponent extends BaseWidgetModel implements OnInit, OnDestroy {
  private _subs = new Subscription();

  content: string = "";
  editMode: boolean = false;
  userCanEdit: boolean = true;

  constructor(public dialog: MatDialog) {
    super();

    this._widgetControlConfiguration = {
      topToolbar: [
        // {
        //   id: "refs",
        //   type: "button",
        //   title: "Refs",
        //   tooltip: "Choose reference areas to display",
        //   onClick: () => this.onReferences(),
        // },
        {
          id: "edit",
          type: "button",
          icon: "assets/button-icons/edit.svg",
          tooltip: "Toggle editing or viewing of text content",
          onClick: (val, event) => this.onToggleEdit(),
        },
      ],
    };
  }

  ngOnInit() {
    /* TODO: disable edit feature if user is only a viewer of this workspace! AuthService was the wrong approach...
    this._subs.add(
      this._authService.idTokenClaims$.subscribe({
        next: claims => {
          if (claims) {
            const btns = this._widgetControlConfiguration.topToolbar;
            if (btns && btns.length === 1) {
              btns[0].disabled = 
            }

            this._userCanEdit = Permissions.hasPermissionSet(claims, Permissions.permissionEditDataset);
          }
        },
      })
    );
    */

    this._subs.add(
      this.widgetData$.subscribe((data: any) => {
        const markdownState: MarkdownViewState = data as MarkdownViewState;

        if (markdownState) {
          this.content = markdownState.content;
        }

        this.isWidgetDataLoading = false;
      })
    );

    this.updateStateButton();
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  onToggleEdit() {
    if (this.editMode) {
      // Edit mode, so we're now saving...
      const state = MarkdownViewState.create({ content: this.content });
      this.onSaveWidgetData.emit(state);
    }

    this.editMode = !this.editMode;
    this.updateStateButton();
  }

  get markdownHelp(): string {
    return `Markdown supported. Examples:

# Heading
## Sub-heading
**Bold text**
__Italic text__
- Dot point
Paragraph text
`;
  }

  private updateStateButton() {
    const btns = this._widgetControlConfiguration.topToolbar;
    if (btns && btns.length === 1) {
      btns[0].icon = this.editMode ? "" : "assets/button-icons/edit.svg";
      btns[0].title = this.editMode ? "Save" : "";
    }
  }
}
