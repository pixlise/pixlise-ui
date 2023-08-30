import { TestBed } from "@angular/core/testing";

import { DiffractionService } from "./diffraction.service";

describe("DiffractionService", () => {
  let service: DiffractionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DiffractionService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
