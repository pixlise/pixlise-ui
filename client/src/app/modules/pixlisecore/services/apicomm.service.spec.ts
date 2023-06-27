import { TestBed } from '@angular/core/testing';

import { APICommService } from './apicomm.service';

describe('APICommService', () => {
  let service: APICommService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(APICommService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
