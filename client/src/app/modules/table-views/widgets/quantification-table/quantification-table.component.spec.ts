import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuantificationTableComponent } from './quantification-table.component';

describe('QuantificationTableComponent', () => {
  let component: QuantificationTableComponent;
  let fixture: ComponentFixture<QuantificationTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [QuantificationTableComponent]
    });
    fixture = TestBed.createComponent(QuantificationTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
