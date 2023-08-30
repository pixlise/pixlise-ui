import { ComponentFixture, TestBed } from "@angular/core/testing";

import { AnalysisSidepanelComponent } from "./analysis-sidepanel.component";

describe("AnalysisSidepanelComponent", () => {
  let component: AnalysisSidepanelComponent;
  let fixture: ComponentFixture<AnalysisSidepanelComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AnalysisSidepanelComponent],
    });
    fixture = TestBed.createComponent(AnalysisSidepanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
