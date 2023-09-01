import { TestBed } from "@angular/core/testing";

import { ROIService } from "./roi.service";
import { HttpClientModule } from "@angular/common/http";

describe("ROIService", () => {
  let service: ROIService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule],
    });
    service = TestBed.inject(ROIService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
