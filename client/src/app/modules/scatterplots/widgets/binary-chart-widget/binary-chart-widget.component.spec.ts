import { ComponentFixture, TestBed } from "@angular/core/testing";

import { BinaryChartWidgetComponent } from "./binary-chart-widget.component";

describe("BinaryChartWidgetComponent", () => {
  let component: BinaryChartWidgetComponent;
  let fixture: ComponentFixture<BinaryChartWidgetComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BinaryChartWidgetComponent],
    });
    fixture = TestBed.createComponent(BinaryChartWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
