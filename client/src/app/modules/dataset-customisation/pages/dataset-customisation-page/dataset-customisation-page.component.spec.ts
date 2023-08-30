import { ComponentFixture, TestBed } from "@angular/core/testing";

import { DatasetCustomisationPageComponent } from "./dataset-customisation-page.component";

describe("DatasetCustomisationPageComponent", () => {
  let component: DatasetCustomisationPageComponent;
  let fixture: ComponentFixture<DatasetCustomisationPageComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DatasetCustomisationPageComponent],
    });
    fixture = TestBed.createComponent(DatasetCustomisationPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
