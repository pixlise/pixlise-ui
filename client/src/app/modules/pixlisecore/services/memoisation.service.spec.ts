import { TestBed } from '@angular/core/testing';

import { MemoisationService } from './memoisation.service';

describe('MemoisationService', () => {
  let service: MemoisationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MemoisationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
