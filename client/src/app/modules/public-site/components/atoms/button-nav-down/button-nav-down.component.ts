import { Component, OnInit, Input } from "@angular/core";


@Component({
    selector: "button-nav-down",
    templateUrl: "./button-nav-down.component.html",
    styleUrls: ["./button-nav-down.component.scss"]
})
export class ButtonNavDownComponent implements OnInit
{
      @Input() link: string;
  
      constructor()
      {
      }
  
      ngOnInit(): void
      {
      }
}
