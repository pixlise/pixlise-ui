import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultiQuantComponent } from './multi-quant.component';

describe('MultiQuantComponent', () => {
  let component: MultiQuantComponent;
  let fixture: ComponentFixture<MultiQuantComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MultiQuantComponent]
    });
    fixture = TestBed.createComponent(MultiQuantComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
