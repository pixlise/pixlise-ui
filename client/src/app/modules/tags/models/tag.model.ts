export type TagType = "expression" | "dataset" | "expression-mix" | "roi" | "layer" | "scan";

export class BuiltInTags {
  // Special type reserved for built-in tags
  static readonly type = "builtin";

  static readonly exampleTag = "builtin-example";
}
