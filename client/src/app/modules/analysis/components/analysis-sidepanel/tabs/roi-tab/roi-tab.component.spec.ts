import { ComponentFixture, TestBed } from "@angular/core/testing";

import { ROITabComponent } from "./roi-tab.component";

describe("ROITabComponent", () => {
  let component: ROITabComponent;
  let fixture: ComponentFixture<ROITabComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ROITabComponent],
    });
    fixture = TestBed.createComponent(ROITabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
