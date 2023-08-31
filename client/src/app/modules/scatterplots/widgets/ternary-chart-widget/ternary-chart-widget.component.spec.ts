import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TernaryChartWidgetComponent } from './ternary-chart-widget.component';

describe('TernaryChartWidgetComponent', () => {
  let component: TernaryChartWidgetComponent;
  let fixture: ComponentFixture<TernaryChartWidgetComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TernaryChartWidgetComponent]
    });
    fixture = TestBed.createComponent(TernaryChartWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
