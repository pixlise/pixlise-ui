import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpressionSearchControlsComponent } from './expression-search-controls.component';

describe('ExpressionSearchControlsComponent', () => {
  let component: ExpressionSearchControlsComponent;
  let fixture: ComponentFixture<ExpressionSearchControlsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ExpressionSearchControlsComponent]
    });
    fixture = TestBed.createComponent(ExpressionSearchControlsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
