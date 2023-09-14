export type ExpressionValue = {
  name: string;
  weightPercentage: number;
  error: number;
};

export type ExpressionReference = {
  name: string;
  expressionValues: ExpressionValue[];
};

// Berger et al., 2016, https://doi.org/10.1002/2015GL066675
const MARS_REFERENCES: ExpressionReference[] = [
  {
    name: "MSL Gale Crater O-Tray Dust Sol 571",
    expressionValues: [
      { name: "Na2O", weightPercentage: 2.75, error: 0.22 },
      { name: "MgO", weightPercentage: 8.31, error: 0.38 },
      { name: "Al2O3", weightPercentage: 8.91, error: 0.39 },
      { name: "SiO2", weightPercentage: 39.3, error: 1.7 },
      { name: "SO3", weightPercentage: 8.01, error: 0.94 },
      { name: "Cl", weightPercentage: 1.06, error: 0.27 },
      { name: "K2O", weightPercentage: 0.47, error: 0.09 },
      { name: "CaO", weightPercentage: 7.04, error: 0.6 },
      { name: "TiO2", weightPercentage: 1.06, error: 0.09 },
      { name: "MnO", weightPercentage: 0.42, error: 0.1 },
      { name: "FeOT", weightPercentage: 21, error: 2.2 },
    ],
  },
  {
    name: "MER Gusev Crater Dust",
    expressionValues: [
      { name: "Na2O", weightPercentage: 2.9, error: 0.3 },
      { name: "MgO", weightPercentage: 8.25, error: 0.15 },
      { name: "Al2O3", weightPercentage: 9.56, error: 0.16 },
      { name: "SiO2", weightPercentage: 45, error: 0.5 },
      { name: "P2O5", weightPercentage: 0.91, error: 0.09 },
      { name: "SO3", weightPercentage: 7.61, error: 0.13 },
      { name: "Cl", weightPercentage: 0.88, error: 0.03 },
      { name: "K2O", weightPercentage: 0.49, error: 0.07 },
      { name: "CaO", weightPercentage: 6.17, error: 0.07 },
      { name: "TiO2", weightPercentage: 0.89, error: 0.08 },
      { name: "MnO", weightPercentage: 0.31, error: 0.02 },
      { name: "FeOT", weightPercentage: 16.5, error: 0.15 },
    ],
  },
  {
    name: "MER Meridiani Planum Dust",
    expressionValues: [
      { name: "Na2O", weightPercentage: 2.22, error: 0.19 },
      { name: "MgO", weightPercentage: 7.57, error: 0.08 },
      { name: "Al2O3", weightPercentage: 9.14, error: 0.09 },
      { name: "SiO2", weightPercentage: 45, error: 0.3 },
      { name: "P2O5", weightPercentage: 0.93, error: 0.09 },
      { name: "SO3", weightPercentage: 7.28, error: 0.07 },
      { name: "Cl", weightPercentage: 0.78, error: 0.01 },
      { name: "K2O", weightPercentage: 0.48, error: 0.06 },
      { name: "CaO", weightPercentage: 6.54, error: 0.04 },
      { name: "TiO2", weightPercentage: 1.01, error: 0.07 },
      { name: "MnO", weightPercentage: 0.34, error: 0.01 },
      { name: "FeOT", weightPercentage: 17.5, error: 0.04 },
    ],
  },
];

export class ExpressionReferences {
  static references: ExpressionReference[] = this._convertSimpleNamesToIDs(MARS_REFERENCES);

  private static _convertSimpleNamesToIDs(expressionReferences: ExpressionReference[]): ExpressionReference[] {
    return expressionReferences.map((expressionReference: ExpressionReference) => {
      const expandedExpressionValues: ExpressionValue[] = [];
      expressionReference.expressionValues.forEach((expressionValue: ExpressionValue) => {
        ["A", "B", "Combined"].forEach((detector: string) => {
          const name = `expr-elem-${expressionValue.name}-%(${detector})`;
          expandedExpressionValues.push({ ...expressionValue, name });
        });
      });
      return {
        ...expressionReference,
        expressionValues: expandedExpressionValues,
      };
    });
  }

  static getByName(name: string): ExpressionReference | null {
    const references = ExpressionReferences.references;
    const index = references.findIndex((reference: ExpressionReference) => reference.name === name);

    return index >= 0 ? references[index] : null;
  }

  static getExpressionValue(reference: ExpressionReference, expressionName: string): ExpressionValue | null {
    const expressionValues = reference.expressionValues;
    const index = expressionValues.findIndex((expressionValue: ExpressionValue) => expressionValue.name === expressionName);

    return index >= 0 ? expressionValues[index] : null;
  }

  static getCombinedExpressionValues(reference: ExpressionReference): ExpressionValue[] {
    const expressionValues = reference.expressionValues;
    const combinedExpressionValues: ExpressionValue[] = [];
    expressionValues.forEach((expressionValue: ExpressionValue) => {
      const noDetName = expressionValue.name.replace(/-%\([A-Za-z]+\)/, "");
      const combinedExpressionValue = combinedExpressionValues.find((combinedExpressionValue: ExpressionValue) => combinedExpressionValue.name === noDetName);
      if (!combinedExpressionValue) {
        combinedExpressionValues.push({ ...expressionValue, name: noDetName });
      }
    });

    return combinedExpressionValues;
  }
}
