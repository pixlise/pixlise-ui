import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TextWithHighlightsComponent } from './text-with-highlights.component';

describe('TextWithHighlightsComponent', () => {
  let component: TextWithHighlightsComponent;
  let fixture: ComponentFixture<TextWithHighlightsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TextWithHighlightsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TextWithHighlightsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
