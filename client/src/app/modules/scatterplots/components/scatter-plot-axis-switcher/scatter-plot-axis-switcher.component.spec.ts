import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScatterPlotAxisSwitcherComponent } from './scatter-plot-axis-switcher.component';

describe('ScatterPlotAxisSwitcherComponent', () => {
  let component: ScatterPlotAxisSwitcherComponent;
  let fixture: ComponentFixture<ScatterPlotAxisSwitcherComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ScatterPlotAxisSwitcherComponent]
    });
    fixture = TestBed.createComponent(ScatterPlotAxisSwitcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
