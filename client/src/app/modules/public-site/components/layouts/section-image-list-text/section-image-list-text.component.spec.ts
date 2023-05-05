import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SectionImageListTextComponent } from './section-image-list-text.component';

describe('SectionImageListTextComponent', () => {
  let component: SectionImageListTextComponent;
  let fixture: ComponentFixture<SectionImageListTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SectionImageListTextComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SectionImageListTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
