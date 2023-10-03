import { ComponentFixture, TestBed } from "@angular/core/testing";

import { ROIShapeComponent } from "./roi-shape.component";

describe("ROIShapeComponent", () => {
  let component: ROIShapeComponent;
  let fixture: ComponentFixture<ROIShapeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ROIShapeComponent],
    });
    fixture = TestBed.createComponent(ROIShapeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
