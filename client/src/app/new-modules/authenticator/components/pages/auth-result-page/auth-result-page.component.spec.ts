import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthResultPageComponent } from './auth-result-page.component';

describe('AuthResultPageComponent', () => {
  let component: AuthResultPageComponent;
  let fixture: ComponentFixture<AuthResultPageComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AuthResultPageComponent]
    });
    fixture = TestBed.createComponent(AuthResultPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
