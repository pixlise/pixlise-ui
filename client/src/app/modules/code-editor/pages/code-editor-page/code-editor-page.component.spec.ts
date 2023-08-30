import { ComponentFixture, TestBed } from "@angular/core/testing";

import { CodeEditorPageComponent } from "./code-editor-page.component";

describe("CodeEditorPageComponent", () => {
  let component: CodeEditorPageComponent;
  let fixture: ComponentFixture<CodeEditorPageComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CodeEditorPageComponent],
    });
    fixture = TestBed.createComponent(CodeEditorPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
