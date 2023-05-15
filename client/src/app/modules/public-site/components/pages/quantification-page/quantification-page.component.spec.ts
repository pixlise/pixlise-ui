import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuantificationPageComponent } from './quantification-page.component';

describe('QuantificationPageComponent', () => {
  let component: QuantificationPageComponent;
  let fixture: ComponentFixture<QuantificationPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ QuantificationPageComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(QuantificationPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
