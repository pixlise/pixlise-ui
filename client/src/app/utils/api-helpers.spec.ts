import { APIPaths } from "./api-helpers";

describe("getFileNameCorrectedURL", () => {
  it("getFileNameCorrectedURL works", () => {
    expect(APIPaths.getFileNameCorrectedURL("downloadz", "file.jpg")).toEqual("/downloadz/file.jpg");
    expect(APIPaths.getFileNameCorrectedURL("downloadz/", "file.jpg")).toEqual("/downloadz/file.jpg");
    expect(APIPaths.getFileNameCorrectedURL("downloadz/", "file one.jpg")).toEqual("/downloadz/file%20one.jpg");
    expect(APIPaths.getFileNameCorrectedURL("downloadz/", "file #1.jpg")).toEqual("/downloadz/file%20%231.jpg");
    expect(APIPaths.getFileNameCorrectedURL("downloadz/", "file #1.jpg?key=value")).toEqual("/downloadz/file%20%231.jpg?key=value");
  });
});