import { ComponentFixture, TestBed } from "@angular/core/testing";

import { ROIItemComponent } from "./roi-item.component";

describe("ROIItemComponent", () => {
  let component: ROIItemComponent;
  let fixture: ComponentFixture<ROIItemComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ROIItemComponent],
    });
    fixture = TestBed.createComponent(ROIItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
