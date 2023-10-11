import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpressionPickerComponent } from './expression-picker.component';

describe('ExpressionPickerComponent', () => {
  let component: ExpressionPickerComponent;
  let fixture: ComponentFixture<ExpressionPickerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ExpressionPickerComponent]
    });
    fixture = TestBed.createComponent(ExpressionPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
