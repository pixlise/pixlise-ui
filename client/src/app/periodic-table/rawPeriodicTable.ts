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

export const rawPeriodicTable =
{
    "1": {
        "name": "Hydrogen",
        "atomic_mass": 1.0079,
        "number": 1,
        "symbol": "H",
        "lines": []
    },
    "2": {
        "name": "Helium",
        "atomic_mass": 4.0026,
        "number": 2,
        "symbol": "He",
        "lines": []
    },
    "3": {
        "name": "Lithium",
        "atomic_mass": 6.941,
        "number": 3,
        "symbol": "Li",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 49.4,
                "intensity": 1.0,
                "tags": [
                    "maxK"
                ]
            }
        ]
    },
    "4": {
        "name": "Beryllium",
        "atomic_mass": 9.0122,
        "number": 4,
        "symbol": "Be",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 103.5,
                "intensity": 4.87326e-05
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 108.5,
                "intensity": 0.334205
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 108.5,
                "intensity": 0.665747,
                "tags": [
                    "maxK"
                ]
            }
        ]
    },
    "5": {
        "name": "Boron",
        "atomic_mass": 10.81,
        "number": 5,
        "symbol": "B",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 175.4,
                "intensity": 6.09151e-05
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 183.3,
                "intensity": 0.334201
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 183.3,
                "intensity": 0.665738,
                "tags": [
                    "maxK"
                ]
            }
        ]
    },
    "6": {
        "name": "Carbon",
        "atomic_mass": 12.011,
        "number": 6,
        "symbol": "C",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 266.2,
                "intensity": 7.30972e-05
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 277.0,
                "intensity": 0.334197
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 277.0,
                "intensity": 0.66573,
                "tags": [
                    "maxK"
                ]
            }
        ]
    },
    "7": {
        "name": "Nitrogen",
        "atomic_mass": 14.0067,
        "number": 7,
        "symbol": "N",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 372.6,
                "intensity": 8.5279e-05
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 392.4,
                "intensity": 0.334193
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 392.4,
                "intensity": 0.665722,
                "tags": [
                    "maxK"
                ]
            }
        ]
    },
    "8": {
        "name": "Oxygen",
        "atomic_mass": 15.9994,
        "number": 8,
        "symbol": "O",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 501.5,
                "intensity": 9.74605e-05
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 524.9,
                "intensity": 0.334188
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 524.9,
                "intensity": 0.665714,
                "tags": [
                    "maxK"
                ]
            }
        ]
    },
    "9": {
        "name": "Fluorine",
        "atomic_mass": 18.9984,
        "number": 9,
        "symbol": "F",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 651.7,
                "intensity": 0.000109642
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 676.8,
                "intensity": 0.334184
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 676.8,
                "intensity": 0.665706,
                "tags": [
                    "maxK"
                ]
            }
        ]
    },
    "10": {
        "name": "Neon",
        "atomic_mass": 20.179,
        "number": 10,
        "symbol": "Ne",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 821.7,
                "intensity": 0.000121823
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 848.5,
                "intensity": 0.33418
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 848.6,
                "intensity": 0.665698,
                "tags": [
                    "maxK"
                ]
            }
        ]
    },
    "11": {
        "name": "Sodium",
        "atomic_mass": 22.9898,
        "number": 11,
        "symbol": "Na",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 1007.3,
                "intensity": 0.000134003
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 1040.4,
                "intensity": 0.334176
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 1040.3,
                "intensity": 0.66569,
                "tags": [
                    "maxK"
                ]
            }
        ]
    },
    "12": {
        "name": "Magnesium",
        "atomic_mass": 24.305,
        "number": 12,
        "symbol": "Mg",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 1214.4,
                "intensity": 0.000130028
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 1253.4,
                "intensity": 0.29724
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 1253.79,
                "intensity": 0.592111,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 1302.0,
                "intensity": 0.0377135
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 1302.0,
                "intensity": 0.072806
            }
        ]
    },
    "13": {
        "name": "Aluminium",
        "atomic_mass": 26.9815,
        "number": 13,
        "symbol": "Al",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 1441.2,
                "intensity": 0.000140693
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 1486.1,
                "intensity": 0.296882
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 1486.5,
                "intensity": 0.591398,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 1557.0,
                "intensity": 0.0380755
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 1557.0,
                "intensity": 0.0735048
            }
        ]
    },
    "14": {
        "name": "Silicon",
        "atomic_mass": 28.0855,
        "number": 14,
        "symbol": "Si",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 1689.3,
                "intensity": 0.000151334
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 1739.2,
                "intensity": 0.296524
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 1739.8,
                "intensity": 0.590686,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 1837.0,
                "intensity": 0.0384366
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 1837.0,
                "intensity": 0.074202
            }
        ]
    },
    "15": {
        "name": "Phosphorus",
        "atomic_mass": 30.9738,
        "number": 15,
        "symbol": "P",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 1956.5,
                "intensity": 0.000161948
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 2009.5,
                "intensity": 0.296168
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 2010.5,
                "intensity": 0.589976,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 2138.5,
                "intensity": 0.0387969
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 2139.5,
                "intensity": 0.0748974
            }
        ]
    },
    "16": {
        "name": "Sulfur",
        "atomic_mass": 32.06,
        "number": 16,
        "symbol": "S",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 2241.1,
                "intensity": 0.000172538
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 2308.4,
                "intensity": 0.295812
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 2309.5,
                "intensity": 0.589268,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 2464.0,
                "intensity": 0.0391563
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 2465.0,
                "intensity": 0.0755913
            }
        ]
    },
    "17": {
        "name": "Chlorine",
        "atomic_mass": 35.453,
        "number": 17,
        "symbol": "Cl",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 2552.0,
                "intensity": 0.000183101
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 2620.0,
                "intensity": 0.295458
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 2622.0,
                "intensity": 0.588561,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 2812.0,
                "intensity": 0.0395148
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 2812.0,
                "intensity": 0.0762834
            }
        ]
    },
    "18": {
        "name": "Argon",
        "atomic_mass": 39.948,
        "number": 18,
        "symbol": "Ar",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 2879.6,
                "intensity": 0.00019364
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 2955.3,
                "intensity": 0.295104
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 2957.5,
                "intensity": 0.587856,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 3190.0,
                "intensity": 0.0398725
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 3190.2,
                "intensity": 0.0769739
            }
        ]
    },
    "19": {
        "name": "Potassium",
        "atomic_mass": 39.0983,
        "number": 19,
        "symbol": "K",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 3229.8,
                "intensity": 0.000204153
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 3311.1,
                "intensity": 0.294751
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 3313.8,
                "intensity": 0.587153,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 3590.1,
                "intensity": 0.0402293
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 3590.1,
                "intensity": 0.0776627
            }
        ]
    },
    "20": {
        "name": "Calcium",
        "atomic_mass": 40.08,
        "number": 20,
        "symbol": "Ca",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 3600.1,
                "intensity": 0.000214641
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 3688.8,
                "intensity": 0.294399
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 3692.3,
                "intensity": 0.586452,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 4013.1,
                "intensity": 0.0405853
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 4013.1,
                "intensity": 0.0783499
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 413.0,
                "intensity": 0.413833
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 413.0,
                "intensity": 0.586166
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 305.4,
                "intensity": 1.0,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 301.9,
                "intensity": 1.0
            }
        ]
    },
    "21": {
        "name": "Scandium",
        "atomic_mass": 44.9559,
        "number": 21,
        "symbol": "Sc",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 3994.0,
                "intensity": 0.000225104
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 4088.4,
                "intensity": 0.294047
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 4093.3,
                "intensity": 0.585752,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 4463.7,
                "intensity": 0.0409404
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 4463.7,
                "intensity": 0.0790355
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 469.7,
                "intensity": 0.413833
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 469.7,
                "intensity": 0.586166
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 352.5,
                "intensity": 1.0,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 347.6,
                "intensity": 1.0
            }
        ]
    },
    "22": {
        "name": "Titanium",
        "atomic_mass": 47.88,
        "number": 22,
        "symbol": "Ti",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 4405.1,
                "intensity": 0.000235342
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 4505.8,
                "intensity": 0.293692
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 4512.2,
                "intensity": 0.584554,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 4933.4,
                "intensity": 0.0412594
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 4933.4,
                "intensity": 0.0796514
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 4964.0,
                "intensity": 0.000607001
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 528.3,
                "intensity": 0.413833
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 528.3,
                "intensity": 0.586166
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 401.5,
                "intensity": 0.0811695
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 458.2,
                "intensity": 0.918831,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 395.1,
                "intensity": 0.0990991
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 451.8,
                "intensity": 0.0892785
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 451.8,
                "intensity": 0.811622
            }
        ]
    },
    "23": {
        "name": "Vanadium",
        "atomic_mass": 50.9415,
        "number": 23,
        "symbol": "V",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 4838.3,
                "intensity": 0.000245586
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 4945.2,
                "intensity": 0.293776
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 4952.9,
                "intensity": 0.583478,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 5427.8,
                "intensity": 0.0415854
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 5427.8,
                "intensity": 0.0802808
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 5463.0,
                "intensity": 0.000633424
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 589.5,
                "intensity": 0.413833
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 589.5,
                "intensity": 0.586166
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 453.5,
                "intensity": 0.0794525
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 517.8,
                "intensity": 0.920548,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 445.8,
                "intensity": 0.0990991
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 510.1,
                "intensity": 0.0892785
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 510.1,
                "intensity": 0.811622
            }
        ]
    },
    "24": {
        "name": "Chromium",
        "atomic_mass": 51.996,
        "number": 24,
        "symbol": "Cr",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 5293.0,
                "intensity": 0.000255793
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 5405.2,
                "intensity": 0.293859
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 5414.9,
                "intensity": 0.582407,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 5946.8,
                "intensity": 0.0419103
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 5946.8,
                "intensity": 0.080908
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 5987.0,
                "intensity": 0.000659751
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 653.8,
                "intensity": 0.413833
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 653.8,
                "intensity": 0.586166
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 509.7,
                "intensity": 0.077729
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 581.8,
                "intensity": 0.922271,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 500.0,
                "intensity": 0.0990991
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 572.1,
                "intensity": 0.0892785
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 572.1,
                "intensity": 0.811622
            }
        ]
    },
    "25": {
        "name": "Manganese",
        "atomic_mass": 54.938,
        "number": 25,
        "symbol": "Mn",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 5769.9,
                "intensity": 0.000265963
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 5889.1,
                "intensity": 0.293941
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 5900.3,
                "intensity": 0.58134,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 6491.8,
                "intensity": 0.042234
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 6491.8,
                "intensity": 0.0815329
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 6537.0,
                "intensity": 0.000685981
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 721.9,
                "intensity": 0.413833
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 721.9,
                "intensity": 0.586166
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 567.6,
                "intensity": 0.0759991
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 647.9,
                "intensity": 0.924001,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 556.4,
                "intensity": 0.0990991
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 636.7,
                "intensity": 0.0892785
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 636.7,
                "intensity": 0.811622
            }
        ]
    },
    "26": {
        "name": "Iron",
        "atomic_mass": 55.847,
        "number": 26,
        "symbol": "Fe",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 6267.4,
                "intensity": 0.000276096
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 6392.1,
                "intensity": 0.294023
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 6405.2,
                "intensity": 0.580277,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 7059.3,
                "intensity": 0.0425566
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 7059.3,
                "intensity": 0.0821556
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 7110.0,
                "intensity": 0.000712115
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 791.9,
                "intensity": 0.413833
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 791.9,
                "intensity": 0.586166
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 628.6,
                "intensity": 0.0742626
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 717.9,
                "intensity": 0.925737,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 615.5,
                "intensity": 0.0990365
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 704.8,
                "intensity": 0.0892847
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 704.8,
                "intensity": 0.811679
            }
        ]
    },
    "27": {
        "name": "Cobalt",
        "atomic_mass": 58.9332,
        "number": 27,
        "symbol": "Co",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 6783.9,
                "intensity": 0.000286191
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 6915.8,
                "intensity": 0.294105
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 6930.9,
                "intensity": 0.579217,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 7650.1,
                "intensity": 0.0428779
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 7649.1,
                "intensity": 0.0827759
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 7706.0,
                "intensity": 0.000738154
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 866.2,
                "intensity": 0.413833
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 865.2,
                "intensity": 0.586166
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 692.2,
                "intensity": 0.0725197
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 790.2,
                "intensity": 0.92748,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 677.1,
                "intensity": 0.0853896
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 775.1,
                "intensity": 0.0906371
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 775.1,
                "intensity": 0.823973
            }
        ]
    },
    "28": {
        "name": "Nickel",
        "atomic_mass": 58.69,
        "number": 28,
        "symbol": "Ni",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 7324.4,
                "intensity": 0.00029625
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 7463.0,
                "intensity": 0.294187
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 7480.3,
                "intensity": 0.578161,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 8265.0,
                "intensity": 0.0431981
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 8266.8,
                "intensity": 0.083394
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 8329.0,
                "intensity": 0.000764098
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 940.6,
                "intensity": 0.413833
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 942.4,
                "intensity": 0.586166
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 759.2,
                "intensity": 0.0685204
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 866.0,
                "intensity": 0.93148,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 741.9,
                "intensity": 0.0750272
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 848.7,
                "intensity": 0.091664
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 848.7,
                "intensity": 0.833309
            }
        ]
    },
    "29": {
        "name": "Copper",
        "atomic_mass": 63.546,
        "number": 29,
        "symbol": "Cu",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 7882.3,
                "intensity": 0.000306271
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 8026.7,
                "intensity": 0.294269
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 8046.3,
                "intensity": 0.577108,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 8901.7,
                "intensity": 0.043517
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 8903.9,
                "intensity": 0.0840096
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 8974.0,
                "intensity": 0.000789945
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 1019.4,
                "intensity": 0.413833
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 1021.6,
                "intensity": 0.586166
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 829.8,
                "intensity": 0.06619
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 947.3,
                "intensity": 0.93381,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 810.2,
                "intensity": 0.0673403
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 927.7,
                "intensity": 0.0924257
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 927.7,
                "intensity": 0.840234
            }
        ]
    },
    "30": {
        "name": "Zinc",
        "atomic_mass": 65.38,
        "number": 30,
        "symbol": "Zn",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 8462.8,
                "intensity": 0.000316256
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 8614.1,
                "intensity": 0.294353
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 8637.2,
                "intensity": 0.576058,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 9567.6,
                "intensity": 0.0438347
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 9570.4,
                "intensity": 0.0846229
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 9648.8,
                "intensity": 0.000815698
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 1104.8,
                "intensity": 0.382241
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 1107.6,
                "intensity": 0.541418
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 1195.2,
                "intensity": 0.07634
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 905.1,
                "intensity": 0.0639247
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 1034.7,
                "intensity": 0.936075,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 882.0,
                "intensity": 0.0617207
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 1011.6,
                "intensity": 0.0929826
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 1011.7,
                "intensity": 0.845297
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 9.2,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            }
        ]
    },
    "31": {
        "name": "Gallium",
        "atomic_mass": 69.72,
        "number": 31,
        "symbol": "Ga",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 9068.0,
                "intensity": 0.000326203
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 9223.8,
                "intensity": 0.294438
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 9250.6,
                "intensity": 0.57501,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 10263.5,
                "intensity": 0.0441511
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 10267.0,
                "intensity": 0.0852337
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 10348.3,
                "intensity": 0.000841354
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 1195.5,
                "intensity": 0.349728
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 1199.0,
                "intensity": 0.495366
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 1297.0,
                "intensity": 0.0705896
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 1297.0,
                "intensity": 0.0843162
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 983.69,
                "intensity": 0.0617242
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 1124.5,
                "intensity": 0.938276,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 956.89,
                "intensity": 0.0576051
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 1097.7,
                "intensity": 0.0933905
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 1097.7,
                "intensity": 0.849004
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 16.7,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            }
        ]
    },
    "32": {
        "name": "Germanium",
        "atomic_mass": 72.59,
        "number": 32,
        "symbol": "Ge",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 9688.4,
                "intensity": 0.000336113
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 9854.9,
                "intensity": 0.294524
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 9886.0,
                "intensity": 0.573964,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 10978.1,
                "intensity": 0.0444662
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 10982.2,
                "intensity": 0.0858421
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 11073.2,
                "intensity": 0.000866916
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 1289.7,
                "intensity": 0.348501
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 1293.8,
                "intensity": 0.493627
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 1411.6,
                "intensity": 0.0710823
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 1411.6,
                "intensity": 0.08679
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 1068.0,
                "intensity": 0.0595885
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 1218.3,
                "intensity": 0.940412,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 1036.9,
                "intensity": 0.0544969
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 1187.2,
                "intensity": 0.0936926
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 1187.8,
                "intensity": 0.851751
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 1212.0,
                "intensity": 5.96223e-05
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 26.8,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            }
        ]
    },
    "33": {
        "name": "Arsenic",
        "atomic_mass": 74.9216,
        "number": 33,
        "symbol": "As",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 10340.0,
                "intensity": 0.000345492
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 10507.9,
                "intensity": 0.294192
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 10543.4,
                "intensity": 0.572101,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 11720.8,
                "intensity": 0.044716
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 11725.8,
                "intensity": 0.0863243
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 11825.3,
                "intensity": 0.000891105
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 11864.0,
                "intensity": 0.00143025
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 1380.8,
                "intensity": 0.34796
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 1385.8,
                "intensity": 0.492862
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 1524.0,
                "intensity": 0.0717114
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 1524.0,
                "intensity": 0.0874663
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 1154.4,
                "intensity": 0.0575174
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 1317.4,
                "intensity": 0.942483,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 1118.9,
                "intensity": 0.0519903
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 1281.9,
                "intensity": 0.0939148
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 1281.9,
                "intensity": 0.85377
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 1315.6,
                "intensity": 0.000324433
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 38.7,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            }
        ]
    },
    "34": {
        "name": "Selenium",
        "atomic_mass": 78.96,
        "number": 34,
        "symbol": "Se",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 11006.0,
                "intensity": 0.000354202
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 11183.7,
                "intensity": 0.293362
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 11224.1,
                "intensity": 0.569274,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 12491.5,
                "intensity": 0.0448872
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 12497.3,
                "intensity": 0.0866549
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 12602.5,
                "intensity": 0.000913571
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 12655.0,
                "intensity": 0.00455419
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 1485.5,
                "intensity": 0.347407
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 1491.3,
                "intensity": 0.492079
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 1649.0,
                "intensity": 0.0723355
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 1649.0,
                "intensity": 0.0881785
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 1244.7,
                "intensity": 0.0555107
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 1418.8,
                "intensity": 0.944489,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 1204.3,
                "intensity": 0.0497968
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 1378.4,
                "intensity": 0.0941058
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 1379.3,
                "intensity": 0.855507
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 1421.9,
                "intensity": 0.0005903
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 52.5,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            }
        ]
    },
    "35": {
        "name": "Bromine",
        "atomic_mass": 79.904,
        "number": 35,
        "symbol": "Br",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 11692.0,
                "intensity": 0.000362825
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 11878.0,
                "intensity": 0.292544
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 11924.0,
                "intensity": 0.566472,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 13285.0,
                "intensity": 0.0450566
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 13292.0,
                "intensity": 0.0869818
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 13404.0,
                "intensity": 0.000935812
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 13471.0,
                "intensity": 0.00764737
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 1593.0,
                "intensity": 0.346842
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 1600.0,
                "intensity": 0.491277
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 1779.0,
                "intensity": 0.0729547
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 1779.0,
                "intensity": 0.0889264
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 1339.0,
                "intensity": 0.0535683
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 1526.0,
                "intensity": 0.946432,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 1293.0,
                "intensity": 0.0477276
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 1480.0,
                "intensity": 0.0942844
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 1481.0,
                "intensity": 0.857131
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 1523.0,
                "intensity": 0.000857131
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 67.0,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            }
        ]
    },
    "36": {
        "name": "Krypton",
        "atomic_mass": 83.8,
        "number": 36,
        "symbol": "Kr",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 12405.0,
                "intensity": 0.000371362
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 12595.1,
                "intensity": 0.291737
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 12647.6,
                "intensity": 0.563695,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 14103.8,
                "intensity": 0.045224
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 14111.6,
                "intensity": 0.0873051
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 14231.0,
                "intensity": 0.00095783
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 14311.9,
                "intensity": 0.0107102
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 1698.8,
                "intensity": 0.346263
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 1706.6,
                "intensity": 0.490458
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 1906.9,
                "intensity": 0.0735687
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 1906.9,
                "intensity": 0.0897098
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 1438.1,
                "intensity": 0.0516897
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 1635.9,
                "intensity": 0.94831,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 1385.6,
                "intensity": 0.0457022
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 1583.4,
                "intensity": 0.0944586
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 1584.6,
                "intensity": 0.858714
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 1650.9,
                "intensity": 0.00112492
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 80.9,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            }
        ]
    },
    "37": {
        "name": "Rubidium",
        "atomic_mass": 85.4678,
        "number": 37,
        "symbol": "Rb",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 13135.0,
                "intensity": 0.000379814
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 13336.0,
                "intensity": 0.290941
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 13396.0,
                "intensity": 0.560942,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 14951.3,
                "intensity": 0.0453896
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 14960.9,
                "intensity": 0.0876247
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 15087.0,
                "intensity": 0.000979629
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 15183.7,
                "intensity": 0.0137431
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 1816.3,
                "intensity": 0.345673
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 1825.9,
                "intensity": 0.489621
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 2048.7,
                "intensity": 0.0741776
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 2049.7,
                "intensity": 0.0905282
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 1537.3,
                "intensity": 0.0498747
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 1751.0,
                "intensity": 0.950125,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 1477.3,
                "intensity": 0.0437611
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 1691.0,
                "intensity": 0.0946243
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 1692.0,
                "intensity": 0.860221
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 1773.5,
                "intensity": 0.00139356
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 96.7,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            }
        ]
    },
    "38": {
        "name": "Strontium",
        "atomic_mass": 87.62,
        "number": 38,
        "symbol": "Sr",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 13889.0,
                "intensity": 0.000388181
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 14098.0,
                "intensity": 0.290157
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 14165.0,
                "intensity": 0.558213,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 15824.7,
                "intensity": 0.0455533
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 15835.0,
                "intensity": 0.0879408
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 15969.0,
                "intensity": 0.00100121
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 16083.4,
                "intensity": 0.0167464
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 1935.7,
                "intensity": 0.34507
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 1946.0,
                "intensity": 0.488767
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 2194.4,
                "intensity": 0.0747814
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 2195.9,
                "intensity": 0.0913816
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 1648.3,
                "intensity": 0.0481229
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 1871.0,
                "intensity": 0.951877,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 1581.3,
                "intensity": 0.0420501
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 1804.0,
                "intensity": 0.0947672
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 1805.8,
                "intensity": 0.86152
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 1901.1,
                "intensity": 0.00166273
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 114.4,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            }
        ]
    },
    "39": {
        "name": "Yttrium",
        "atomic_mass": 88.9059,
        "number": 39,
        "symbol": "Y",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 14665.0,
                "intensity": 0.000396906
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 14882.0,
                "intensity": 0.289708
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 14958.0,
                "intensity": 0.556124,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 16727.4,
                "intensity": 0.045766
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 16739.2,
                "intensity": 0.0883514
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 16880.3,
                "intensity": 0.00102371
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 17013.6,
                "intensity": 0.0186302
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 2062.4,
                "intensity": 0.344455
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 2074.2,
                "intensity": 0.487896
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 2348.6,
                "intensity": 0.0753799
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 2349.9,
                "intensity": 0.0922695
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 1764.0,
                "intensity": 0.0464339
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 1998.3,
                "intensity": 0.953566,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 1688.0,
                "intensity": 0.0408459
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 1922.3,
                "intensity": 0.0948599
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 1924.2,
                "intensity": 0.862363
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 2036.2,
                "intensity": 0.00193169
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 133.3,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            }
        ]
    },
    "40": {
        "name": "Zirconium",
        "atomic_mass": 91.22,
        "number": 40,
        "symbol": "Zr",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 15466.0,
                "intensity": 0.000405563
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 15691.0,
                "intensity": 0.289266
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 15775.0,
                "intensity": 0.554048,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 17654.5,
                "intensity": 0.0459769
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 17668.2,
                "intensity": 0.0887584
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 17816.9,
                "intensity": 0.00104604
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 17969.5,
                "intensity": 0.0204998
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 2188.5,
                "intensity": 0.343827
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 2202.2,
                "intensity": 0.487008
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 2503.5,
                "intensity": 0.0759732
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 2504.9,
                "intensity": 0.0931916
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 1876.7,
                "intensity": 0.0448073
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 2125.9,
                "intensity": 0.955193,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 1792.7,
                "intensity": 0.0396873
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 2041.9,
                "intensity": 0.0957923
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 2044.2,
                "intensity": 0.862321
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 2172.4,
                "intensity": 0.00219892
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 152.6,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            }
        ]
    },
    "41": {
        "name": "Niobium",
        "atomic_mass": 92.9064,
        "number": 41,
        "symbol": "Nb",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 16288.0,
                "intensity": 0.000414496
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 16521.0,
                "intensity": 0.289072
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 16615.0,
                "intensity": 0.55244,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 18609.9,
                "intensity": 0.0462241
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 18625.4,
                "intensity": 0.0892356
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 18781.0,
                "intensity": 0.00106908
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 18953.4,
                "intensity": 0.0215452
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 2321.9,
                "intensity": 0.343188
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 2337.4,
                "intensity": 0.486103
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 2665.4,
                "intensity": 0.0765612
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 2667.2,
                "intensity": 0.0941478
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 1998.4,
                "intensity": 0.0432426
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 2260.0,
                "intensity": 0.956757,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 1904.4,
                "intensity": 0.0389731
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 2166.0,
                "intensity": 0.0958479
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 2168.7,
                "intensity": 0.862712
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 2314.6,
                "intensity": 0.00246735
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 172.4,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            }
        ]
    },
    "42": {
        "name": "Molybdenum",
        "atomic_mass": 95.94,
        "number": 42,
        "symbol": "Mo",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 17134.0,
                "intensity": 0.000423374
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 17375.0,
                "intensity": 0.288884
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 17480.0,
                "intensity": 0.550837,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 19588.4,
                "intensity": 0.0464695
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 19606.0,
                "intensity": 0.0897094
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 19768.9,
                "intensity": 0.00109198
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 19962.4,
                "intensity": 0.0225843
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 2454.4,
                "intensity": 0.341952
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 2472.0,
                "intensity": 0.485613
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 2828.4,
                "intensity": 0.0772124
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 2830.5,
                "intensity": 0.0952223
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 2118.7,
                "intensity": 0.0417393
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 2393.9,
                "intensity": 0.958261,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 2013.7,
                "intensity": 0.0383151
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 2288.9,
                "intensity": 0.0958978
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 2292.1,
                "intensity": 0.863051
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 2456.8,
                "intensity": 0.00273587
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 193.5,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            }
        ]
    },
    "43": {
        "name": "Technetium",
        "atomic_mass": 97.907,
        "number": 43,
        "symbol": "Tc",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 18001.0,
                "intensity": 0.000432197
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 18251.0,
                "intensity": 0.288703
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 18367.0,
                "intensity": 0.54924,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 20596.4,
                "intensity": 0.0467131
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 20626.3,
                "intensity": 0.0901797
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 20786.4,
                "intensity": 0.00111474
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 21001.7,
                "intensity": 0.0236173
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 2595.4,
                "intensity": 0.336978
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 2625.3,
                "intensity": 0.487847
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 3000.7,
                "intensity": 0.0782994
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 3003.1,
                "intensity": 0.0968764
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 2249.0,
                "intensity": 0.0402969
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 2535.4,
                "intensity": 0.959703,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 2133.0,
                "intensity": 0.0377123
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 2419.4,
                "intensity": 0.0959422
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 2423.1,
                "intensity": 0.863341
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 2607.5,
                "intensity": 0.00300443
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 215.3,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            }
        ]
    },
    "44": {
        "name": "Ruthenium",
        "atomic_mass": 101.07,
        "number": 44,
        "symbol": "Ru",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 18893.0,
                "intensity": 0.000440965
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 19150.0,
                "intensity": 0.288529
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 19279.0,
                "intensity": 0.547647,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 21633.7,
                "intensity": 0.0469549
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 21655.5,
                "intensity": 0.0906465
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 21832.8,
                "intensity": 0.00113735
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 22070.7,
                "intensity": 0.0246441
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 2740.7,
                "intensity": 0.332221
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 2762.5,
                "intensity": 0.489877
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 3177.7,
                "intensity": 0.0793601
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 3180.8,
                "intensity": 0.0985423
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 2380.9,
                "intensity": 0.0389147
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 2682.8,
                "intensity": 0.961085,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 2251.9,
                "intensity": 0.0371637
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 2553.8,
                "intensity": 0.0959813
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 2558.0,
                "intensity": 0.863582
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 2763.0,
                "intensity": 0.00327298
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 237.9,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            }
        ]
    },
    "45": {
        "name": "Rhodium",
        "atomic_mass": 102.906,
        "number": 45,
        "symbol": "Rh",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 19808.0,
                "intensity": 0.000449656
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 20074.0,
                "intensity": 0.288348
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 20216.0,
                "intensity": 0.54603,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 22698.7,
                "intensity": 0.0471925
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 22723.5,
                "intensity": 0.0911051
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 22908.1,
                "intensity": 0.00115977
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 23169.5,
                "intensity": 0.0253904
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 23218.0,
                "intensity": 0.000324342
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 2890.7,
                "intensity": 0.327692
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 2915.5,
                "intensity": 0.491698
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 3361.5,
                "intensity": 0.0803926
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 3364.7,
                "intensity": 0.100218
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 2517.9,
                "intensity": 0.0348076
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 2834.1,
                "intensity": 0.89112,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 3144.0,
                "intensity": 0.0740723
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 2375.9,
                "intensity": 0.0336554
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 2692.1,
                "intensity": 0.0881263
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 2696.8,
                "intensity": 0.792807
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 2922.6,
                "intensity": 0.00325051
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 3002.0,
                "intensity": 0.0821606
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 494.5,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 261.4,
                "intensity": 1.0
            }
        ]
    },
    "46": {
        "name": "Palladium",
        "atomic_mass": 106.42,
        "number": 46,
        "symbol": "Pd",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 20746.0,
                "intensity": 0.000458436
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 21020.0,
                "intensity": 0.288266
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 21177.0,
                "intensity": 0.54459,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 23790.1,
                "intensity": 0.0474432
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 23817.7,
                "intensity": 0.0915892
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 24009.5,
                "intensity": 0.00118241
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 24294.3,
                "intensity": 0.0261403
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 24348.0,
                "intensity": 0.000330675
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 3044.1,
                "intensity": 0.3234
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 3071.7,
                "intensity": 0.493304
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 3548.3,
                "intensity": 0.0813952
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 3553.1,
                "intensity": 0.1019
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 2658.4,
                "intensity": 0.0333907
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 2989.5,
                "intensity": 0.885741,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 3328.0,
                "intensity": 0.0808684
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 2501.4,
                "intensity": 0.0328635
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 2832.5,
                "intensity": 0.0871326
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 2837.8,
                "intensity": 0.783768
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 3085.9,
                "intensity": 0.00345642
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 3171.0,
                "intensity": 0.0927798
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 530.3,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 284.8,
                "intensity": 1.0
            }
        ]
    },
    "47": {
        "name": "Silver",
        "atomic_mass": 107.868,
        "number": 47,
        "symbol": "Ag",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 21708.0,
                "intensity": 0.000466912
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 21990.0,
                "intensity": 0.288034
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 22163.0,
                "intensity": 0.542857,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 24910.2,
                "intensity": 0.0476662
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 24941.0,
                "intensity": 0.0920198
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 25140.0,
                "intensity": 0.00120427
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 25450.3,
                "intensity": 0.0274143
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 25510.0,
                "intensity": 0.000336789
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 3202.2,
                "intensity": 0.319354
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 3233.0,
                "intensity": 0.494692
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 3742.3,
                "intensity": 0.0823662
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 3747.7,
                "intensity": 0.103588
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 2805.0,
                "intensity": 0.0320642
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 3150.0,
                "intensity": 0.880841,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 3520.0,
                "intensity": 0.0870948
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 2632.0,
                "intensity": 0.0321671
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 2977.0,
                "intensity": 0.086242
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 2982.7,
                "intensity": 0.775657
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 3254.0,
                "intensity": 0.0036611
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 3347.0,
                "intensity": 0.102272
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 569.0,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 310.3,
                "intensity": 1.0
            }
        ]
    },
    "48": {
        "name": "Cadmium",
        "atomic_mass": 112.41,
        "number": 48,
        "symbol": "Cd",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 22693.0,
                "intensity": 0.00047525
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 22984.0,
                "intensity": 0.287764
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 23173.0,
                "intensity": 0.541041,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 26058.4,
                "intensity": 0.0480446
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 26092.6,
                "intensity": 0.0924314
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 26299.1,
                "intensity": 0.00122578
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 26647.1,
                "intensity": 0.0286752
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 26699.3,
                "intensity": 0.000342803
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 3365.4,
                "intensity": 0.315563
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 3399.6,
                "intensity": 0.495856
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 3954.1,
                "intensity": 0.0833038
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 3954.1,
                "intensity": 0.105278
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 2955.0,
                "intensity": 0.0308225
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 3315.1,
                "intensity": 0.876377,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 3715.3,
                "intensity": 0.0928004
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 2766.0,
                "intensity": 0.0315593
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 3126.1,
                "intensity": 0.085446
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 3132.8,
                "intensity": 0.7684
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 3428.2,
                "intensity": 0.00386505
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 3526.3,
                "intensity": 0.11073
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 607.7,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 348.0,
                "intensity": 1.0
            }
        ]
    },
    "49": {
        "name": "Indium",
        "atomic_mass": 114.82,
        "number": 49,
        "symbol": "In",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 23702.0,
                "intensity": 0.000484013
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 24002.0,
                "intensity": 0.287792
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 24210.0,
                "intensity": 0.539772,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 27236.8,
                "intensity": 0.0482742
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 27274.7,
                "intensity": 0.0929325
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 27488.6,
                "intensity": 0.00124838
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 27866.5,
                "intensity": 0.0291477
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 27922.3,
                "intensity": 0.000349124
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 3534.8,
                "intensity": 0.312033
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 3572.7,
                "intensity": 0.496793
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 4164.5,
                "intensity": 0.0842065
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 4164.5,
                "intensity": 0.106968
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 3110.8,
                "intensity": 0.0296609
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 3486.6,
                "intensity": 0.872309,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 3920.3,
                "intensity": 0.0980306
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 2902.8,
                "intensity": 0.0310338
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 3278.6,
                "intensity": 0.084737
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 3286.1,
                "intensity": 0.761928
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 3607.1,
                "intensity": 0.00406869
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 3712.3,
                "intensity": 0.118233
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 648.4,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 377.9,
                "intensity": 1.0
            }
        ]
    },
    "50": {
        "name": "Tin",
        "atomic_mass": 118.69,
        "number": 50,
        "symbol": "Sn",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 24735.0,
                "intensity": 0.000492729
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 25044.0,
                "intensity": 0.287827
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 25271.0,
                "intensity": 0.538502,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 28443.5,
                "intensity": 0.0485038
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 28485.4,
                "intensity": 0.0934301
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 28706.8,
                "intensity": 0.00127087
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 29116.4,
                "intensity": 0.0296176
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 29175.1,
                "intensity": 0.000355411
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 3708.5,
                "intensity": 0.308771
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 3750.4,
                "intensity": 0.497501
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 4381.4,
                "intensity": 0.0850726
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 4381.4,
                "intensity": 0.108655
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 3271.3,
                "intensity": 0.0285748
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 3662.8,
                "intensity": 0.8686,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 4131.1,
                "intensity": 0.102826
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 3044.3,
                "intensity": 0.0305854
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 3435.8,
                "intensity": 0.0841084
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 3444.1,
                "intensity": 0.756179
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 3791.9,
                "intensity": 0.00427241
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 3904.1,
                "intensity": 0.124855
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 690.7,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 409.6,
                "intensity": 1.0
            }
        ]
    },
    "51": {
        "name": "Antimony",
        "atomic_mass": 121.75,
        "number": 51,
        "symbol": "Sb",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 25793.0,
                "intensity": 0.000501263
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 26111.0,
                "intensity": 0.287793
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 26359.0,
                "intensity": 0.537087,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 29678.3,
                "intensity": 0.0487202
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 29724.6,
                "intensity": 0.0938989
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 29953.5,
                "intensity": 0.00129288
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 30395.4,
                "intensity": 0.0303454
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 30457.7,
                "intensity": 0.000361567
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 3885.3,
                "intensity": 0.305785
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 3931.6,
                "intensity": 0.497976
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 4602.4,
                "intensity": 0.0859009
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 4602.4,
                "intensity": 0.110338
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 3440.0,
                "intensity": 0.0275601
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 3842.5,
                "intensity": 0.865215,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 4346.7,
                "intensity": 0.107225
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 3192.0,
                "intensity": 0.0302093
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 3594.5,
                "intensity": 0.0835541
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 3603.8,
                "intensity": 0.7511
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 3978.8,
                "intensity": 0.00447656
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 4098.7,
                "intensity": 0.13066
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 734.3,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 441.9,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 537.5,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 528.2,
                "intensity": 1.0
            }
        ]
    },
    "52": {
        "name": "Tellurium",
        "atomic_mass": 127.6,
        "number": 52,
        "symbol": "Te",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 26875.0,
                "intensity": 0.000509745
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 27202.0,
                "intensity": 0.287767
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 27473.0,
                "intensity": 0.535672,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 30943.2,
                "intensity": 0.0489366
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 30993.2,
                "intensity": 0.0943639
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 31230.6,
                "intensity": 0.00131475
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 31710.7,
                "intensity": 0.031069
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 31772.1,
                "intensity": 0.000367685
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 4068.2,
                "intensity": 0.303079
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 4118.2,
                "intensity": 0.498218
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 4835.7,
                "intensity": 0.0866899
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 4835.7,
                "intensity": 0.112014
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 3606.0,
                "intensity": 0.0266132
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 4028.6,
                "intensity": 0.862125,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 4570.1,
                "intensity": 0.111262
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 3335.0,
                "intensity": 0.0299013
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 3757.6,
                "intensity": 0.0830686
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 3768.0,
                "intensity": 0.746641
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 4171.6,
                "intensity": 0.00468144
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 4299.1,
                "intensity": 0.135708
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 780.4,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 480.1,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 583.4,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 573.0,
                "intensity": 1.0
            }
        ]
    },
    "53": {
        "name": "Iodine",
        "atomic_mass": 126.905,
        "number": 53,
        "symbol": "I",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 27981.0,
                "intensity": 0.00051776
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 28317.0,
                "intensity": 0.287519
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 28612.0,
                "intensity": 0.533828,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 32238.0,
                "intensity": 0.0491136
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 32294.0,
                "intensity": 0.0947492
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 32538.2,
                "intensity": 0.00133543
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 33046.0,
                "intensity": 0.0325635
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 33118.4,
                "intensity": 0.000373466
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 4257.0,
                "intensity": 0.300658
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 4313.0,
                "intensity": 0.498224
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 5065.0,
                "intensity": 0.0874384
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 5065.0,
                "intensity": 0.11368
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 3780.0,
                "intensity": 0.0257307
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 4221.2,
                "intensity": 0.859299,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 4801.4,
                "intensity": 0.114971
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 3485.0,
                "intensity": 0.0296576
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 3926.2,
                "intensity": 0.0826471
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 3937.7,
                "intensity": 0.742758
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 4371.0,
                "intensity": 0.00488734
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 4506.4,
                "intensity": 0.14005
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 826.1,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 507.8,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 630.8,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 619.3,
                "intensity": 1.0
            }
        ]
    },
    "54": {
        "name": "Xenon",
        "atomic_mass": 131.29,
        "number": 54,
        "symbol": "Xe",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 29108.0,
                "intensity": 0.000525713
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 29454.0,
                "intensity": 0.287281
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 29775.0,
                "intensity": 0.53199,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 33558.9,
                "intensity": 0.0492904
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 33620.4,
                "intensity": 0.0951305
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 33872.0,
                "intensity": 0.00135594
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 34414.3,
                "intensity": 0.0340474
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 34491.5,
                "intensity": 0.000379203
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 4450.9,
                "intensity": 0.298526
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 4512.4,
                "intensity": 0.497996
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 5306.3,
                "intensity": 0.0881452
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 5307.5,
                "intensity": 0.115333
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 3958.3,
                "intensity": 0.0249094
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 4418.0,
                "intensity": 0.85671,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 5037.5,
                "intensity": 0.118381
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 3637.3,
                "intensity": 0.0294749
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 4097.0,
                "intensity": 0.0822849
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 4109.6,
                "intensity": 0.739409
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 4572.8,
                "intensity": 0.00509452
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 4716.5,
                "intensity": 0.143737
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 873.1,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 542.3,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 689.0,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 676.4,
                "intensity": 1.0
            }
        ]
    },
    "55": {
        "name": "Cesium",
        "atomic_mass": 132.905,
        "number": 55,
        "symbol": "Cs",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 30271.0,
                "intensity": 0.000533602
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 30626.0,
                "intensity": 0.287054
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 30973.0,
                "intensity": 0.530156,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 34914.0,
                "intensity": 0.0494671
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 34982.0,
                "intensity": 0.0955077
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 35244.5,
                "intensity": 0.00137629
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 35812.6,
                "intensity": 0.0355205
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 35905.2,
                "intensity": 0.000384894
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 4643.0,
                "intensity": 0.296686
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 4711.0,
                "intensity": 0.497532
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 5541.6,
                "intensity": 0.0888095
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 5552.7,
                "intensity": 0.116972
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 4148.0,
                "intensity": 0.0241467
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 4618.5,
                "intensity": 0.854332,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 5279.2,
                "intensity": 0.121521
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 3801.0,
                "intensity": 0.0293504
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 4271.5,
                "intensity": 0.081978
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 4285.4,
                "intensity": 0.736557
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 4779.7,
                "intensity": 0.00530321
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 4932.2,
                "intensity": 0.146811
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 925.5,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 568.1,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 740.5,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 726.6,
                "intensity": 1.0
            }
        ]
    },
    "56": {
        "name": "Barium",
        "atomic_mass": 137.33,
        "number": 56,
        "symbol": "Ba",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 31452.0,
                "intensity": 0.00054143
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 31817.0,
                "intensity": 0.286837
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 32194.0,
                "intensity": 0.528327,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 36304.0,
                "intensity": 0.0496437
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 36378.0,
                "intensity": 0.0958808
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 36645.3,
                "intensity": 0.00139647
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 37249.0,
                "intensity": 0.0369829
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 37348.4,
                "intensity": 0.000390539
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 4852.0,
                "intensity": 0.295141
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 4926.0,
                "intensity": 0.496835
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 5797.0,
                "intensity": 0.0894302
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 5810.4,
                "intensity": 0.118594
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 4331.0,
                "intensity": 0.0234397
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 4828.3,
                "intensity": 0.852142,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 5531.4,
                "intensity": 0.124419
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 3954.0,
                "intensity": 0.0292812
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 4451.3,
                "intensity": 0.0817226
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 4466.5,
                "intensity": 0.734168
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 4993.5,
                "intensity": 0.0055136
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 5154.4,
                "intensity": 0.149314
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 973.1,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 603.7,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 795.7,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 780.5,
                "intensity": 1.0
            }
        ]
    },
    "57": {
        "name": "Lanthanum",
        "atomic_mass": 138.906,
        "number": 57,
        "symbol": "La",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 32659.0,
                "intensity": 0.000549194
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 33034.0,
                "intensity": 0.286632
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 33442.0,
                "intensity": 0.526502,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 37716.0,
                "intensity": 0.0498202
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 37797.0,
                "intensity": 0.0962498
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 38072.0,
                "intensity": 0.0014165
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 38719.2,
                "intensity": 0.0384346
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 38819.7,
                "intensity": 0.00039614
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 5057.0,
                "intensity": 0.293892
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 5138.0,
                "intensity": 0.495905
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 6060.2,
                "intensity": 0.0900067
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 6070.0,
                "intensity": 0.120197
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 4529.0,
                "intensity": 0.022786
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 5038.0,
                "intensity": 0.850117,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 5785.7,
                "intensity": 0.127097
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 4121.0,
                "intensity": 0.0292651
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 4630.0,
                "intensity": 0.081515
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 4647.0,
                "intensity": 0.73221
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 5208.3,
                "intensity": 0.00572588
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 5377.7,
                "intensity": 0.151284
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 1025.5,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 647.2,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 853.0,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 836.0,
                "intensity": 1.0
            }
        ]
    },
    "58": {
        "name": "Cerium",
        "atomic_mass": 140.12,
        "number": 58,
        "symbol": "Ce",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 33895.0,
                "intensity": 0.000556896
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 34279.0,
                "intensity": 0.286437
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 34720.0,
                "intensity": 0.52468,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 39169.0,
                "intensity": 0.0499967
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 39256.0,
                "intensity": 0.0966147
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 39540.6,
                "intensity": 0.00143637
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 40219.8,
                "intensity": 0.0398757
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 40334.0,
                "intensity": 0.000401695
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 5274.0,
                "intensity": 0.292939
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 5361.0,
                "intensity": 0.494745
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 6324.8,
                "intensity": 0.0905383
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 6341.5,
                "intensity": 0.121778
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 4728.0,
                "intensity": 0.0221835
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 5261.6,
                "intensity": 0.848236,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 6055.0,
                "intensity": 0.12958
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 4287.0,
                "intensity": 0.0292998
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 4820.6,
                "intensity": 0.081352
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 4839.2,
                "intensity": 0.730653
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 5432.0,
                "intensity": 0.00594021
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 5614.0,
                "intensity": 0.152755
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 1078.0,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 679.2,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 902.3,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 883.7,
                "intensity": 1.0
            }
        ]
    },
    "59": {
        "name": "Praseodymium",
        "atomic_mass": 140.908,
        "number": 59,
        "symbol": "Pr",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 35156.0,
                "intensity": 0.000564387
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 35551.0,
                "intensity": 0.28618
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 36027.0,
                "intensity": 0.522726,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 40654.0,
                "intensity": 0.05016
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 40749.0,
                "intensity": 0.09695
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 41042.7,
                "intensity": 0.00145569
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 41754.7,
                "intensity": 0.0415567
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 41875.9,
                "intensity": 0.000407099
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 5498.0,
                "intensity": 0.292282
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 5593.0,
                "intensity": 0.493358
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 6598.7,
                "intensity": 0.0910245
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 6617.4,
                "intensity": 0.123335
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 4929.0,
                "intensity": 0.0216299
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 5491.7,
                "intensity": 0.846481,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 6324.9,
                "intensity": 0.13189
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 4453.0,
                "intensity": 0.0293836
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 5015.7,
                "intensity": 0.0812304
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 5035.2,
                "intensity": 0.729469
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 5659.5,
                "intensity": 0.00615672
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 5848.9,
                "intensity": 0.153761
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 1126.9,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 712.0,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 946.3,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 926.8,
                "intensity": 1.0
            }
        ]
    },
    "60": {
        "name": "Neodymium",
        "atomic_mass": 144.24,
        "number": 60,
        "symbol": "Nd",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 36443.0,
                "intensity": 5.91489e-05
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 36847.0,
                "intensity": 0.286081
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 37361.0,
                "intensity": 0.521044,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 42166.0,
                "intensity": 0.0503491
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 42272.0,
                "intensity": 0.0973311
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 42565.7,
                "intensity": 0.0014756
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 43325.7,
                "intensity": 0.0432467
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 43448.5,
                "intensity": 0.000412667
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 5723.0,
                "intensity": 0.291921
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 5829.0,
                "intensity": 0.491747
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 6882.7,
                "intensity": 0.0914649
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 6901.4,
                "intensity": 0.124867
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 5147.0,
                "intensity": 0.0211231
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 5718.7,
                "intensity": 0.844831,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 6601.5,
                "intensity": 0.134045
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 4633.0,
                "intensity": 0.0295191
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 5204.7,
                "intensity": 0.0811602
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 5227.6,
                "intensity": 0.728745
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 5888.8,
                "intensity": 0.00621882
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 6087.5,
                "intensity": 0.154357
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 1176.5,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 760.0,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 1001.8,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 978.9,
                "intensity": 1.0
            }
        ]
    },
    "61": {
        "name": "Promethium",
        "atomic_mass": 144.913,
        "number": 61,
        "symbol": "Pm",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 37756.0,
                "intensity": 6.67739e-05
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 38171.0,
                "intensity": 0.286145
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 38725.0,
                "intensity": 0.519639,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 43712.6,
                "intensity": 0.0505649
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 43827.0,
                "intensity": 0.0977597
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 44132.0,
                "intensity": 0.00149615
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 44942.0,
                "intensity": 0.0439095
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 45064.0,
                "intensity": 0.000418414
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 5956.6,
                "intensity": 0.291853
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 6071.0,
                "intensity": 0.489916
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 7186.0,
                "intensity": 0.0918593
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 7186.0,
                "intensity": 0.126371
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 5363.0,
                "intensity": 0.0206615
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 5961.0,
                "intensity": 0.843271,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 6893.0,
                "intensity": 0.136067
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 4809.0,
                "intensity": 0.0296954
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 5407.0,
                "intensity": 0.0811122
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 5432.0,
                "intensity": 0.728221
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 6128.0,
                "intensity": 0.00644786
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 6339.0,
                "intensity": 0.154523
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 1237.0,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 810.0,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 1048.0,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 1023.0,
                "intensity": 1.0
            }
        ]
    },
    "62": {
        "name": "Samarium",
        "atomic_mass": 150.36,
        "number": 62,
        "symbol": "Sm",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 39097.0,
                "intensity": 7.43095e-05
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 39522.0,
                "intensity": 0.28622
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 40118.0,
                "intensity": 0.518232,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 45293.0,
                "intensity": 0.0507808
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 45414.2,
                "intensity": 0.0981843
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 45723.1,
                "intensity": 0.00151655
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 46568.4,
                "intensity": 0.044568
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 46705.0,
                "intensity": 0.000424121
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 6196.0,
                "intensity": 0.292076
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 6317.2,
                "intensity": 0.487871
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 7471.4,
                "intensity": 0.0922077
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 7489.6,
                "intensity": 0.127845
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 5589.0,
                "intensity": 0.020243
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 6201.1,
                "intensity": 0.841785,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 7183.0,
                "intensity": 0.137972
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 4993.0,
                "intensity": 0.0299157
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 5605.1,
                "intensity": 0.0810972
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 5632.6,
                "intensity": 0.727994
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 6368.8,
                "intensity": 0.00667929
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 6587.0,
                "intensity": 0.154314
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 1290.8,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 845.3,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 1105.7,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 1078.2,
                "intensity": 1.0
            }
        ]
    },
    "63": {
        "name": "Europium",
        "atomic_mass": 151.96,
        "number": 63,
        "symbol": "Eu",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 40467.0,
                "intensity": 8.19248e-05
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 40902.0,
                "intensity": 0.286305
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 41542.0,
                "intensity": 0.516823,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 46905.0,
                "intensity": 0.0509968
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 47038.0,
                "intensity": 0.0986047
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 47360.4,
                "intensity": 0.00153682
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 48235.0,
                "intensity": 0.045222
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 48386.0,
                "intensity": 0.00042979
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 6438.0,
                "intensity": 0.292586
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 6571.0,
                "intensity": 0.485616
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 7768.0,
                "intensity": 0.0925099
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 7795.0,
                "intensity": 0.129288
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 5817.0,
                "intensity": 0.019866
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 6458.4,
                "intensity": 0.840356,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 7484.0,
                "intensity": 0.139778
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 5177.0,
                "intensity": 0.0301787
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 5818.4,
                "intensity": 0.0811125
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 5849.5,
                "intensity": 0.72804
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 6617.0,
                "intensity": 0.00691316
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 6844.0,
                "intensity": 0.153756
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 1353.3,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 874.6,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 1152.6,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 1121.5,
                "intensity": 1.0
            }
        ]
    },
    "64": {
        "name": "Gadolinium",
        "atomic_mass": 157.25,
        "number": 64,
        "symbol": "Gd",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 41863.0,
                "intensity": 8.99129e-05
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 42309.0,
                "intensity": 0.286809
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 42996.0,
                "intensity": 0.516144,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 48551.0,
                "intensity": 0.0507971
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 48695.0,
                "intensity": 0.0982171
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 49017.1,
                "intensity": 0.00156358
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 49953.0,
                "intensity": 0.0459368
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 50096.4,
                "intensity": 0.000442581
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 6688.0,
                "intensity": 0.293244
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 6832.0,
                "intensity": 0.482936
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 8090.0,
                "intensity": 0.0931822
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 8105.0,
                "intensity": 0.130638
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 6049.0,
                "intensity": 0.0195289
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 6708.1,
                "intensity": 0.838972,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 7787.4,
                "intensity": 0.141499
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 5362.0,
                "intensity": 0.0304831
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 6021.1,
                "intensity": 0.0811557
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 6053.4,
                "intensity": 0.728335
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 6864.4,
                "intensity": 0.00714951
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 7100.4,
                "intensity": 0.152877
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 1401.4,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 935.9,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 1213.3,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 1181.0,
                "intensity": 1.0
            }
        ]
    },
    "65": {
        "name": "Terbium",
        "atomic_mass": 158.925,
        "number": 65,
        "symbol": "Tb",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 43288.0,
                "intensity": 9.80819e-05
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 43744.0,
                "intensity": 0.286579
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 44482.0,
                "intensity": 0.514122,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 50228.0,
                "intensity": 0.0515893
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 50385.0,
                "intensity": 0.099743
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 50719.1,
                "intensity": 0.00166062
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 51673.6,
                "intensity": 0.0457569
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 51845.5,
                "intensity": 0.000450928
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 6940.0,
                "intensity": 0.294412
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 7097.0,
                "intensity": 0.480439
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 8385.6,
                "intensity": 0.0930923
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 8423.9,
                "intensity": 0.132056
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 6284.0,
                "intensity": 0.0192301
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 6975.1,
                "intensity": 0.837619,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 8101.5,
                "intensity": 0.143151
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 5546.0,
                "intensity": 0.0308277
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 6237.1,
                "intensity": 0.0812242
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 6272.9,
                "intensity": 0.728857
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 7118.0,
                "intensity": 0.00738835
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 7363.5,
                "intensity": 0.151703
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 1460.5,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 954.5,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 1269.2,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 1233.4,
                "intensity": 1.0
            }
        ]
    },
    "66": {
        "name": "Dysprosium",
        "atomic_mass": 162.5,
        "number": 66,
        "symbol": "Dy",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 44743.0,
                "intensity": 0.000106827
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 45208.0,
                "intensity": 0.286417
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 45999.0,
                "intensity": 0.512204,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 51947.0,
                "intensity": 0.0523203
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 52113.0,
                "intensity": 0.101146
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 52456.0,
                "intensity": 0.0017572
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 53455.5,
                "intensity": 0.0455862
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 53635.4,
                "intensity": 0.000461832
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 7204.0,
                "intensity": 0.295806
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 7370.0,
                "intensity": 0.477673
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 8712.5,
                "intensity": 0.0931021
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 8752.8,
                "intensity": 0.133418
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 6534.0,
                "intensity": 0.018968
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 7248.0,
                "intensity": 0.836285,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 8427.4,
                "intensity": 0.144747
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 5743.0,
                "intensity": 0.0312112
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 6457.0,
                "intensity": 0.0813156
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 6498.0,
                "intensity": 0.729584
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 7375.8,
                "intensity": 0.00762967
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 7636.4,
                "intensity": 0.15026
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 1522.4,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 999.5,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 1325.0,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 1284.0,
                "intensity": 1.0
            }
        ]
    },
    "67": {
        "name": "Holmium",
        "atomic_mass": 164.93,
        "number": 67,
        "symbol": "Ho",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 46224.0,
                "intensity": 0.000116342
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 46700.0,
                "intensity": 0.286395
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 47547.0,
                "intensity": 0.510513,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 53695.0,
                "intensity": 0.053007
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 53877.0,
                "intensity": 0.102459
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 54226.0,
                "intensity": 0.00185384
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 55274.5,
                "intensity": 0.0451804
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 55458.0,
                "intensity": 0.000475417
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 7471.0,
                "intensity": 0.297416
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 7653.0,
                "intensity": 0.47464
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 9050.5,
                "intensity": 0.0932251
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 9085.8,
                "intensity": 0.134719
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 6790.0,
                "intensity": 0.0187411
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 7526.0,
                "intensity": 0.834959,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 8758.0,
                "intensity": 0.1463
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 5943.0,
                "intensity": 0.0316326
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 6679.0,
                "intensity": 0.0814274
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 6720.0,
                "intensity": 0.730494
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 7638.6,
                "intensity": 0.00787342
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 7911.0,
                "intensity": 0.148573
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 1581.0,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 1048.5,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 1383.4,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 1342.4,
                "intensity": 1.0
            }
        ]
    },
    "68": {
        "name": "Erbium",
        "atomic_mass": 167.26,
        "number": 68,
        "symbol": "Er",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 47735.0,
                "intensity": 0.000126764
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 48222.0,
                "intensity": 0.286435
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 49128.0,
                "intensity": 0.508912,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 55480.0,
                "intensity": 0.0536393
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 55674.0,
                "intensity": 0.103661
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 56033.0,
                "intensity": 0.00195014
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 57119.8,
                "intensity": 0.0447842
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 57318.4,
                "intensity": 0.000491573
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 7745.0,
                "intensity": 0.299229
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 7939.0,
                "intensity": 0.471341
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 9384.8,
                "intensity": 0.0934733
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 9430.8,
                "intensity": 0.135957
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 7058.0,
                "intensity": 0.0185481
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 7811.0,
                "intensity": 0.833631,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 9096.4,
                "intensity": 0.147821
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 6152.0,
                "intensity": 0.0320908
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 6905.0,
                "intensity": 0.0815571
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 6949.0,
                "intensity": 0.731565
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 7908.2,
                "intensity": 0.00811955
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 8190.4,
                "intensity": 0.146668
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 1644.4,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 1086.8,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 1448.3,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 1404.3,
                "intensity": 1.0
            }
        ]
    },
    "69": {
        "name": "Thulium",
        "atomic_mass": 168.934,
        "number": 69,
        "symbol": "Tm",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 49274.0,
                "intensity": 0.000138253
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 49773.0,
                "intensity": 0.286535
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 50742.0,
                "intensity": 0.507393,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 57300.0,
                "intensity": 0.0542205
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 57505.0,
                "intensity": 0.10476
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 57875.0,
                "intensity": 0.00204613
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 59004.1,
                "intensity": 0.0443969
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 59214.5,
                "intensity": 0.000510306
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 8026.0,
                "intensity": 0.301233
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 8231.0,
                "intensity": 0.467781
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 9730.1,
                "intensity": 0.0938586
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 9783.4,
                "intensity": 0.137127
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 7310.0,
                "intensity": 0.0183875
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 8102.0,
                "intensity": 0.832292,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 9441.5,
                "intensity": 0.14932
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 6341.0,
                "intensity": 0.0325845
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 7133.0,
                "intensity": 0.0817023
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 7180.0,
                "intensity": 0.732774
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 8177.1,
                "intensity": 0.00836794
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 8472.5,
                "intensity": 0.144571
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 1709.5,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 1129.1,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 1510.4,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 1463.4,
                "intensity": 1.0
            }
        ]
    },
    "70": {
        "name": "Ytterbium",
        "atomic_mass": 173.04,
        "number": 70,
        "symbol": "Yb",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 50846.0,
                "intensity": 0.000150968
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 51354.0,
                "intensity": 0.286692
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 52388.0,
                "intensity": 0.505952,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 59159.0,
                "intensity": 0.0547534
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 59382.0,
                "intensity": 0.10576
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 59756.0,
                "intensity": 0.00214185
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 60943.3,
                "intensity": 0.0440178
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 61140.8,
                "intensity": 0.000531626
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 8313.0,
                "intensity": 0.303417
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 8536.0,
                "intensity": 0.463965
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 10097.3,
                "intensity": 0.0943913
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 10146.3,
                "intensity": 0.138227
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 7580.0,
                "intensity": 0.018258
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 8402.0,
                "intensity": 0.830934,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 9786.8,
                "intensity": 0.150808
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 6546.0,
                "intensity": 0.0330969
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 7368.0,
                "intensity": 0.0818213
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 7416.0,
                "intensity": 0.733749
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 8463.5,
                "intensity": 0.00861436
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 8752.8,
                "intensity": 0.142719
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 1767.6,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 1187.3,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 1573.5,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 1525.5,
                "intensity": 1.0
            }
        ]
    },
    "71": {
        "name": "Lutetium",
        "atomic_mass": 174.967,
        "number": 71,
        "symbol": "Lu",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 52444.0,
                "intensity": 0.000165109
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 52965.0,
                "intensity": 0.286977
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 54070.0,
                "intensity": 0.50471,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 61050.0,
                "intensity": 0.0552548
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 61290.0,
                "intensity": 0.106695
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 61675.0,
                "intensity": 0.00223786
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 62901.6,
                "intensity": 0.043405
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 63107.9,
                "intensity": 0.000555682
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 8606.0,
                "intensity": 0.305766
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 8846.0,
                "intensity": 0.459899
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 10457.6,
                "intensity": 0.0950812
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 10510.8,
                "intensity": 0.139253
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 7858.0,
                "intensity": 0.0181582
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 8710.0,
                "intensity": 0.829548,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 10142.9,
                "intensity": 0.152294
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 6753.0,
                "intensity": 0.0333249
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 7605.0,
                "intensity": 0.081178
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 7655.0,
                "intensity": 0.727887
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 8737.2,
                "intensity": 0.00877894
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 9037.9,
                "intensity": 0.148831
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 1827.7,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 1226.6,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 1630.1,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 1580.1,
                "intensity": 1.0
            }
        ]
    },
    "72": {
        "name": "Hafnium",
        "atomic_mass": 178.49,
        "number": 72,
        "symbol": "Hf",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 54080.0,
                "intensity": 0.0001808
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 54612.0,
                "intensity": 0.287314
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 55790.0,
                "intensity": 0.503533,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 62986.0,
                "intensity": 0.0557139
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 63244.0,
                "intensity": 0.107542
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 63635.0,
                "intensity": 0.00233368
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 64912.8,
                "intensity": 0.0428003
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 65131.0,
                "intensity": 0.000582359
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 8906.0,
                "intensity": 0.308268
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 9164.0,
                "intensity": 0.45559
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 10832.8,
                "intensity": 0.0959372
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 10890.3,
                "intensity": 0.140204
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 8138.0,
                "intensity": 0.0180868
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 9023.0,
                "intensity": 0.828129,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 10519.0,
                "intensity": 0.153784
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 6960.0,
                "intensity": 0.0336129
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 7845.0,
                "intensity": 0.0806342
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 7899.0,
                "intensity": 0.722919
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 9023.0,
                "intensity": 0.00895083
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 9341.0,
                "intensity": 0.153883
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 1895.5,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 1277.8,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 1700.1,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 1646.1,
                "intensity": 1.0
            }
        ]
    },
    "73": {
        "name": "Tantalum",
        "atomic_mass": 180.948,
        "number": 73,
        "symbol": "Ta",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 55734.0,
                "intensity": 0.000198048
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 56280.0,
                "intensity": 0.287485
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 57535.0,
                "intensity": 0.502037,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 64947.0,
                "intensity": 0.0560909
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 65222.0,
                "intensity": 0.108226
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 65623.0,
                "intensity": 0.00242749
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 66952.6,
                "intensity": 0.0429242
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 67178.1,
                "intensity": 0.000611209
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 9213.0,
                "intensity": 0.310909
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 9488.0,
                "intensity": 0.451047
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 11218.6,
                "intensity": 0.0969666
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 11281.1,
                "intensity": 0.141077
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 8428.0,
                "intensity": 0.0180424
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 9343.0,
                "intensity": 0.826671,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 10898.1,
                "intensity": 0.155287
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 7173.0,
                "intensity": 0.0339554
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 8088.0,
                "intensity": 0.0801745
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 8146.0,
                "intensity": 0.718706
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 9317.6,
                "intensity": 0.00912914
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 9643.1,
                "intensity": 0.158035
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 1967.6,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 1329.6,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 1769.5,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 1711.5,
                "intensity": 1.0
            }
        ]
    },
    "74": {
        "name": "Tungsten",
        "atomic_mass": 183.85,
        "number": 74,
        "symbol": "W",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 57425.0,
                "intensity": 0.00021713
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 57981.0,
                "intensity": 0.287705
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 59318.0,
                "intensity": 0.500601,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 66950.0,
                "intensity": 0.0564303
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 67244.0,
                "intensity": 0.108831
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 67653.0,
                "intensity": 0.002521
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 69034.6,
                "intensity": 0.0430517
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 69269.1,
                "intensity": 0.000642663
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 9525.0,
                "intensity": 0.313674
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 9819.0,
                "intensity": 0.446279
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 11609.6,
                "intensity": 0.0981765
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 11676.4,
                "intensity": 0.141871
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 8724.0,
                "intensity": 0.0180238
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 9672.0,
                "intensity": 0.825169,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 11288.1,
                "intensity": 0.156807
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 7387.0,
                "intensity": 0.0343474
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 8335.0,
                "intensity": 0.0797856
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 8398.0,
                "intensity": 0.715129
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 9612.9,
                "intensity": 0.00931302
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 9951.1,
                "intensity": 0.161425
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 2037.5,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 1381.6,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 1838.4,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 1775.4,
                "intensity": 1.0
            }
        ]
    },
    "75": {
        "name": "Rhenium",
        "atomic_mass": 186.207,
        "number": 75,
        "symbol": "Re",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 59149.0,
                "intensity": 0.000238197
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 59717.0,
                "intensity": 0.28797
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 61141.0,
                "intensity": 0.499218,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 68994.0,
                "intensity": 0.0567349
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 69309.0,
                "intensity": 0.109365
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 69727.0,
                "intensity": 0.00261421
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 71157.3,
                "intensity": 0.0431824
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 71402.1,
                "intensity": 0.000676731
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 9845.0,
                "intensity": 0.31655
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 10160.0,
                "intensity": 0.441295
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 12008.3,
                "intensity": 0.0995718
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 12080.2,
                "intensity": 0.142584
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 9027.0,
                "intensity": 0.0180298
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 10010.0,
                "intensity": 0.823619,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 11685.1,
                "intensity": 0.158351
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 7603.0,
                "intensity": 0.0347842
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 8586.0,
                "intensity": 0.0794553
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 8652.0,
                "intensity": 0.712078
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 9909.6,
                "intensity": 0.00950162
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 10261.1,
                "intensity": 0.16418
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 2106.5,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 1430.3,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 1906.1,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 1840.1,
                "intensity": 1.0
            }
        ]
    },
    "76": {
        "name": "Osmium",
        "atomic_mass": 190.2,
        "number": 76,
        "symbol": "Os",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 60903.0,
                "intensity": 0.000261399
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 61486.0,
                "intensity": 0.28828
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 63000.0,
                "intensity": 0.497885,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 71079.0,
                "intensity": 0.0570071
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 71414.0,
                "intensity": 0.10983
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 71840.0,
                "intensity": 0.00270713
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 73321.9,
                "intensity": 0.043316
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 73577.9,
                "intensity": 0.000713421
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 10176.0,
                "intensity": 0.319522
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 10511.0,
                "intensity": 0.436106
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 12418.9,
                "intensity": 0.101158
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 12497.3,
                "intensity": 0.143214
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 9336.0,
                "intensity": 0.018059
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 10354.0,
                "intensity": 0.822018,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 12091.9,
                "intensity": 0.159923
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 7822.0,
                "intensity": 0.0352618
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 8840.0,
                "intensity": 0.0791729
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 8911.0,
                "intensity": 0.709457
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 10212.8,
                "intensity": 0.00969414
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 10577.9,
                "intensity": 0.166414
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 2178.5,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 1481.9,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 1977.6,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 1906.6,
                "intensity": 1.0
            }
        ]
    },
    "77": {
        "name": "Iridium",
        "atomic_mass": 192.22,
        "number": 77,
        "symbol": "Ir",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 62692.0,
                "intensity": 0.00028667
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 63287.0,
                "intensity": 0.288416
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 64896.0,
                "intensity": 0.496225,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 73202.0,
                "intensity": 0.0572068
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 73560.0,
                "intensity": 0.110151
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 73995.0,
                "intensity": 0.00279768
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 75533.2,
                "intensity": 0.044164
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 75799.1,
                "intensity": 0.000752183
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 10510.0,
                "intensity": 0.322577
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 10868.0,
                "intensity": 0.430725
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 12841.2,
                "intensity": 0.102936
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 12923.2,
                "intensity": 0.143762
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 9650.0,
                "intensity": 0.0181103
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 10708.0,
                "intensity": 0.820364,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 12512.1,
                "intensity": 0.161526
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 8041.0,
                "intensity": 0.0357761
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 9099.0,
                "intensity": 0.0789286
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 9175.0,
                "intensity": 0.707178
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 10523.9,
                "intensity": 0.00988976
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 10903.1,
                "intensity": 0.168227
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 2254.7,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 1538.2,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 2052.2,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 1976.2,
                "intensity": 1.0
            }
        ]
    },
    "78": {
        "name": "Platinum",
        "atomic_mass": 195.08,
        "number": 78,
        "symbol": "Pt",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 64515.0,
                "intensity": 0.000314331
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 65122.0,
                "intensity": 0.288593
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 66831.0,
                "intensity": 0.494609,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 75368.0,
                "intensity": 0.0573791
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 75750.0,
                "intensity": 0.110414
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 76193.0,
                "intensity": 0.00288781
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 77785.9,
                "intensity": 0.0450094
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 78063.4,
                "intensity": 0.000793528
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 10853.0,
                "intensity": 0.3257
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 11235.0,
                "intensity": 0.425163
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 13270.9,
                "intensity": 0.104911
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 13360.6,
                "intensity": 0.144227
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 9977.0,
                "intensity": 0.0181825
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 11071.0,
                "intensity": 0.818656,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 12941.4,
                "intensity": 0.163162
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 8268.0,
                "intensity": 0.0363241
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 9362.0,
                "intensity": 0.0787148
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 9442.0,
                "intensity": 0.705173
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 10838.6,
                "intensity": 0.0100878
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 11232.4,
                "intensity": 0.1697
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 2330.4,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 1592.9,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 2127.5,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 2047.5,
                "intensity": 1.0
            }
        ]
    },
    "79": {
        "name": "Gold",
        "atomic_mass": 196.967,
        "number": 79,
        "symbol": "Au",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 66372.0,
                "intensity": 0.000344437
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 66991.0,
                "intensity": 0.288737
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 68806.0,
                "intensity": 0.49291,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 77577.0,
                "intensity": 0.0575121
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 77982.0,
                "intensity": 0.110596
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 78434.0,
                "intensity": 0.0029768
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 80082.3,
                "intensity": 0.0460871
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 80371.8,
                "intensity": 0.000837254
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 11205.0,
                "intensity": 0.328877
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 11610.0,
                "intensity": 0.419432
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 13710.3,
                "intensity": 0.107082
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 13806.7,
                "intensity": 0.144608
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 10309.0,
                "intensity": 0.0178699
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 11443.0,
                "intensity": 0.798815,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 13380.8,
                "intensity": 0.161187
            },
            {
                "IUPAC": "L2-O4",
                "Siegbahn": "Lg6",
                "energy": 13729.0,
                "intensity": 0.022128
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 8494.0,
                "intensity": 0.0363102
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 9628.0,
                "intensity": 0.0772639
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 9713.0,
                "intensity": 0.692087
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 11156.9,
                "intensity": 0.0101226
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 11565.8,
                "intensity": 0.168163
            },
            {
                "IUPAC": "L3-O4,5",
                "Siegbahn": "Lb5",
                "energy": 11914.0,
                "intensity": 0.016053
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 2407.9,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 1648.3,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 2203.4,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 2118.4,
                "intensity": 1.0
            }
        ]
    },
    "80": {
        "name": "Mercury",
        "atomic_mass": 200.59,
        "number": 80,
        "symbol": "Hg",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 68263.0,
                "intensity": 0.000377197
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 68893.0,
                "intensity": 0.288916
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 70818.0,
                "intensity": 0.491246,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 79823.0,
                "intensity": 0.0576225
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 80255.0,
                "intensity": 0.11073
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 80717.0,
                "intensity": 0.00306533
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 82421.8,
                "intensity": 0.0471596
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 82723.8,
                "intensity": 0.000883547
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 11560.0,
                "intensity": 0.332096
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 11992.0,
                "intensity": 0.413547
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 14158.8,
                "intensity": 0.109451
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 14262.4,
                "intensity": 0.144907
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 10647.0,
                "intensity": 0.0179318
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 11824.0,
                "intensity": 0.795004,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 13830.8,
                "intensity": 0.162443
            },
            {
                "IUPAC": "L2-O4",
                "Siegbahn": "Lg6",
                "energy": 14199.4,
                "intensity": 0.0246215
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 8722.0,
                "intensity": 0.0368332
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 9899.0,
                "intensity": 0.07694
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 9989.0,
                "intensity": 0.689099
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 11481.8,
                "intensity": 0.0102998
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 11905.8,
                "intensity": 0.16882
            },
            {
                "IUPAC": "L3-O4,5",
                "Siegbahn": "Lb5",
                "energy": 12274.4,
                "intensity": 0.0180081
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 2488.2,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 1704.8,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 2281.0,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 2191.0,
                "intensity": 1.0
            }
        ]
    },
    "81": {
        "name": "Thallium",
        "atomic_mass": 204.383,
        "number": 81,
        "symbol": "Tl",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 70183.0,
                "intensity": 0.000412643
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 70832.0,
                "intensity": 0.289059
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 72872.0,
                "intensity": 0.489493,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 82114.0,
                "intensity": 0.0576985
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 82573.0,
                "intensity": 0.110792
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 83045.0,
                "intensity": 0.00315261
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 84809.5,
                "intensity": 0.0484598
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 85124.3,
                "intensity": 0.000932181
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 11931.0,
                "intensity": 0.335342
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 12390.0,
                "intensity": 0.407519
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 14626.5,
                "intensity": 0.112015
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 14737.5,
                "intensity": 0.145123
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 10994.0,
                "intensity": 0.0180142
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 12213.0,
                "intensity": 0.791335,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 14292.3,
                "intensity": 0.163764
            },
            {
                "IUPAC": "L2-O4",
                "Siegbahn": "Lg6",
                "energy": 14683.3,
                "intensity": 0.0268873
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 8954.0,
                "intensity": 0.0373809
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 10173.0,
                "intensity": 0.0766335
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 10269.0,
                "intensity": 0.686267
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 11811.8,
                "intensity": 0.0104776
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 12252.3,
                "intensity": 0.169342
            },
            {
                "IUPAC": "L3-O4,5",
                "Siegbahn": "Lb5",
                "energy": 12643.3,
                "intensity": 0.0198992
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 2572.0,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 1764.5,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 2362.8,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 2266.8,
                "intensity": 1.0
            }
        ]
    },
    "82": {
        "name": "Lead",
        "atomic_mass": 207.2,
        "number": 82,
        "symbol": "Pb",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 72144.0,
                "intensity": 0.000450992
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 72805.0,
                "intensity": 0.289233
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 74970.0,
                "intensity": 0.487769,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 84451.0,
                "intensity": 0.0577565
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 84939.0,
                "intensity": 0.110815
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 85419.0,
                "intensity": 0.00323938
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 87243.1,
                "intensity": 0.0497524
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 87570.7,
                "intensity": 0.00098336
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 12307.0,
                "intensity": 0.338604
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 12795.0,
                "intensity": 0.401364
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 15099.1,
                "intensity": 0.114773
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 15217.5,
                "intensity": 0.145259
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 11349.0,
                "intensity": 0.0181159
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 12614.0,
                "intensity": 0.787801,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 14765.7,
                "intensity": 0.165149
            },
            {
                "IUPAC": "L2-O4",
                "Siegbahn": "Lg6",
                "energy": 15179.3,
                "intensity": 0.0289336
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 9184.0,
                "intensity": 0.0379508
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 10449.0,
                "intensity": 0.0763391
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 10551.0,
                "intensity": 0.683544
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 12143.2,
                "intensity": 0.0106552
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 12600.7,
                "intensity": 0.169784
            },
            {
                "IUPAC": "L3-O4,5",
                "Siegbahn": "Lb5",
                "energy": 13014.3,
                "intensity": 0.0217267
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 2653.8,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 1824.1,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 2444.3,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 2342.3,
                "intensity": 1.0
            }
        ]
    },
    "83": {
        "name": "Bismuth",
        "atomic_mass": 208.98,
        "number": 83,
        "symbol": "Bi",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 74138.0,
                "intensity": 0.000492369
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 74815.0,
                "intensity": 0.289437
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 77107.0,
                "intensity": 0.486067,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 86830.0,
                "intensity": 0.057799
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 87349.0,
                "intensity": 0.110804
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 87838.0,
                "intensity": 0.00332562
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 89720.8,
                "intensity": 0.0510371
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 90062.0,
                "intensity": 0.00103708
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 12692.0,
                "intensity": 0.341869
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 13211.0,
                "intensity": 0.395094
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 15582.8,
                "intensity": 0.117723
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 15709.2,
                "intensity": 0.145314
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 11712.0,
                "intensity": 0.0182354
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 13023.0,
                "intensity": 0.784398,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 15247.0,
                "intensity": 0.166598
            },
            {
                "IUPAC": "L2-O4",
                "Siegbahn": "Lg6",
                "energy": 15684.1,
                "intensity": 0.030769
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 9420.0,
                "intensity": 0.0385407
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 10731.0,
                "intensity": 0.076053
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 10839.0,
                "intensity": 0.680896
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 12480.0,
                "intensity": 0.0108322
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 12955.0,
                "intensity": 0.170187
            },
            {
                "IUPAC": "L3-O4,5",
                "Siegbahn": "Lb5",
                "energy": 13392.1,
                "intensity": 0.0234911
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 2736.9,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 1882.8,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 2525.7,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 2417.7,
                "intensity": 1.0
            }
        ]
    },
    "84": {
        "name": "Polonium",
        "atomic_mass": 208.982,
        "number": 84,
        "symbol": "Po",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 76166.0,
                "intensity": 0.000536899
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 76861.0,
                "intensity": 0.289669
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 79291.0,
                "intensity": 0.484385,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 89251.0,
                "intensity": 0.0578282
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 89803.0,
                "intensity": 0.110762
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 90307.0,
                "intensity": 0.0034113
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 92254.0,
                "intensity": 0.0523136
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 92605.0,
                "intensity": 0.00109334
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 13085.0,
                "intensity": 0.345126
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 13637.0,
                "intensity": 0.388723
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 16088.0,
                "intensity": 0.12086
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 16234.0,
                "intensity": 0.145291
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 12095.0,
                "intensity": 0.0183717
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 13446.0,
                "intensity": 0.78112,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 15744.0,
                "intensity": 0.168107
            },
            {
                "IUPAC": "L2-O4",
                "Siegbahn": "Lg6",
                "energy": 16213.0,
                "intensity": 0.0324015
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 9665.0,
                "intensity": 0.0391492
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 11016.0,
                "intensity": 0.0757729
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 11131.0,
                "intensity": 0.678302
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 12819.0,
                "intensity": 0.0110085
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 13314.0,
                "intensity": 0.170575
            },
            {
                "IUPAC": "L3-O4,5",
                "Siegbahn": "Lb5",
                "energy": 13783.0,
                "intensity": 0.0251926
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 2829.0,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 1947.0,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 2614.0,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 2499.0,
                "intensity": 1.0
            }
        ]
    },
    "85": {
        "name": "Astatine",
        "atomic_mass": 209.987,
        "number": 85,
        "symbol": "At",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 78237.0,
                "intensity": 0.000584849
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 78945.0,
                "intensity": 0.289996
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 81516.0,
                "intensity": 0.482835,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 91722.0,
                "intensity": 0.0578602
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 92304.0,
                "intensity": 0.110721
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 92821.0,
                "intensity": 0.00349727
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 94844.0,
                "intensity": 0.0533533
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 95197.0,
                "intensity": 0.0011524
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 13485.0,
                "intensity": 0.348363
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 14067.0,
                "intensity": 0.382266
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 16607.0,
                "intensity": 0.12418
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 16753.0,
                "intensity": 0.145191
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 12468.0,
                "intensity": 0.0185236
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 13876.0,
                "intensity": 0.777965,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 16252.0,
                "intensity": 0.169672
            },
            {
                "IUPAC": "L2-O4",
                "Siegbahn": "Lg6",
                "energy": 16745.0,
                "intensity": 0.0338389
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 9897.0,
                "intensity": 0.039775
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 11305.0,
                "intensity": 0.0754965
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 11427.0,
                "intensity": 0.675742
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 13172.0,
                "intensity": 0.0111836
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 13681.0,
                "intensity": 0.170971
            },
            {
                "IUPAC": "L3-O4,5",
                "Siegbahn": "Lb5",
                "energy": 14174.0,
                "intensity": 0.0268316
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 2919.0,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 2023.0,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 2699.0,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 2577.0,
                "intensity": 1.0
            }
        ]
    },
    "86": {
        "name": "Radon",
        "atomic_mass": 222.018,
        "number": 86,
        "symbol": "Rn",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 80355.0,
                "intensity": 0.000636216
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 81067.0,
                "intensity": 0.290345
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 83785.0,
                "intensity": 0.481294,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 94245.0,
                "intensity": 0.0578832
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 94866.0,
                "intensity": 0.110658
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 95382.0,
                "intensity": 0.00358269
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 97475.0,
                "intensity": 0.0543862
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 97837.0,
                "intensity": 0.00121402
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 13890.0,
                "intensity": 0.351569
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 14511.0,
                "intensity": 0.375735
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 17120.0,
                "intensity": 0.127679
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 17281.0,
                "intensity": 0.145017
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 12855.0,
                "intensity": 0.01869
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 14315.0,
                "intensity": 0.77493,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 16770.0,
                "intensity": 0.171291
            },
            {
                "IUPAC": "L2-O4",
                "Siegbahn": "Lg6",
                "energy": 17289.0,
                "intensity": 0.0350889
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 10137.0,
                "intensity": 0.0404172
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 11597.0,
                "intensity": 0.0752228
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 11727.0,
                "intensity": 0.673207
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 13522.0,
                "intensity": 0.0113575
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 14052.0,
                "intensity": 0.171387
            },
            {
                "IUPAC": "L3-O4,5",
                "Siegbahn": "Lb5",
                "energy": 14571.0,
                "intensity": 0.0284084
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 2997.0,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 2093.0,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 2784.0,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 2654.0,
                "intensity": 1.0
            }
        ]
    },
    "87": {
        "name": "Francium",
        "atomic_mass": 223.02,
        "number": 87,
        "symbol": "Fr",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 82498.0,
                "intensity": 0.000691286
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 83230.0,
                "intensity": 0.290785
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 86106.0,
                "intensity": 0.479874,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 96810.0,
                "intensity": 0.0579133
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 97474.0,
                "intensity": 0.110604
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 98001.0,
                "intensity": 0.0036684
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 100157.0,
                "intensity": 0.0551855
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 100534.0,
                "intensity": 0.00127849
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 14312.0,
                "intensity": 0.354736
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 14976.0,
                "intensity": 0.369144
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 17659.0,
                "intensity": 0.13135
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 17829.0,
                "intensity": 0.14477
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 13255.0,
                "intensity": 0.0188698
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 14771.0,
                "intensity": 0.772012,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 17304.0,
                "intensity": 0.172959
            },
            {
                "IUPAC": "L2-O4",
                "Siegbahn": "Lg6",
                "energy": 17849.0,
                "intensity": 0.0361586
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 10379.0,
                "intensity": 0.041075
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 11895.0,
                "intensity": 0.0749509
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 12031.0,
                "intensity": 0.670688
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 13878.0,
                "intensity": 0.0115301
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 14428.0,
                "intensity": 0.171832
            },
            {
                "IUPAC": "L3-O4,5",
                "Siegbahn": "Lb5",
                "energy": 14973.0,
                "intensity": 0.0299236
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 3086.0,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 2156.0,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 2868.0,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 2732.0,
                "intensity": 1.0
            }
        ]
    },
    "88": {
        "name": "Radium",
        "atomic_mass": 226.025,
        "number": 88,
        "symbol": "Ra",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 84685.0,
                "intensity": 0.000750037
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 85438.0,
                "intensity": 0.291243
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 88478.0,
                "intensity": 0.478454,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 99432.0,
                "intensity": 0.0579387
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 100130.0,
                "intensity": 0.110536
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 100674.0,
                "intensity": 0.00375355
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 102864.0,
                "intensity": 0.0559791
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 103286.0,
                "intensity": 0.00134552
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 14747.0,
                "intensity": 0.357854
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 15445.0,
                "intensity": 0.362506
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 18179.0,
                "intensity": 0.135187
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 18358.0,
                "intensity": 0.144453
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 13662.0,
                "intensity": 0.0190621
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 15236.0,
                "intensity": 0.769212,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 17848.0,
                "intensity": 0.174671
            },
            {
                "IUPAC": "L2-O4",
                "Siegbahn": "Lg6",
                "energy": 18416.0,
                "intensity": 0.0370552
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 10622.0,
                "intensity": 0.0417481
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 12196.0,
                "intensity": 0.0746805
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 12339.0,
                "intensity": 0.668184
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 14236.0,
                "intensity": 0.0117013
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 14808.0,
                "intensity": 0.172308
            },
            {
                "IUPAC": "L3-O4,5",
                "Siegbahn": "Lb5",
                "energy": 15376.0,
                "intensity": 0.0313775
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 3189.0,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 2190.0,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 2949.0,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 2806.0,
                "intensity": 1.0
            }
        ]
    },
    "89": {
        "name": "Actinium",
        "atomic_mass": 227.028,
        "number": 89,
        "symbol": "Ac",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 86915.0,
                "intensity": 0.000812774
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 87672.0,
                "intensity": 0.291787
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 90884.0,
                "intensity": 0.477143,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 102099.0,
                "intensity": 0.0579754
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 102846.0,
                "intensity": 0.110486
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 103385.0,
                "intensity": 0.00383902
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 105675.0,
                "intensity": 0.0565415
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 106080.0,
                "intensity": 0.00141544
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 15184.0,
                "intensity": 0.360914
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 15931.0,
                "intensity": 0.355834
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 18760.0,
                "intensity": 0.139184
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 18950.0,
                "intensity": 0.144068
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 14081.0,
                "intensity": 0.0192658
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 15713.0,
                "intensity": 0.766527,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 18408.0,
                "intensity": 0.176421
            },
            {
                "IUPAC": "L2-O4",
                "Siegbahn": "Lg6",
                "energy": 19003.0,
                "intensity": 0.0377857
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 10869.0,
                "intensity": 0.0424369
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 12501.0,
                "intensity": 0.0744128
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 12652.0,
                "intensity": 0.665705
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 14602.0,
                "intensity": 0.0118713
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 15196.0,
                "intensity": 0.172802
            },
            {
                "IUPAC": "L3-O4,5",
                "Siegbahn": "Lb5",
                "energy": 15791.0,
                "intensity": 0.0327714
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 3270.0,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 2290.0,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 3051.0,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 2900.0,
                "intensity": 1.0
            }
        ]
    },
    "90": {
        "name": "Thorium",
        "atomic_mass": 232.038,
        "number": 90,
        "symbol": "Th",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 89179.0,
                "intensity": 0.000879446
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 89958.0,
                "intensity": 0.292344
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 93351.0,
                "intensity": 0.475825,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 104821.0,
                "intensity": 0.0580115
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 105605.0,
                "intensity": 0.110429
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 106160.0,
                "intensity": 0.00392389
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 108483.0,
                "intensity": 0.057099
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 108939.0,
                "intensity": 0.00148793
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 15642.0,
                "intensity": 0.363908
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 16426.0,
                "intensity": 0.34914
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 19304.0,
                "intensity": 0.143332
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 19505.6,
                "intensity": 0.143619
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 14511.0,
                "intensity": 0.01948
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 16202.0,
                "intensity": 0.76396,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 18980.9,
                "intensity": 0.178203
            },
            {
                "IUPAC": "L2-O4",
                "Siegbahn": "Lg6",
                "energy": 19600.5,
                "intensity": 0.0383568
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 11118.0,
                "intensity": 0.043142
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 12809.0,
                "intensity": 0.0741493
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 12968.0,
                "intensity": 0.663263
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 14970.0,
                "intensity": 0.0120405
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 15587.9,
                "intensity": 0.173298
            },
            {
                "IUPAC": "L3-O4,5",
                "Siegbahn": "Lb5",
                "energy": 16207.5,
                "intensity": 0.0341068
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 3370.8,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 2323.0,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 3148.6,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 2989.6,
                "intensity": 1.0
            }
        ]
    },
    "91": {
        "name": "Protactinium",
        "atomic_mass": 231.036,
        "number": 91,
        "symbol": "Pa",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 91496.0,
                "intensity": 0.000950156
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 92287.0,
                "intensity": 0.292914
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 95868.0,
                "intensity": 0.474494,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 107600.0,
                "intensity": 0.0580492
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 108427.0,
                "intensity": 0.110371
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 108990.0,
                "intensity": 0.00400813
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 111377.0,
                "intensity": 0.057651
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 111858.0,
                "intensity": 0.00156298
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 16104.0,
                "intensity": 0.36683
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 16931.0,
                "intensity": 0.342435
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 19881.0,
                "intensity": 0.147626
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 20098.0,
                "intensity": 0.143108
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 14947.0,
                "intensity": 0.0197038
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 16703.0,
                "intensity": 0.761511,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 19571.0,
                "intensity": 0.18001
            },
            {
                "IUPAC": "L2-O4",
                "Siegbahn": "Lg6",
                "energy": 20220.0,
                "intensity": 0.038775
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 11366.0,
                "intensity": 0.0438642
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 13122.0,
                "intensity": 0.0738917
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 13291.0,
                "intensity": 0.660875
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 15346.0,
                "intensity": 0.012209
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 15990.0,
                "intensity": 0.173775
            },
            {
                "IUPAC": "L3-O4,5",
                "Siegbahn": "Lb5",
                "energy": 16639.0,
                "intensity": 0.0353852
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 3466.0,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 2387.0,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 3240.0,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 3071.0,
                "intensity": 1.0
            }
        ]
    },
    "92": {
        "name": "Uranium",
        "atomic_mass": 238.051,
        "number": 92,
        "symbol": "U",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 93849.0,
                "intensity": 0.00102501
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 94658.0,
                "intensity": 0.293492
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 98440.0,
                "intensity": 0.473147,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 110424.0,
                "intensity": 0.0580906
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 111303.0,
                "intensity": 0.110315
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 111878.0,
                "intensity": 0.00409169
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 114335.0,
                "intensity": 0.0581971
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 114828.0,
                "intensity": 0.00164057
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 16575.0,
                "intensity": 0.369674
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 17454.0,
                "intensity": 0.335732
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 20486.0,
                "intensity": 0.152055
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 20714.0,
                "intensity": 0.142538
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 15400.0,
                "intensity": 0.0199364
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 17220.0,
                "intensity": 0.759182,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 20169.7,
                "intensity": 0.181835
            },
            {
                "IUPAC": "L2-O4",
                "Siegbahn": "Lg6",
                "energy": 20845.2,
                "intensity": 0.039047
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 11618.0,
                "intensity": 0.0446055
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 13438.0,
                "intensity": 0.073643
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 13614.0,
                "intensity": 0.658568
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 15727.0,
                "intensity": 0.0123776
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 16387.7,
                "intensity": 0.174197
            },
            {
                "IUPAC": "L3-O4,5",
                "Siegbahn": "Lb5",
                "energy": 17063.2,
                "intensity": 0.036609
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 3566.8,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 2457.0,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 3339.8,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 3163.8,
                "intensity": 1.0
            }
        ]
    },
    "93": {
        "name": "Neptunium",
        "atomic_mass": 237.048,
        "number": 93,
        "symbol": "Np",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 96242.0,
                "intensity": 0.00110438
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 97069.0,
                "intensity": 0.294148
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 101059.0,
                "intensity": 0.471893,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 113303.0,
                "intensity": 0.0581515
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 114234.0,
                "intensity": 0.110292
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 114820.0,
                "intensity": 0.00417554
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 117341.0,
                "intensity": 0.0585147
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 117853.0,
                "intensity": 0.00172108
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 17061.0,
                "intensity": 0.372433
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 17992.0,
                "intensity": 0.329041
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 21099.0,
                "intensity": 0.156614
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 21342.0,
                "intensity": 0.141912
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 15861.0,
                "intensity": 0.0201769
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 17751.0,
                "intensity": 0.756974,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 20784.0,
                "intensity": 0.18367
            },
            {
                "IUPAC": "L2-O4",
                "Siegbahn": "Lg6",
                "energy": 21491.0,
                "intensity": 0.0391786
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 11871.0,
                "intensity": 0.0453679
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 13761.0,
                "intensity": 0.0734063
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 13946.0,
                "intensity": 0.656368
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 16109.0,
                "intensity": 0.0125467
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 16794.0,
                "intensity": 0.174531
            },
            {
                "IUPAC": "L3-O4,5",
                "Siegbahn": "Lb5",
                "energy": 17501.0,
                "intensity": 0.0377807
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 3664.0,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 2521.0,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 3435.0,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 3250.0,
                "intensity": 1.0
            }
        ]
    },
    "94": {
        "name": "Plutonium",
        "atomic_mass": 239.052,
        "number": 94,
        "symbol": "Pu",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 98687.0,
                "intensity": 0.00118811
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 99525.0,
                "intensity": 0.294809
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 103734.0,
                "intensity": 0.470615,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 116244.0,
                "intensity": 0.05822
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 117228.0,
                "intensity": 0.110278
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 117821.0,
                "intensity": 0.00425866
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 120411.0,
                "intensity": 0.0588268
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 120945.0,
                "intensity": 0.00180413
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 17557.0,
                "intensity": 0.375103
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 18541.0,
                "intensity": 0.322372
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 21724.0,
                "intensity": 0.161292
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 21981.0,
                "intensity": 0.141233
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 16333.0,
                "intensity": 0.0204246
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 18296.0,
                "intensity": 0.754892,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 21420.0,
                "intensity": 0.185507
            },
            {
                "IUPAC": "L2-O4",
                "Siegbahn": "Lg6",
                "energy": 22153.0,
                "intensity": 0.0391762
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 12124.0,
                "intensity": 0.0461542
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 14087.0,
                "intensity": 0.0731858
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 14282.0,
                "intensity": 0.654313
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 16498.0,
                "intensity": 0.0127173
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 17211.0,
                "intensity": 0.174726
            },
            {
                "IUPAC": "L3-O4,5",
                "Siegbahn": "Lb5",
                "energy": 17944.0,
                "intensity": 0.0389039
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 3765.0,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 2590.0,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 3534.0,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 3339.0,
                "intensity": 1.0
            }
        ]
    },
    "95": {
        "name": "Americium",
        "atomic_mass": 243.061,
        "number": 95,
        "symbol": "Am",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 101174.0,
                "intensity": 0.00127602
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 102030.0,
                "intensity": 0.295404
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 106472.0,
                "intensity": 0.469199,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 119243.0,
                "intensity": 0.0582848
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 120284.0,
                "intensity": 0.110253
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 120886.0,
                "intensity": 0.00434
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 123544.0,
                "intensity": 0.0593537
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 124102.0,
                "intensity": 0.00188924
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 18069.0,
                "intensity": 0.377679
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 19110.0,
                "intensity": 0.315735
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 22370.0,
                "intensity": 0.166083
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 22643.0,
                "intensity": 0.140504
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 16819.0,
                "intensity": 0.0206788
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 18856.0,
                "intensity": 0.75294,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 22072.0,
                "intensity": 0.187336
            },
            {
                "IUPAC": "L2-O4",
                "Siegbahn": "Lg6",
                "energy": 22836.0,
                "intensity": 0.0390457
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 12377.0,
                "intensity": 0.0469678
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 14414.0,
                "intensity": 0.0729859
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 14620.0,
                "intensity": 0.652443
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 16890.0,
                "intensity": 0.0128901
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 17630.0,
                "intensity": 0.174731
            },
            {
                "IUPAC": "L3-O4,5",
                "Siegbahn": "Lb5",
                "energy": 18394.0,
                "intensity": 0.039982
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 3869.0,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 2658.0,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 3635.0,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 3429.0,
                "intensity": 1.0
            }
        ]
    },
    "96": {
        "name": "Curium",
        "atomic_mass": 247.07,
        "number": 96,
        "symbol": "Cm",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 103715.0,
                "intensity": 0.00136843
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 104590.0,
                "intensity": 0.296
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 109271.0,
                "intensity": 0.467755,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 122304.0,
                "intensity": 0.0583615
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 123403.0,
                "intensity": 0.110245
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 124017.0,
                "intensity": 0.0044205
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 126743.0,
                "intensity": 0.0598726
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 127325.0,
                "intensity": 0.00197679
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 18589.0,
                "intensity": 0.380157
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 19688.0,
                "intensity": 0.309138
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 23028.0,
                "intensity": 0.170977
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 23319.0,
                "intensity": 0.139728
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 17314.0,
                "intensity": 0.0209387
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 19427.0,
                "intensity": 0.751121,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 22735.0,
                "intensity": 0.189147
            },
            {
                "IUPAC": "L2-O4",
                "Siegbahn": "Lg6",
                "energy": 23527.0,
                "intensity": 0.0387929
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 12633.0,
                "intensity": 0.047812
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 14746.0,
                "intensity": 0.0728108
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 14961.0,
                "intensity": 0.650795
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 17286.0,
                "intensity": 0.0130663
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 18054.0,
                "intensity": 0.174497
            },
            {
                "IUPAC": "L3-O4,5",
                "Siegbahn": "Lb5",
                "energy": 18846.0,
                "intensity": 0.041019
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 3976.0,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 2726.0,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 3740.0,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 3525.0,
                "intensity": 1.0
            }
        ]
    },
    "97": {
        "name": "Berkelium",
        "atomic_mass": 247.07,
        "number": 97,
        "symbol": "Bk",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 106300.0,
                "intensity": 0.0014651
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 107185.0,
                "intensity": 0.296526
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 112121.0,
                "intensity": 0.46617,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 125418.0,
                "intensity": 0.0584383
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 126580.0,
                "intensity": 0.110234
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 127203.0,
                "intensity": 0.00449906
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 129998.0,
                "intensity": 0.0606021
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 130601.0,
                "intensity": 0.00206626
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 19118.0,
                "intensity": 0.382535
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 20280.0,
                "intensity": 0.302591
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 23698.0,
                "intensity": 0.175967
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 24007.0,
                "intensity": 0.138908
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 17826.0,
                "intensity": 0.0212038
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 20018.0,
                "intensity": 0.749441,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 23416.0,
                "intensity": 0.190932
            },
            {
                "IUPAC": "L2-O4",
                "Siegbahn": "Lg6",
                "energy": 24241.0,
                "intensity": 0.0384233
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 12890.0,
                "intensity": 0.0486921
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 15082.0,
                "intensity": 0.0726668
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 15308.0,
                "intensity": 0.649426
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 17687.0,
                "intensity": 0.013247
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 18480.0,
                "intensity": 0.173948
            },
            {
                "IUPAC": "L3-O4,5",
                "Siegbahn": "Lb5",
                "energy": 19305.0,
                "intensity": 0.04202
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 4078.0,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 2795.0,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 3842.0,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 3616.0,
                "intensity": 1.0
            }
        ]
    },
    "98": {
        "name": "Californium",
        "atomic_mass": 251.08,
        "number": 98,
        "symbol": "Cf",
        "lines": [
            {
                "IUPAC": "K-L1",
                "Siegbahn": "Ka3",
                "energy": 108929.0,
                "intensity": 0.00156637
            },
            {
                "IUPAC": "K-L2",
                "Siegbahn": "Ka2",
                "energy": 109831.0,
                "intensity": 0.297049
            },
            {
                "IUPAC": "K-L3",
                "Siegbahn": "Ka1",
                "energy": 115032.0,
                "intensity": 0.464551,
                "tags": [
                    "maxK"
                ]
            },
            {
                "IUPAC": "K-M2",
                "Siegbahn": "Kb3",
                "energy": 128594.0,
                "intensity": 0.0585313
            },
            {
                "IUPAC": "K-M3",
                "Siegbahn": "Kb1",
                "energy": 129823.0,
                "intensity": 0.110247
            },
            {
                "IUPAC": "K-M4,5",
                "Siegbahn": "Kb5",
                "energy": 130455.0,
                "intensity": 0.00457665
            },
            {
                "IUPAC": "K-N2,3",
                "Siegbahn": "Kb2",
                "energy": 133319.0,
                "intensity": 0.0613207
            },
            {
                "IUPAC": "K-N4,5",
                "Siegbahn": "Kb4",
                "energy": 133948.0,
                "intensity": 0.00215806
            },
            {
                "IUPAC": "L1-M2",
                "Siegbahn": "Lb4",
                "energy": 19665.0,
                "intensity": 0.38481
            },
            {
                "IUPAC": "L1-M3",
                "Siegbahn": "Lb3",
                "energy": 20894.0,
                "intensity": 0.2961
            },
            {
                "IUPAC": "L1-N2",
                "Siegbahn": "Lg2",
                "energy": 24390.0,
                "intensity": 0.181043
            },
            {
                "IUPAC": "L1-N3",
                "Siegbahn": "Lg3",
                "energy": 24718.0,
                "intensity": 0.138047
            },
            {
                "IUPAC": "L2-M1",
                "Siegbahn": "Ln",
                "energy": 18347.0,
                "intensity": 0.0214733
            },
            {
                "IUPAC": "L2-M4",
                "Siegbahn": "Lb1",
                "energy": 20624.0,
                "intensity": 0.747906,
                "tags": [
                    "maxL"
                ]
            },
            {
                "IUPAC": "L2-N4",
                "Siegbahn": "Lg1",
                "energy": 24117.0,
                "intensity": 0.192678
            },
            {
                "IUPAC": "L2-O4",
                "Siegbahn": "Lg6",
                "energy": 24971.0,
                "intensity": 0.0379425
            },
            {
                "IUPAC": "L3-M1",
                "Siegbahn": "Ll",
                "energy": 13146.0,
                "intensity": 0.049613
            },
            {
                "IUPAC": "L3-M4",
                "Siegbahn": "La2",
                "energy": 15423.0,
                "intensity": 0.0725594
            },
            {
                "IUPAC": "L3-M5",
                "Siegbahn": "La1",
                "energy": 15660.0,
                "intensity": 0.648384
            },
            {
                "IUPAC": "L3-N1",
                "Siegbahn": "Lb6",
                "energy": 18094.0,
                "intensity": 0.0134337
            },
            {
                "IUPAC": "L3-N4,5",
                "Siegbahn": "Lb2,15",
                "energy": 18916.0,
                "intensity": 0.17302
            },
            {
                "IUPAC": "L3-O4,5",
                "Siegbahn": "Lb5",
                "energy": 19770.0,
                "intensity": 0.0429899
            },
            {
                "IUPAC": "M3-N5",
                "Siegbahn": "Mg",
                "energy": 4186.0,
                "intensity": 1.0,
                "tags": [
                    "maxM"
                ]
            },
            {
                "IUPAC": "M4,5-N6,7",
                "Siegbahn": "Mz",
                "energy": 2864.0,
                "intensity": 0.00293255
            },
            {
                "IUPAC": "M4-N6",
                "Siegbahn": "Mb",
                "energy": 3946.0,
                "intensity": 0.997068
            },
            {
                "IUPAC": "M5-N6,7",
                "Siegbahn": "Ma",
                "energy": 3709.0,
                "intensity": 1.0
            }
        ]
    },
    "99": {
        "name": "Einsteinium",
        "atomic_mass": 252,
        "number": 99,
        "symbol": "Es",
        "lines": []
    },
    "100": {
        "name": "Fermium",
        "atomic_mass": 257,
        "number": 100,
        "symbol": "Fm",
        "lines": []
    },
    "101": {
        "name": "Mendelevium",
        "atomic_mass": 258,
        "number": 101,
        "symbol": "Md",
        "lines": []
    },
    "102": {
        "name": "Nobelium",
        "atomic_mass": 259,
        "number": 102,
        "symbol": "No",
        "lines": []
    },
    "103": {
        "name": "Lawrencium",
        "atomic_mass": 266,
        "number": 103,
        "symbol": "Lr",
        "lines": []
    },
    "104": {
        "name": "Rutherfordium",
        "atomic_mass": 267,
        "number": 104,
        "symbol": "Rf",
        "lines": []
    },
    "105": {
        "name": "Dubnium",
        "atomic_mass": 268,
        "number": 105,
        "symbol": "Db",
        "lines": []
    },
    "106": {
        "name": "Seaborgium",
        "atomic_mass": 269,
        "number": 106,
        "symbol": "Sg",
        "lines": []
    },
    "107": {
        "name": "Bohrium",
        "atomic_mass": 270,
        "number": 107,
        "symbol": "Bh",
        "lines": []
    },
    "108": {
        "name": "Hassium",
        "atomic_mass": 269,
        "number": 108,
        "symbol": "Hs",
        "lines": []
    },
    "109": {
        "name": "Meitnerium",
        "atomic_mass": 278,
        "number": 109,
        "symbol": "Mt",
        "lines": []
    },
    "110": {
        "name": "Darmstadtium",
        "atomic_mass": 281,
        "number": 110,
        "symbol": "Ds",
        "lines": []
    },
    "111": {
        "name": "Roentgenium",
        "atomic_mass": 282,
        "number": 111,
        "symbol": "Rg",
        "lines": []
    },
    "112": {
        "name": "Copernicium",
        "atomic_mass": 285,
        "number": 112,
        "symbol": "Cn",
        "lines": []
    },
    "113": {
        "name": "Nihonium",
        "atomic_mass": 286,
        "number": 113,
        "symbol": "Nh",
        "lines": []
    },
    "114": {
        "name": "Flerovium",
        "atomic_mass": 289,
        "number": 114,
        "symbol": "Fl",
        "lines": []
    },
    "115": {
        "name": "Moscovium",
        "atomic_mass": 289,
        "number": 115,
        "symbol": "Mc",
        "lines": []
    },
    "116": {
        "name": "Livermorium",
        "atomic_mass": 293,
        "number": 116,
        "symbol": "Lv",
        "lines": []
    },
    "117": {
        "name": "Tennessine",
        "atomic_mass": 294,
        "number": 117,
        "symbol": "Ts",
        "lines": []
    },
    "118": {
        "name": "Oganesson",
        "atomic_mass": 294,
        "number": 118,
        "symbol": "Og",
        "lines": []
    },
    "119": {
        "name": "Ununennium",
        "atomic_mass": 315,
        "number": 119,
        "symbol": "Uue",
        "lines": []
    }
};
