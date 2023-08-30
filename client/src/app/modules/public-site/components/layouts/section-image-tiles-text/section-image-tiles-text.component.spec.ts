import { ComponentFixture, TestBed } from "@angular/core/testing";

import { SectionImageTilesTextComponent } from "./section-image-tiles-text.component";

describe("SectionImageTilesTextComponent", () => {
  let component: SectionImageTilesTextComponent;
  let fixture: ComponentFixture<SectionImageTilesTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SectionImageTilesTextComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SectionImageTilesTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
