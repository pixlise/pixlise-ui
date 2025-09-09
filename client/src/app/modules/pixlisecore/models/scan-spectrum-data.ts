import { Spectrum } from "src/app/generated-protos/spectrum";

export class ScanSpectrumData {
  constructor(
    public scanTimeStampUnixSec: number,
    public bulkSum: Spectrum[],
    public maxValue: Spectrum[],
    public pmcSpectra: Spectrum[][],
    public channelCount: number,
    public normalSpectraForScan: number,
    public dwellSpectraForScan: number,
    public liveTimeMetaIndex: number,
    public loadedAllPMCs: boolean,
    public loadedBulkSum: boolean, // Flag needed because dataset may not have any bulk spectra, but we've requested it already
    public loadedMaxValue: boolean // Flag needed because dataset may not have any bulk spectra, but we've requested it already
  ) {}
}