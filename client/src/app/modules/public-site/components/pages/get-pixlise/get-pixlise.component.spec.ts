import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GetPIXLISEComponent } from './get-pixlise.component';

describe('GetPIXLISEComponent', () => {
  let component: GetPIXLISEComponent;
  let fixture: ComponentFixture<GetPIXLISEComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GetPIXLISEComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GetPIXLISEComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
