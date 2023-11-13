import { DataExpression } from "src/app/generated-protos/expressions";

export type ExpressionSearchFilter = {
  filteredExpressions: DataExpression[];

  scanId: string;
  quantId: string;

  searchString: string;
  tagIDs: string[];
  authors: string[];

  valueChanged?: boolean;
};
