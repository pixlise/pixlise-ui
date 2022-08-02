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

import { Point } from "src/app/models/Geometry";
import { DataSet, DataSetLocation, HullPoint, PointCluster } from "./DataSet";



describe("PMC cluster finder", () =>
{
    it("should work", () => 
    {
        let locs = [
        // Housekeeping
            new DataSetLocation(null, 0, 100, false, false, false, []),
            // Housekeeping with beam
            new DataSetLocation(new Point(30, 30), 1, 101, false, false, false, []),
            new DataSetLocation(new Point(31, 30), 2, 102, false, false, false, []),

            // First scan points
            new DataSetLocation(new Point(5, 10), 3, 103, true, false, false, []),
            new DataSetLocation(new Point(4.1, 11), 4, 104, true, false, false, []),

            // Housekeeping point (no spectrum)
            new DataSetLocation(new Point(3, 12), 5, 105, false, false, false, []),

            // Another spectrum
            new DataSetLocation(new Point(4.6, 11.6), 6, 106, true, false, false, []),

            // Large move to another area
            new DataSetLocation(new Point(60, 12), 7, 107, true, false, false, []),
            new DataSetLocation(new Point(61, 12.5), 8, 108, true, false, false, []),
            new DataSetLocation(new Point(62, 12), 9, 109, true, false, false, []),

            // Another area
            new DataSetLocation(new Point(15, 7), 10, 110, true, false, false, []),
            new DataSetLocation(new Point(16.4, 7), 11, 111, true, false, false, []),
            // Housekeeping
            new DataSetLocation(new Point(18.1, 7.1), 12, 112, false, false, false, []),

            // Finish area
            new DataSetLocation(new Point(18.2, 7.4), 13, 113, true, false, false, []),

            // Housekeeping without location
            new DataSetLocation(null, 14, 114, false, false, false, []),

            // Back near start
            new DataSetLocation(new Point(31.4, 30.2), 15, 115, false, false, false, []),

            // More housekeeping without location
            new DataSetLocation(null, 16, 116, false, false, false, []),
        ];

        let result = DataSet["makePointClusters"](locs);
        expect(result).toEqual([
            new PointCluster([3,4,6], 1.063193686149018, [
                new HullPoint(3.4553441369879123, 11.386793517807252, 4, new Point(-0.9748209159544584, 0.2229891966390097)),
                new HullPoint(3.713206482192747, 10.355344136987913, 4, new Point(-0.8828514773370156, -0.4696522851683457)),
                new HullPoint(4.613206482192748, 9.355344136987913, 3, new Point(-0.29217595076326996, -0.9563645820478608)),
                new HullPoint(5.644655863012087, 9.613206482192748, 3, new Point(0.8574929257125441, -0.5144957554275265)),
                new HullPoint(5.386793517807252, 10.644655863012087, 3, new Point(0.9701425001453319, 0.24253562503633308)),
                new HullPoint(4.986793517807252, 12.244655863012087, 6, new Point(0.5144957554275265, 0.8574929257125442)),
                new HullPoint(3.9553441369879128, 11.986793517807252, 6, new Point(-0.5316253070390947, 0.8469796531886632)),
            ], 0.24497866312686423),
            new PointCluster([7,8,9], 1.118033988749895, [
                new HullPoint(59.44098300562505, 12.559016994374947, 7, new Point(-0.8506508083520399, 0.5257311121191336)),
                new HullPoint(59.44098300562505, 11.440983005625053, 7, new Point(-0.7071067811865475, -0.7071067811865475)),
                new HullPoint(62.55901699437495, 11.440983005625053, 9, new Point(0.7071067811865475, -0.7071067811865475)),
                new HullPoint(62.55901699437495, 12.559016994374947, 9, new Point(0.8506508083520399, 0.5257311121191336)),
                new HullPoint(61.55901699437495, 13.059016994374947, 8, new Point(0.22975292054736118, 0.9732489894677302)),
                new HullPoint(60.44098300562505, 13.059016994374947, 8, new Point(-0.22975292054736118, 0.9732489894677302)),
            ], 0),
            new PointCluster([10,11,13], 1.6219544457292883, [
                new HullPoint(14.094695898636814, 7.704125412171367, 10, new Point(-0.7893522173763265, 0.61394061351492)),
                new HullPoint(14.295874587828635, 6.0946958986368145, 10, new Point(-0.6618025632357398, -0.7496781758158662)),
                new HullPoint(15.695874587828634, 6.0946958986368145, 11, new Point(0.06213744155632878, -0.9980676020975903)),

                new HullPoint(17.305304101363184, 6.295874587828633, 11, new Point(0.17067232992662076, -0.9853278417853718)),
                new HullPoint(19.105304101363185, 6.695874587828634, 13, new Point(0.8174155604703636, -0.5760484367663202)),
                new HullPoint(18.904125412171364, 8.305304101363186, 13, new Point(0.6139406135149201, 0.7893522173763265)),
                new HullPoint(17.294695898636814, 8.104125412171367, 13, new Point(-0.12403473458920852, 0.9922778767136676)),
            ], 0.12435499454676147),
        ]);
    });
});
