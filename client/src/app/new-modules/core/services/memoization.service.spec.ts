import { TestBed } from '@angular/core/testing';

import { MemoizationService } from './memoization.service';

describe('MemoizationService', () => {
  let service: MemoizationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MemoizationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
