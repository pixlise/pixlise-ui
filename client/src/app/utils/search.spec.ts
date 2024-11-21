import { readSol } from "./search";

fdescribe("searchScan", () => {
  //beforeEach(() => TestBed.configureTestingModule({}));

  it("readSol should work", () => {
    expect(readSol("1309")).toEqual(1309);
    expect(readSol("A001")).toEqual(-29999);
    expect(readSol("D123")).toEqual(-26877);
  });
});
