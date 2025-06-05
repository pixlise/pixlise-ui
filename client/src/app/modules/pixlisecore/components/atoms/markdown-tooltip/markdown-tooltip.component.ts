import { Component, Input, ViewEncapsulation } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MarkdownModule } from "ngx-markdown";

@Component({
  selector: "markdown-tooltip",
  standalone: true,
  imports: [CommonModule, MarkdownModule],
  templateUrl: "./markdown-tooltip.component.html",
  styleUrls: ["./markdown-tooltip.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class MarkdownTooltipComponent {
  @Input() content: string = "";
}
