import { TestBed } from '@angular/core/testing';

import { AnalysisLayoutService } from './analysis-layout.service';

describe('AnalysisLayoutService', () => {
  let service: AnalysisLayoutService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AnalysisLayoutService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
