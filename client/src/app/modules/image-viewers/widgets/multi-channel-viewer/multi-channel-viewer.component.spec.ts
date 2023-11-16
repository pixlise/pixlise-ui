import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultiChannelViewerComponent } from './multi-channel-viewer.component';

describe('MultiChannelViewerComponent', () => {
  let component: MultiChannelViewerComponent;
  let fixture: ComponentFixture<MultiChannelViewerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MultiChannelViewerComponent]
    });
    fixture = TestBed.createComponent(MultiChannelViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
