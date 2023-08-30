import { ComponentFixture, TestBed } from "@angular/core/testing";

import { ButtonNavDownComponent } from "./button-nav-down.component";

describe("ButtonNavDownComponent", () => {
  let component: ButtonNavDownComponent;
  let fixture: ComponentFixture<ButtonNavDownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ButtonNavDownComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ButtonNavDownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
