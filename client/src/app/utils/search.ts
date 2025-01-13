import { scanInstrumentToJSON, ScanItem } from "../generated-protos/scan";

/**
 * Calculate the number of operations required to transform string a into string b
 * using the Levenshtein distance algorithm.
 *
 * Both strings are converted to lowercase before the calculation.
 *
 * @param {string} a - The first input string
 * @param {string} b - The second input string
 * @returns {number} The number of operations required to transform string a into string b
 */
export const levenshteinDistance = (a: string, b: string): number => {
  if (a.length === 0) {
    return b.length;
  } else if (b.length === 0) {
    return a.length;
  } else if (a === b) {
    return 0;
  }

  a = a.toLowerCase();
  b = b.toLowerCase();

  const matrix = [];

  // Initialize the 2D matrix
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  // Populate the matrix
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // Deletion
        matrix[i][j - 1] + 1, // Insertion
        matrix[i - 1][j - 1] + cost // Substitution
      );
    }
  }

  return matrix[a.length][b.length];
};

function getDatasetSearchFields(scan: ScanItem): string[] {
  return [
    scan?.title || "",
    scan?.description || "",
    scan?.instrumentConfig || "",
    scan?.meta?.["Sol"] ?? "",
    scan?.meta?.["Target"] ?? "",
    scan?.meta?.["Site"] ?? "",
    scan?.meta?.["DriveId"] ?? "",
    scan?.meta?.["RTT"] ?? "",
    scan?.meta?.["SCLK"] ?? "",
  ];
}

export function filterScans(searchString: string, instruments: string[], filterTags: string[], scans: ScanItem[]): ScanItem[] {
  let filtered: ScanItem[] = [];

  const searchStringLower = searchString.toLowerCase();
  if (searchString.length === 0 && filterTags.length === 0 && instruments.length === 0) {
    filtered = Array.from(scans);
  } else {
    filtered = scans.filter(scan => {
      if (filterTags.length > 0 && !filterTags.some(tag => scan.tags?.includes(tag))) {
        return false;
      }

      if (instruments.length > 0 && instruments.indexOf(scanInstrumentToJSON(scan.instrument)) < 0) {
        return false;
      }

      const searchFields = getDatasetSearchFields(scan);
      return searchFields.some(field => field.toLowerCase().includes(searchStringLower));
    });
  }

  return filtered;
}

export function readSol(sol: string): number {
  // If it starts with a letter, read as test sol
  if (sol[0] >= 'A' && sol[0] <= 'Z') {
    const yearOffset = (-30 + (sol.charCodeAt(0) - "A".charCodeAt(0))) * 1000;
    const dayOfYear = Number.parseInt(sol.substring(1)); // Go implementation has first day of year being 001 so match that 001=Jan 1 NOTE: JS treats that as Dec31 though

    return yearOffset + dayOfYear;
  }
  // It's just a number
  const iSol = Number.parseInt(sol);
  return iSol || 0;
}

export function sortScans(scans: ScanItem[]): ScanItem[] {
  // Sort by Sol then by time stamps
  return scans.sort((scanA, scanB) => {
    const scanASol = readSol(scanA.meta["Sol"]);
    const scanBSol = readSol(scanB.meta["Sol"]);

    if (scanASol == 0 && scanBSol != 0) {
      // The one with 0 goes later
      return 1;
    } else if (scanASol != 0 && scanBSol == 0) {
      return -1;
    } else if (scanASol != 0 && scanBSol != 0) {
      // Compare the sols
      const result = scanBSol - scanASol;
      if (result != 0) {
        return result;
      }
      // Otherwise Sols are equal so wefall through and rely on titles
    }

    return scanA.title.localeCompare(scanB.title);
  });
}
