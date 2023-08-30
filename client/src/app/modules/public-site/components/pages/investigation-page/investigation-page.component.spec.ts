import { ComponentFixture, TestBed } from "@angular/core/testing";

import { InvestigationPageComponent } from "./investigation-page.component";

describe("InvestigationPageComponent", () => {
  let component: InvestigationPageComponent;
  let fixture: ComponentFixture<InvestigationPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InvestigationPageComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InvestigationPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
