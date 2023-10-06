import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistogramWidgetComponent } from './histogram-widget.component';

describe('HistogramWidgetComponent', () => {
  let component: HistogramWidgetComponent;
  let fixture: ComponentFixture<HistogramWidgetComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [HistogramWidgetComponent]
    });
    fixture = TestBed.createComponent(HistogramWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
