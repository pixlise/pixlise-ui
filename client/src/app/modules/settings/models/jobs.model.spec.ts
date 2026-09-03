import { applyIndexToFileName } from "./jobs.model";

describe("applyIndexToFileName", () => {
  it("should format file names as expected", () => {
    expect(applyIndexToFileName("", 0, true)).toEqual("");
	expect(applyIndexToFileName("node.txt", 0, true)).toEqual("node00001.txt");
	expect(applyIndexToFileName("node.txt", 1, true)).toEqual("node00002.txt");
	expect(applyIndexToFileName("node.txt", 2, true)).toEqual("node00003.txt");
	expect(applyIndexToFileName("node.txt", 3, false)).toEqual("node.txt");
	expect(applyIndexToFileName("node.txt", 304023, true)).toEqual("node304024.txt");
	expect(applyIndexToFileName("node.txt", 6304023, true)).toEqual("node6304024.txt");
	expect(applyIndexToFileName("file.name.img", 33, true)).toEqual("file00034.name.img");
	expect(applyIndexToFileName("extensionless", 3, true)).toEqual("extensionless00004");
  });
});
