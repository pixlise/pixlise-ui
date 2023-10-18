import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SingleScanEnergyCalibrationComponent } from './single-scan-energy-calibration.component';

describe('SingleScanEnergyCalibrationComponent', () => {
  let component: SingleScanEnergyCalibrationComponent;
  let fixture: ComponentFixture<SingleScanEnergyCalibrationComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SingleScanEnergyCalibrationComponent]
    });
    fixture = TestBed.createComponent(SingleScanEnergyCalibrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
