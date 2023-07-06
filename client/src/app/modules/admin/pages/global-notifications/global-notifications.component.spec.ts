import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobalNotificationsComponent } from './global-notifications.component';

describe('GlobalNotificationsComponent', () => {
  let component: GlobalNotificationsComponent;
  let fixture: ComponentFixture<GlobalNotificationsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [GlobalNotificationsComponent]
    });
    fixture = TestBed.createComponent(GlobalNotificationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
