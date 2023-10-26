import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContextImageComponent } from './context-image.component';

describe('ContextImageComponent', () => {
  let component: ContextImageComponent;
  let fixture: ComponentFixture<ContextImageComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ContextImageComponent]
    });
    fixture = TestBed.createComponent(ContextImageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
