import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChordDiagramWidgetComponent } from './chord-diagram-widget.component';

describe('ChordDiagramWidgetComponent', () => {
  let component: ChordDiagramWidgetComponent;
  let fixture: ComponentFixture<ChordDiagramWidgetComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ChordDiagramWidgetComponent]
    });
    fixture = TestBed.createComponent(ChordDiagramWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
