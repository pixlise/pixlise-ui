import { ComponentFixture, TestBed } from "@angular/core/testing";

import { PiquantVersionComponent } from "./piquant-version.component";

describe("PiquantVersionComponent", () => {
  let component: PiquantVersionComponent;
  let fixture: ComponentFixture<PiquantVersionComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PiquantVersionComponent],
    });
    fixture = TestBed.createComponent(PiquantVersionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
