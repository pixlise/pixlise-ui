import { ComponentFixture, TestBed } from "@angular/core/testing";

import { QuoteViewerComponent } from "./quote-viewer.component";

describe("QuoteViewerComponent", () => {
  let component: QuoteViewerComponent;
  let fixture: ComponentFixture<QuoteViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [QuoteViewerComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(QuoteViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
