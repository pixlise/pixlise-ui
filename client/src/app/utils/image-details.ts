import { ScanImage, scanImagePurposeToJSON, scanImageSourceToJSON } from "../generated-protos/image";
import { getMB, SDSFields } from "./utils";

export function makeImageTooltip(forImage: ScanImage): string {
  // Put together some stuff already
  let result = `Name: ${forImage.name}\n`;
  result += `Path: ${forImage.path}\n`;
  result += `Origin Scan: ${forImage.originScanId}\n`;
  if (forImage.originImageURL) {
    result += `Origin URL: ${forImage.originImageURL}\n`;
  }
  result += `Associated Scans: ${forImage.associatedScanIds.join(",")}\n`;
  result += `Resolution: ${forImage.width} x ${forImage.height}\n`;
  result += `File Size: ${getMB(forImage.fileSize)}\n`;

  let lbl = scanImagePurposeToJSON(forImage.purpose);
  // Snip off the stuff at the start
  if (lbl.startsWith("SIP_")) {
    lbl = lbl.substring(4);
  }
  result += `Image Purpose: ${lbl}\n`;

  lbl = scanImageSourceToJSON(forImage.source);
  // Snip off the stuff at the start
  if (lbl.startsWith("SI_")) {
    lbl = lbl.substring(3);
  }
  result += `Image Source: ${lbl}`;

  const fields = SDSFields.makeFromFileName(forImage.name);
  if (!fields) {
    return result; //'Cannot decode file name';
  }

  result += `\n\nSOL=${fields.SOL}\n`;
  if (fields.PMC >= 0) {
    result += `PMC=${fields.PMC}\n`;
  }

  result += `SCLK=${fields.SCLK}\n`;
  result += `Site=${fields.siteID}\n`;
  result += `Drive=${fields.driveID}\n`;
  result += `RTT=${fields.RTT}\n`;
  result += `Instrument=${fields.instrumentLong}\n`;
  result += `Version=${fields.version}\n\n`;
  result += `ProdType=${fields.prodType}\n`;
  result += `Producer=${fields.producerLong}\n`;
  result += `Colour Filter=${fields.colourFilterLong}\n`;
  if (fields.PMC < 0) {
    result += `CamSpecific=${fields.camSpecific}\n`;
  }

  if (fields.special != "_") {
    result += `Special=${fields.special}\n`;
  }

  result += `Venue=${fields.venueLong}\n`;

  if (fields.ternaryTimestamp && fields.ternaryTimestamp != "000") {
    result += `TernaryTimestamp=${fields.ternaryTimestamp}\n`;
  }

  if (fields.geometry != "_") {
    result += `Geometry=${fields.geometry}\n`;
  }

  if (fields.thumbnail != "_") {
    result += `Thumbnail=${fields.thumbnailLong}\n`;
  }

  if (fields.downsample != "_") {
    result += `Downsample=${fields.downsample}\n`;
  }

  result += `Compression=${fields.compressionLong}\n`;

  return result;
}
