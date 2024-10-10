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
