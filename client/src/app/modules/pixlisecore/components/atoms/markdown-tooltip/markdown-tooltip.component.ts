import { Component, Input, ViewEncapsulation } from '@angular/core';

import { MarkdownModule } from 'ngx-markdown';

@Component({
  standalone: true,
  selector: 'markdown-tooltip',
  imports: [MarkdownModule],
  templateUrl: './markdown-tooltip.component.html',
  styleUrls: ['./markdown-tooltip.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class MarkdownTooltipComponent {
  @Input() content: string = '';
}
