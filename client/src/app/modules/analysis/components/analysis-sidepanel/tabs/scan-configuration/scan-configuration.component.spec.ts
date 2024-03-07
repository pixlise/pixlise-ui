import { ComponentFixture, TestBed } from "@angular/core/testing";

import { ScanConfigurationTabComponent } from "./scan-configuration.component";

describe("ScanConfigurationTabComponent", () => {
  let component: ScanConfigurationTabComponent;
  let fixture: ComponentFixture<ScanConfigurationTabComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ScanConfigurationTabComponent],
    });
    fixture = TestBed.createComponent(ScanConfigurationTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
