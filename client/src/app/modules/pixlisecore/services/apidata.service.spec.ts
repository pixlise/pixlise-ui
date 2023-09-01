import { TestBed } from "@angular/core/testing";

import { APIDataService } from "./apidata.service";
import { APICommService } from "./apicomm.service";
import { HttpClientModule } from "@angular/common/http";

describe("APIDataService", () => {
  let service: APIDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [APICommService, HttpClientModule],
    });
    service = TestBed.inject(APIDataService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
