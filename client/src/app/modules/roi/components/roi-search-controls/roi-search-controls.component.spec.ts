import { ComponentFixture, TestBed } from "@angular/core/testing";

import { ROISearchControlsComponent } from "./roi-search-controls.component";

describe("ROISearchControlsComponent", () => {
  let component: ROISearchControlsComponent;
  let fixture: ComponentFixture<ROISearchControlsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ROISearchControlsComponent],
    });
    fixture = TestBed.createComponent(ROISearchControlsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
