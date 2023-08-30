import { ComponentFixture, TestBed } from "@angular/core/testing";

import { PiquantDownloadsComponent } from "./piquant-downloads.component";

describe("PiquantDownloadsComponent", () => {
  let component: PiquantDownloadsComponent;
  let fixture: ComponentFixture<PiquantDownloadsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PiquantDownloadsComponent],
    });
    fixture = TestBed.createComponent(PiquantDownloadsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
