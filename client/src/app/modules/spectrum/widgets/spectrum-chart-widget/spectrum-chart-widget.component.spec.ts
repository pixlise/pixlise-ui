import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpectrumChartWidgetComponent } from './spectrum-chart-widget.component';

describe('SpectrumChartWidgetComponent', () => {
  let component: SpectrumChartWidgetComponent;
  let fixture: ComponentFixture<SpectrumChartWidgetComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SpectrumChartWidgetComponent]
    });
    fixture = TestBed.createComponent(SpectrumChartWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
