import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WidgetConfigurationButtonComponent } from './widget-configuration-button.component';

describe('WidgetConfigurationButtonComponent', () => {
  let component: WidgetConfigurationButtonComponent;
  let fixture: ComponentFixture<WidgetConfigurationButtonComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [WidgetConfigurationButtonComponent]
    });
    fixture = TestBed.createComponent(WidgetConfigurationButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
