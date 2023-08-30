import { ComponentFixture, TestBed } from "@angular/core/testing";

import { TestUtilitiesComponent } from "./test-utilities.component";

describe("TestUtilitiesComponent", () => {
  let component: TestUtilitiesComponent;
  let fixture: ComponentFixture<TestUtilitiesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TestUtilitiesComponent],
    });
    fixture = TestBed.createComponent(TestUtilitiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
