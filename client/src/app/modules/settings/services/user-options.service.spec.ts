import { TestBed } from '@angular/core/testing';

import { UserOptionsService } from './user-options.service';

describe('UserOptionsService', () => {
  let service: UserOptionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserOptionsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
