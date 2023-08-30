import { ComponentFixture, TestBed } from "@angular/core/testing";

import { NavSectionSwitchComponent } from "./nav-section-switch.component";

describe("NavSectionSwitchComponent", () => {
  let component: NavSectionSwitchComponent;
  let fixture: ComponentFixture<NavSectionSwitchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NavSectionSwitchComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NavSectionSwitchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
