import { TestBed } from "@angular/core/testing";

import { ROIService } from "./roi.service";

describe("ROIService", () => {
  let service: ROIService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ROIService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
