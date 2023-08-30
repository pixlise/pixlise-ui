import { ComponentFixture, TestBed } from "@angular/core/testing";

import { QuantLogsPageComponent } from "./quant-logs-page.component";

describe("QuantLogsPageComponent", () => {
  let component: QuantLogsPageComponent;
  let fixture: ComponentFixture<QuantLogsPageComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [QuantLogsPageComponent],
    });
    fixture = TestBed.createComponent(QuantLogsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
