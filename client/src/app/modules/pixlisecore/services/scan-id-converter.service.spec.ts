import { TestBed } from '@angular/core/testing';

import { ScanIdConverterService } from './scan-id-converter.service';

describe('ScanIdConverterService', () => {
  let service: ScanIdConverterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScanIdConverterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
