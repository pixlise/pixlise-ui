import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuantLogViewComponent } from './quant-log-view.component';

describe('QuantLogViewComponent', () => {
  let component: QuantLogViewComponent;
  let fixture: ComponentFixture<QuantLogViewComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [QuantLogViewComponent]
    });
    fixture = TestBed.createComponent(QuantLogViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
