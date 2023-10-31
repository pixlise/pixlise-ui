import { TestBed } from '@angular/core/testing';

import { APIEndpointsService } from './apiendpoints.service';

describe('APIEndpointsService', () => {
  let service: APIEndpointsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(APIEndpointsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
