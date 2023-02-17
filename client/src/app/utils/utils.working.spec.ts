// Copyright (c) 2018-2022 California Institute of Technology (“Caltech”). U.S.
// Government sponsorship acknowledged.
// All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
// * Redistributions of source code must retain the above copyright notice, this
//   list of conditions and the following disclaimer.
// * Redistributions in binary form must reproduce the above copyright notice,
//   this list of conditions and the following disclaimer in the documentation
//   and/or other materials provided with the distribution.
// * Neither the name of Caltech nor its operating division, the Jet Propulsion
//   Laboratory, nor the names of its contributors may be used to endorse or
//   promote products derived from this software without specific prior written
//   permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import {
    byteToHexString, doesVersionDiffer, isValidElementsString, /*isValidPhoneNumber,*/ parseNumberRangeString, randomString, SDSFields,
    //getPearsonCorrelation,
    setsEqual, stripInvalidCharsFromPhoneNumber, xor_sum, makeValidFileName
} from "./utils";



// TODO: unit test getPearsonCorrelation

describe("randomString", () =>
{
    it("should return random strings with valid chars", () => 
    {
        let prevs = new Set<string>();

        for(let c = 0; c < 1000; c++)
        {
            let str = randomString(6);

            expect(str.length).toEqual(6);

            // This has failed twice randomly, don't know why, so if it fails again this should print out the specific values...
            if(prevs.has(str))
            {
                console.log(str);
                console.log(prevs);
            }

            if(prevs.has(str))
            {
                expect(str).toEqual(" not be generated yet, and yet has been within "+prevs.size+" items");
            }
            //expect(prevs.has(str)).toEqual(false);
            prevs.add(str);
        }
    });
});

describe("byteToHexString", () =>
{
    it("byteToHexString should return hex string", () => 
    {
        expect(byteToHexString(255)).toEqual("ff");
        expect(byteToHexString(1)).toEqual("01");
        expect(byteToHexString(10)).toEqual("0a");
        expect(byteToHexString(0xc0a80001)).toEqual("c0a80001");
    });
});

describe("setsEqual", () =>
{
    it("return false if sets not equal", () => 
    {
        expect(setsEqual(new Set<number>([1,2,3]), new Set<number>([1,2,3,4]))).toEqual(false);
        expect(setsEqual(new Set<number>([1,2,3,4]), new Set<number>([1,2,3,5]))).toEqual(false);
    });

    it("return true if sets equal", () => 
    {
        expect(setsEqual(new Set<number>([1,2,3]), new Set<number>([1,2,3]))).toEqual(true);
        expect(setsEqual(new Set<number>([3,6,4]), new Set<number>([4,3,6]))).toEqual(true);
    });

    it("return false if one set is null", () => 
    {
        expect(setsEqual(new Set<number>([1,2,3]), null)).toEqual(false);
        expect(setsEqual(null, new Set<number>([1,2,3]))).toEqual(false);
    });

    it("return false if one set is undefined", () => 
    {
        expect(setsEqual(new Set<number>([1,2,3]), undefined)).toEqual(false);
        expect(setsEqual(undefined, new Set<number>([1,2,3]))).toEqual(false);
    });
});
/*
describe("isValidPhoneNumber", () =>
{
    it("isValidPhoneNumber accept empty or valid phone numbers", () => 
    {
        expect(isValidPhoneNumber("")).toEqual(false);
        expect(isValidPhoneNumber("+614000000000")).toEqual(true);
        expect(isValidPhoneNumber("+614000 000 000")).toEqual(false); // spaces
        expect(isValidPhoneNumber("614000000000")).toEqual(false); // + missing

        expect(isValidPhoneNumber("+12345")).toEqual(false); // length needs to be at least 7 chars
        expect(isValidPhoneNumber("+614000000a00")).toEqual(false); // nothing other than + with numbers
        expect(isValidPhoneNumber("61hello1234")).toEqual(false); // + missing
    });
});
*/
describe("stripInvalidCharsFromPhoneNumber", () =>
{
    it("stripInvalidCharsFromPhoneNumber strips unwanted characters from phone numbers, no validation", () => 
    {
        expect(stripInvalidCharsFromPhoneNumber("")).toEqual("");
        expect(stripInvalidCharsFromPhoneNumber("+614000000000")).toEqual("+614000000000");
        expect(stripInvalidCharsFromPhoneNumber("+614000 000 000")).toEqual("+614000000000");
        expect(stripInvalidCharsFromPhoneNumber("+614000-000-000")).toEqual("+614000000000");
        expect(stripInvalidCharsFromPhoneNumber("+614000 - 000 - 000")).toEqual("+614000000000");
        expect(stripInvalidCharsFromPhoneNumber("+614000s000e000")).toEqual("+614000000000");
        expect(stripInvalidCharsFromPhoneNumber("614000000000")).toEqual("614000000000");
        expect(stripInvalidCharsFromPhoneNumber("61hello1234")).toEqual("611234");
    });
});


describe("isValidElementsString", () =>
{
    it("isValidElementsString works", () => 
    {
        // no symbols
        expect(isValidElementsString("")).toEqual(false);
        expect(isValidElementsString(",")).toEqual(false);
        expect(isValidElementsString(" , ")).toEqual(false);
        expect(isValidElementsString("_ , \"")).toEqual(false);

        expect(isValidElementsString("Fe")).toEqual(true);
        expect(isValidElementsString("Fe,Ca")).toEqual(true);
        expect(isValidElementsString("Fe,Ca,Ni")).toEqual(true);

        // spaces
        expect(isValidElementsString("Fe, Ca,Ni")).toEqual(false);
        expect(isValidElementsString("Fe ,Ca,Ni")).toEqual(false);
        expect(isValidElementsString(" Fe,Ca,Ni")).toEqual(false);
        expect(isValidElementsString("Fe,Ca,Ni ")).toEqual(false);

        // bad elements
        expect(isValidElementsString("Fe,Ca,Ff")).toEqual(false);
        expect(isValidElementsString("Lorem,Ipsum")).toEqual(false);

        // Elements with _<something> after
        expect(isValidElementsString("Fe,Ca_I,Ti")).toEqual(true);
        expect(isValidElementsString("Fe, Ca_I,Ti")).toEqual(false);
        expect(isValidElementsString("Fe,Ca_I, Ti")).toEqual(false);
        expect(isValidElementsString("Fe_cats,Ca_dogs")).toEqual(true);
        expect(isValidElementsString("Fe_cats,Ff,Ca_dogs")).toEqual(false);
    });
});

describe("doesVersionDiffer", () =>
{
    it("doesVersionDiffer works", () => 
    {
        expect(doesVersionDiffer("1.0.0", "1.0.0")).toEqual(false); // no diff...

        expect(doesVersionDiffer("", "1.0.0")).toEqual(false); // blank strings mean ignore the whole thing
        expect(doesVersionDiffer("1.0.0", "")).toEqual(false); // blank strings mean ignore the whole thing

        expect(doesVersionDiffer("v1.0.0", "1.0.0")).toEqual(false); // supposed to ignore v
        expect(doesVersionDiffer("v1.0.0", "v1.0.0")).toEqual(false); // supposed to ignore v
        expect(doesVersionDiffer("1.0.0", "v1.0.0")).toEqual(false); // supposed to ignore v

        expect(doesVersionDiffer("1.0.0", "1.0.1")).toEqual(true); // differs!
        expect(doesVersionDiffer("0.3.30", "0.4.30")).toEqual(true); // differs!

        expect(doesVersionDiffer("v1.0.0", "1.0.1")).toEqual(true); // supposed to ignore v
        expect(doesVersionDiffer("v1.0.0", "2.0.0")).toEqual(true); // supposed to ignore v
        expect(doesVersionDiffer("v1.0.0", "1.1.0")).toEqual(true); // supposed to ignore v

        expect(doesVersionDiffer("v1.0.0", "v1.0.1")).toEqual(true); // supposed to ignore v
        expect(doesVersionDiffer("v1.0.0", "v2.0.0")).toEqual(true); // supposed to ignore v
        expect(doesVersionDiffer("v1.0.0", "v1.1.0")).toEqual(true); // supposed to ignore v

        expect(doesVersionDiffer("1.0.0", "v1.0.1")).toEqual(true); // supposed to ignore v
        expect(doesVersionDiffer("1.0.0", "v2.0.0")).toEqual(true); // supposed to ignore v
        expect(doesVersionDiffer("1.0.0", "v1.1.0")).toEqual(true); // supposed to ignore v

        expect(doesVersionDiffer("v0.3.30", "Matterhorn")).toEqual(true);
    });
});

describe("parseNumberRangeString", () =>
{
    it("reads nothing", () => 
    {
        expect(Array.from(parseNumberRangeString(""))).toEqual([]);
    });
    it("ignores invalid value", () => 
    {
        expect(Array.from(parseNumberRangeString("a"))).toEqual([]);
    });
    it("reads single number", () => 
    {
        expect(Array.from(parseNumberRangeString("84"))).toEqual([84]);
    });
    it("reads single number", () => 
    {
        expect(Array.from(parseNumberRangeString("84,85"))).toEqual([84, 85]);
    });
    it("reads single number with spaces", () => 
    {
        expect(Array.from(parseNumberRangeString(" 84, 85 "))).toEqual([84, 85]);
    });
    it("reads number range", () => 
    {
        expect(Array.from(parseNumberRangeString("85-90"))).toEqual([85,86,87,88,89,90]);
    });
    it("reads number range with spaces", () => 
    {
        expect(Array.from(parseNumberRangeString(" 85 - 90 "))).toEqual([85,86,87,88,89,90]);
    });
    it("reads numbers and ranges mixed", () => 
    {
        expect(Array.from(parseNumberRangeString("72, 90-94, 116, 120-123"))).toEqual([72, 90, 91, 92, 93, 94, 116, 120, 121, 122, 123]);
    });
});

describe("makeValidFileName", () =>
{
    it("works", () => 
    {
        expect(makeValidFileName("")).toEqual("");
        expect(makeValidFileName("file one.txt")).toEqual("file one.txt");
        expect(makeValidFileName("file @3.txt")).toEqual("file _3.txt");
        expect(makeValidFileName("file&one?.tx:t")).toEqual("file_one_.tx_t");
        expect(makeValidFileName("file*%one.tx:t")).toEqual("file__one.tx_t");
        expect(makeValidFileName("File: Name ${32}.txt")).toEqual("File_ Name _{32}.txt");
        expect(makeValidFileName("file/one.txt")).toEqual("file_one.txt");
        expect(makeValidFileName("file\\one^.txt")).toEqual("file_one_.txt");
    });
});

// SDSFields file name parser class
describe("SDSFields.stringToIDSimpleCase", () =>
{
    let vals = ["123", "12.3", "0x32", "i12", "12i"];
    let exp = [123, -1, -1, -1, -1];

    let s = SDSFields.makeBlankForTest();

    for(let c = 0; c < vals.length; c++)
    {
        let v = vals[c];
        it(v+"=="+exp[c], () => 
        {
            expect(s["stringToIDSimpleCase"](v)).toEqual(exp[c]);
        });
    }
});

describe("SDSFields.isAllDigits", () =>
{
    let vals = ["1234567890", "9", "0", "01", "10", "12x4", "12.4"];
    let exp = [true, true, true, true, true, false, false];

    let s = SDSFields.makeBlankForTest();

    for(let c = 0; c < vals.length; c++)
    {
        let v = vals[c];
        it(v+"=="+exp[c], () => 
        {
            expect(s["isAllDigits"](v)).toEqual(exp[c]);
        });
    }
});

describe("SDSFields.isAlpha", () =>
{
    let vals = ["0", "1", "8", "9", "a", "f", "z", "A", "L", "Z", ".", " ", "^"];
    let exp = [false, false, false, false, true, true, true, true, true, true, false, false, false];

    let s = SDSFields.makeBlankForTest();

    for(let c = 0; c < vals.length; c++)
    {
        let v = vals[c];
        it(v+"=="+exp[c], () => 
        {
            expect(s["isAlpha"](v)).toEqual(exp[c]);
        });
    }
});

describe("SDSFields.letterValue", () =>
{
    let vals = ["A", "B", "Z", " ", "a", "0"];
    let exp = [0, 1, 25, -33, 32, -17];

    let s = SDSFields.makeBlankForTest();

    for(let c = 0; c < vals.length; c++)
    {
        let v = vals[c];
        it(v+"=="+exp[c], () => 
        {
            expect(s["letterValue"](v)).toEqual(exp[c]);
        });
    }
});

describe("SDSFields.stringToSiteID", () =>
{
    let vals = [
        "123",
        "B01",
        "AA9",
        "AB8",
        "ZZ9",
        "AAZ",
        "ZZZ",
        "0AA",
        "0BZ",
        "7CZ",
        "7DV",
        "7DW", // Out of range, max is 32767
        "6",
        "HELLO"
    ];
    let exp = [
        123,
        1101,
        3609,
        3618,
        10359,
        10385,
        27935,
        27936,
        27987,
        32745,
        32767,
        -1, // Failed to convert: 7DW to site ID
        -1, // Failed to convert: 6 to site ID
        -1  // Failed to convert: HELLO to site ID
    ];

    let s = SDSFields.makeBlankForTest();

    for(let c = 0; c < vals.length; c++)
    {
        let v = vals[c];
        it(v+"=="+exp[c], () => 
        {
            expect(s["stringToSiteID"](v)).toEqual(exp[c]);
        });
    }
});

describe("SDSFields.stringToDriveID", () =>
{
    let vals = [
        "0000",
        "1234",
        "9999",
        "A000",
        "B001",
        "Z000",
        "AZ99",
        "BB99",
        "LJ00",
        "LJ35",
        "LJ36", // Out of range, max is 65535
        "300",
        "A00",
        "ZAZA",
    ];
    let exp = [
        0,
        1234,
        9999,
        10000,
        11001,
        35000,
        38599,
        38799,
        65500,
        65535,
        -1, // Failed to convert: LJ36 to drive ID
        -1, // Failed to convert: 300 to drive ID
        -1, // Failed to convert: A00 to drive ID
        -1 // Failed to convert: ZAZA to drive ID
    ];

    let s = SDSFields.makeBlankForTest();

    for(let c = 0; c < vals.length; c++)
    {
        let v = vals[c];
        it(v+"=="+exp[c], () => 
        {
            expect(s["stringToDriveID"](v)).toEqual(exp[c]);
        });
    }
});

describe("SDSFields.stringToVersion", () =>
{
    let vals = ["01", "55", "99", "A0", "AZ", "BA", "BZ", "Z0", "Z9", "ZZ", "Test", "3"];
    let exp = [
        1, 55, 99, 100, 135, 146, 171, 1000, 1009, 1035,
        -1, // Failed to convert: Test to version,
        -1, // Failed to convert: 3 to version
    ];

    let s = SDSFields.makeBlankForTest();

    for(let c = 0; c < vals.length; c++)
    {
        let v = vals[c];
        it(v+"=="+exp[c], () => 
        {
            expect(s["stringToVersion"](v)).toEqual(exp[c]);
        });
    }
});

describe("SDSFields.parseFileName", () =>
{
    let vals = [
        "INCSPRIMVSECONDARYT_TERPROGTSITDRIVSEQNUMRTTCAMSDCOPVE.EXT",
        "PS__D077T0637741109_000RPM_N001003600098356100640__J01.CSV",
        "PCR_D077T0637741562_000EDR_N00100360009835610066000J01.PNG",
        "PS__D077T0637746318_000RBS_N001003600098356103760__J01.MSA",
        "PE__D077T0637741109_000RSI_N001003600098356100660__J01.CSV",
        "PS__D077T0637741109_000RFS_N001003600098356100640__J01.CSV",
        "PS__1033_0012345678_000RFS_N001003600098356100640__J01.CSV"
    ];

    let exp = [
        "IN C S PRIM V SECONDARYT TER PRO G T SIT DRIV SEQNUMRTT CAMS D CO P VE - -1,0,0,PRIM",
        "PS _ _ D077 T 0637741109 000 RPM _ N 001 0036 000983561 0064 0 __ J 01 - 64,983561,637741109,D077",
        "PC R _ D077 T 0637741562 000 EDR _ N 001 0036 000983561 0066 0 00 J 01 - 66,983561,637741562,D077",
        "PS _ _ D077 T 0637746318 000 RBS _ N 001 0036 000983561 0376 0 __ J 01 - 376,983561,637746318,D077",
        "PE _ _ D077 T 0637741109 000 RSI _ N 001 0036 000983561 0066 0 __ J 01 - 66,983561,637741109,D077",
        "PS _ _ D077 T 0637741109 000 RFS _ N 001 0036 000983561 0064 0 __ J 01 - 64,983561,637741109,D077",
        "PS _ _ 1033 _ 0012345678 000 RFS _ N 001 0036 000983561 0064 0 __ J 01 - 64,983561,12345678,1033",
    ];

    for(let c = 0; c < vals.length; c++)
    {
        let v = vals[c];
        it(v+"=="+exp[c], () => 
        {
            let f = SDSFields.makeFromFileName(v);
            expect(f.toDebugString()+" - "+f.PMC+","+f.RTT+","+f.SCLK+","+f.SOL).toEqual(exp[c]);
        });
    }
});

describe("xor_sum", () =>
{
    it("xor_sum works", () => 
    {
        // 25=00011001
        // 19=00010011
        expect(xor_sum(25, 19)).toEqual(2);
        expect(xor_sum(19, 25)).toEqual(2);
        // 24=00011000
        // 19=00010011
        expect(xor_sum(19, 24)).toEqual(3);
        expect(xor_sum(24, 19)).toEqual(3);
        // 24=00011000
        //  3=00000001
        expect(xor_sum(24, 3)).toEqual(4);
        expect(xor_sum(3, 24)).toEqual(4);
    });
});
