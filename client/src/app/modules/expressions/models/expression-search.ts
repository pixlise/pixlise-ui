import { ExpressionGroup } from "src/app/generated-protos/expression-group";
import { DataExpression } from "src/app/generated-protos/expressions";

export type ExpressionSearchFilter = {
  filteredExpressions: (DataExpression | ExpressionGroup)[];

  scanId: string;
  quantId: string;

  expressionType: string;

  searchString: string;
  tagIDs: string[];
  authors: string[];

  valueChanged?: boolean;
};
