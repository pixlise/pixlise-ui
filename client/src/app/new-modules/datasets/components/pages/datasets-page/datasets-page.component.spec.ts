import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatasetsPageComponent } from './datasets-page.component';

describe('DatasetsPageComponent', () => {
  let component: DatasetsPageComponent;
  let fixture: ComponentFixture<DatasetsPageComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DatasetsPageComponent]
    });
    fixture = TestBed.createComponent(DatasetsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
