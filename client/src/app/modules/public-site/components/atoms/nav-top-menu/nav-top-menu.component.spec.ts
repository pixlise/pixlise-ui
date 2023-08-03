import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NavTopMenuComponent } from './nav-top-menu.component';

describe('NavTopMenuComponent', () => {
  let component: NavTopMenuComponent;
  let fixture: ComponentFixture<NavTopMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NavTopMenuComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NavTopMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
