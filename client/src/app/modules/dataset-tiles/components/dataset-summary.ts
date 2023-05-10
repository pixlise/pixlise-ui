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

export class DataSetSummary
{
    constructor(
        public dataset_id: string,
        public bulk_spectra: number,
        public context_image: string,
        public context_images: number,
        public tiff_context_images: number = 0,
        public data_file_size: number,
        public detector_config: string,
        public dwell_spectra: number,
        public location_count: number,
        public max_spectra: number,
        public normal_spectra: number,
        public pseudo_intensities: number,
        public target_id: string,
        public dataset_link: string,
        public context_image_link: string,
        public drive_id: number,
        public site_id: number,
        public sol: string,
        public rtt: number,
        public sclk: number,
        public target: string,
        public site: string,
        public title: string,
        public create_unixtime_sec: number,
    )
    {
    }

    public static listMissingData(summary: DataSetSummary): string[]
    {
        return DataSetSummary.listMissingDataForSummaryStats(
            summary.detector_config,
            summary.sol,
            summary.bulk_spectra,
            summary.max_spectra,
            summary.normal_spectra,
            summary.pseudo_intensities
        );
    }

    public static listMissingDataForSummaryStats(detectorConfig: string, sol: string, bulkSpectra: number, maxSpectra: number, normalSpectra: number, pseudoIntensities: number): string[]
    {
        // We don't show this for test datasets
        if(detectorConfig != "PIXL")
        {
            return [];
        }

        // SOL13 dataset is a hand-made hack out, so exclude it
        if(parseInt(sol, 10) <= 13)
        {
            return [];
        }

        // If it's likely a "disco" dataset, don't complain
        if(
            bulkSpectra == 0 &&
            maxSpectra == 0 &&
            pseudoIntensities == 0 &&
            normalSpectra == 0
        )
        {
            return [];
        }

        // If missing bulk/max...
        let result: string[] = [];
        if(bulkSpectra < 2)
        {
            result.push("bulk spectra");
        }
        if(maxSpectra < 2)
        {
            result.push("max spectra");
        }
        if(pseudoIntensities <= 0)
        {
            result.push("pseudo-intensities");
        }
        if(pseudoIntensities > 0 && normalSpectra != pseudoIntensities*2)
        {
            result.push("normal spectra");
        }
        return result;
    }
}
