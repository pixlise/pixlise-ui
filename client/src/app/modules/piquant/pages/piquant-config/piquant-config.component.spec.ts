import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PiquantConfigComponent } from './piquant-config.component';

describe('PiquantConfigComponent', () => {
  let component: PiquantConfigComponent;
  let fixture: ComponentFixture<PiquantConfigComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PiquantConfigComponent]
    });
    fixture = TestBed.createComponent(PiquantConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
