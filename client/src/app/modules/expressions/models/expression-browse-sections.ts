export class ExpressionBrowseSections {
  public static ALL = "All";
  public static MY_EXPRESSIONS = "My Expressions";
  public static MY_EXPRESSION_GROUPS = "My Expression Groups";
  public static RECENT = "Recent";
  public static FAVORITE = "Favorites";

  public static QUANTIFIED_ELEMENTS = "Quantified Elements";
  public static PSEUDO_INTENSITIES = "Pseudo-Intensities";

  public static ELEMENTS = "Elements";
  public static EXPRESSIONS = "Expressions";
  public static EXPRESSION_GROUPS = "Expression Groups";

  public static SECTIONS = [
    {
      name: ExpressionBrowseSections.ELEMENTS,
      subSections: [ExpressionBrowseSections.QUANTIFIED_ELEMENTS, ExpressionBrowseSections.PSEUDO_INTENSITIES],
    },
    {
      name: ExpressionBrowseSections.EXPRESSIONS,
      subSections: [
        ExpressionBrowseSections.ALL,
        ExpressionBrowseSections.MY_EXPRESSIONS,
        ExpressionBrowseSections.RECENT,
        // ExpressionBrowseSections.FAVORITE
      ],
    },
    {
      name: ExpressionBrowseSections.EXPRESSION_GROUPS,
      subSections: [
        ExpressionBrowseSections.ALL,
        ExpressionBrowseSections.MY_EXPRESSION_GROUPS,
        ExpressionBrowseSections.RECENT,
        // ExpressionBrowseSections.FAVORITE
      ],
    },
  ];
}
