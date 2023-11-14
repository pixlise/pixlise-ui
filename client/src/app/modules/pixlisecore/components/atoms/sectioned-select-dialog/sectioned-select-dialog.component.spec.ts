import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SectionedSelectDialogComponent } from './sectioned-select-dialog.component';

describe('SectionedSelectDialogComponent', () => {
  let component: SectionedSelectDialogComponent;
  let fixture: ComponentFixture<SectionedSelectDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SectionedSelectDialogComponent]
    });
    fixture = TestBed.createComponent(SectionedSelectDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
