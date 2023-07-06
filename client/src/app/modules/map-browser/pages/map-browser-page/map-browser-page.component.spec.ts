import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapBrowserPageComponent } from './map-browser-page.component';

describe('MapBrowserPageComponent', () => {
  let component: MapBrowserPageComponent;
  let fixture: ComponentFixture<MapBrowserPageComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MapBrowserPageComponent]
    });
    fixture = TestBed.createComponent(MapBrowserPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
