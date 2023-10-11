import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpressionLayerComponent } from './expression-layer.component';

describe('ExpressionLayerComponent', () => {
  let component: ExpressionLayerComponent;
  let fixture: ComponentFixture<ExpressionLayerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ExpressionLayerComponent]
    });
    fixture = TestBed.createComponent(ExpressionLayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
