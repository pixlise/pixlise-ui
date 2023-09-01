import { TestBed } from "@angular/core/testing";

import { APICommService } from "./apicomm.service";
import { HttpClientModule } from "@angular/common/http";

describe("APICommService", () => {
  let service: APICommService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule],
    });
    service = TestBed.inject(APICommService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
